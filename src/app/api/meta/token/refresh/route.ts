import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

const META_TOKEN_URL = 'https://graph.facebook.com/v22.0/oauth/access_token';

async function getSetting(key: string): Promise<string | null> {
  try {
    const { data } = await getServiceClient().from('settings').select('value').eq('key', key).single();
    return data?.value || null;
  } catch {
    return null;
  }
}

async function setSetting(key: string, value: string) {
  await getServiceClient().from('settings').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { app_id, app_secret } = body;

    const currentToken = await getSetting('meta_access_token');
    if (!currentToken) {
      return NextResponse.json({ error: 'No hay token guardado. Guardá uno primero.' }, { status: 400 });
    }

    const clientId = app_id || await getSetting('meta_app_id');
    const clientSecret = app_secret || await getSetting('meta_app_secret');

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Se necesita META_APP_ID y META_APP_SECRET para refrescar el token. Configuralos abajo.' }, { status: 400 });
    }

    const url = `${META_TOKEN_URL}?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${currentToken}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: `Meta API: ${data.error.message}` }, { status: 400 });
    }

    const newToken = data.access_token;
    const expiresIn = data.expires_in || 0;

    await setSetting('meta_access_token', newToken);

    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    return NextResponse.json({
      ok: true,
      expires_in: expiresIn,
      expires_at: expiresAt,
      message: expiresIn >= 5184000
        ? `Token renovado exitosamente. Válido por ${Math.round(expiresIn / 86400)} días.`
        : `Token renovado. Válido por ${Math.round(expiresIn / 3600)} horas. Para obtener un token de 60 días, usá un token de usuario de Graph API Explorer con permisos ads_read.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al refrescar token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [appId, appSecret, tokenUpdatedAt] = await Promise.all([
      getSetting('meta_app_id'),
      getSetting('meta_app_secret'),
      getSetting('meta_access_token').then(async () => {
        const { data } = await getServiceClient().from('settings').select('updated_at').eq('key', 'meta_access_token').single();
        return data?.updated_at || null;
      }),
    ]);

    return NextResponse.json({
      has_app_credentials: !!(appId && appSecret),
      app_id_configured: !!appId,
      app_secret_configured: !!appSecret,
      token_updated_at: tokenUpdatedAt,
    });
  } catch {
    return NextResponse.json({ has_app_credentials: false });
  }
}
