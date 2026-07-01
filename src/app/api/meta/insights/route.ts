import { NextRequest, NextResponse } from 'next/server';
import { fetchCampaignInsights, fetchAllAccounts } from '@/lib/meta-ads';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

async function getToken(): Promise<string | undefined> {
  if (process.env.NEXT_PUBLIC_META_ACCESS_TOKEN) return undefined;
  try {
    const { data } = await getServiceClient().from('settings').select('value').eq('key', 'meta_access_token').single();
    return data?.value || undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account');
    const datePreset = (searchParams.get('date_preset') as 'last_30d' | 'this_month' | 'last_month') || 'last_30d';
    const token = await getToken();

    const results = accountId
      ? [await fetchCampaignInsights(accountId, datePreset, token)]
      : await fetchAllAccounts(datePreset, token);

    return NextResponse.json({ accounts: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching Meta Ads insights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
