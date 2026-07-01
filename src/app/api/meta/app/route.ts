import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

export async function GET() {
  try {
    const sb = getServiceClient();
    const [idRes, secretRes] = await Promise.all([
      sb.from('settings').select('value').eq('key', 'meta_app_id').single(),
      sb.from('settings').select('value').eq('key', 'meta_app_secret').single(),
    ]);
    return NextResponse.json({
      app_id: idRes.data?.value || '',
      app_secret: secretRes.data?.value || '',
    });
  } catch {
    return NextResponse.json({ app_id: '', app_secret: '' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { app_id, app_secret } = await request.json();
    const sb = getServiceClient();
    const now = new Date().toISOString();

    await Promise.all([
      sb.from('settings').upsert({ key: 'meta_app_id', value: app_id || '', updated_at: now }, { onConflict: 'key' }),
      sb.from('settings').upsert({ key: 'meta_app_secret', value: app_secret || '', updated_at: now }, { onConflict: 'key' }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al guardar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
