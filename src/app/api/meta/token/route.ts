import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  return createClient(url, key);
}

export async function GET() {
  try {
    const { data } = await getServiceClient().from('settings').select('value').eq('key', 'meta_access_token').single();
    return NextResponse.json({ token: data?.value || '' });
  } catch {
    return NextResponse.json({ token: '' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const { error } = await getServiceClient().from('settings').upsert(
      { key: 'meta_access_token', value: token, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al guardar token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
