const META_API = 'https://graph.facebook.com/v22.0';
const AD_ACCOUNTS = [
  { id: 'act_773909325186389', name: 'A7 Arquitectura' },
  { id: 'act_3003360063165090', name: 'Asiete Arq' },
];

export interface CampaignInsight {
  campaign_name: string;
  campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface PaidInsightsSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  accountName: string;
  campaigns: CampaignInsight[];
}

function getToken(override?: string): string {
  const token = override || process.env.NEXT_PUBLIC_META_ACCESS_TOKEN;
  if (!token) throw new Error('Token de Meta Ads no configurado');
  return token;
}

export async function fetchCampaignInsights(accountId: string, datePreset: 'last_30d' | 'this_month' | 'last_month' = 'last_30d', overrideToken?: string): Promise<PaidInsightsSummary> {
  const token = getToken(overrideToken);
  const accountName = AD_ACCOUNTS.find(a => a.id === accountId)?.name || accountId;

  const fields = ['campaign_name', 'campaign_id', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm'];
  const url = `${META_API}/${accountId}/insights`
    + `?level=campaign`
    + `&fields=${fields.join(',')},actions{action_type,value}`
    + `&date_preset=${datePreset}`
    + `&access_token=${token}`;

  const res = await fetch(url);
  const body = await res.json();

  if (body.error) {
    throw new Error(`Meta API error: ${body.error.message}`);
  }

  const campaigns: CampaignInsight[] = (body.data || []).map((c: any) => {
    const leadAction = (c.actions || []).find(
      (a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped_credit'
    );
    return {
      campaign_name: c.campaign_name || 'Sin nombre',
      campaign_id: c.campaign_id || '',
      spend: parseFloat(c.spend) || 0,
      impressions: parseInt(c.impressions) || 0,
      clicks: parseInt(c.clicks) || 0,
      leads: parseInt(leadAction?.value) || 0,
      ctr: parseFloat(c.ctr) || 0,
      cpc: parseFloat(c.cpc) || 0,
      cpm: parseFloat(c.cpm) || 0,
    };
  });

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

  return {
    totalSpend,
    totalImpressions,
    totalClicks,
    totalLeads,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    cpa: totalLeads > 0 ? totalSpend / totalLeads : 0,
    accountName,
    campaigns,
  };
}

export async function fetchAllAccounts(datePreset: 'last_30d' | 'this_month' | 'last_month' = 'last_30d', overrideToken?: string): Promise<PaidInsightsSummary[]> {
  const results = await Promise.allSettled(
    AD_ACCOUNTS.map(a => fetchCampaignInsights(a.id, datePreset, overrideToken))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<PaidInsightsSummary> => r.status === 'fulfilled')
    .map(r => r.value);
}
