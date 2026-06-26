import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }
    const supabase = createBrowserClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { full_name, phone, email, ad_name, campaign_name, temperature, facebook_form_data } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase.from('leads').insert({
      full_name: full_name.trim(),
      phone: phone || '',
      email: email || '',
      ad_name: ad_name || '',
      campaign_name: campaign_name || '',
      temperature: temperature || 'tibio',
      facebook_form_data: facebook_form_data || {},
      source: 'meta_ads',
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error en el cuerpo de la solicitud' }, { status: 400 });
  }
}
