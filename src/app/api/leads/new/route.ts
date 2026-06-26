import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from "@supabase/ssr";

const STANDARD_FIELDS = new Set(['full_name', 'phone', 'phone_number', 'email', 'ad_name', 'campaign_name', 'temperature', 'source', 'facebook_form_data']);

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }
    const supabase = createBrowserClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const full_name = body.full_name || '';
    const phone = body.phone || body.phone_number || '';
    const email = body.email || '';
    const ad_name = body.ad_name || '';
    const campaign_name = body.campaign_name || '';
    const temperature = body.temperature || 'tibio';

    if (!full_name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const facebook_form_data: Record<string, string> = {};
    for (const [key, val] of Object.entries(body)) {
      if (STANDARD_FIELDS.has(key)) continue;
      if (key === 'phone_number') continue;
      facebook_form_data[key] = String(val);
    }

    const { data, error } = await supabase.from('leads').insert({
      full_name: full_name.trim(),
      phone,
      email,
      ad_name,
      campaign_name,
      temperature,
      facebook_form_data: body.facebook_form_data || facebook_form_data,
      source: body.source || 'meta_ads',
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error en el cuerpo de la solicitud' }, { status: 400 });
  }
}
