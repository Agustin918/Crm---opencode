import { createClient } from '@supabase/supabase-js';

const TOKEN = 'EAAYSAukaKxoBR0pF2wgMsNKDPUVpzEXIT332Wm6JqPsnEIaQVkvgolaZCjlf9JJtiZBXD0tlWaf204iYrLr4Y2eL5SWKvcLbD0aKUUKfL4bkasX4LVhg9412dJcWVISyck76Uq37hfYKPeNYcal8VZAloH3iHTx3caovrKWraVIb6A15xXnx2LGpYAzfYfNE9DexulZCpWTT1iPz4hLSZAAony2EDb1n6yyaueaC0AZCRIBymXOiSavZBV2VhZBQPxdz6g6RENGSLnP0Qva8M4pMAlyTKwd5tbNsw0TbOQZDZD';
const API = 'https://graph.facebook.com/v21.0';

const supabase = createClient(
  'https://lajgymzabpvmavogckns.supabase.co',
  'sb_publishable_B32TZ8XeIcnzk0gJNrrGoQ_G2fcnjk4'
);

async function fb(path) {
  const res = await fetch(`${API}${path}&access_token=${TOKEN}`);
  return res.json();
}

async function getCampaigns(act) {
  const data = await fb(`/${act}/campaigns?fields=id,name&limit=100`);
  return data.data || [];
}

async function getAds(campaignId) {
  const data = await fb(`/${campaignId}/ads?fields=id,name&limit=100`);
  return data.data || [];
}

async function getLeads(adId) {
  const data = await fb(`/${adId}/leads?fields=id,created_time,field_data,ad_name,form_id&limit=100`);
  return data.data || [];
}

function extractLeadFromFields(fieldData) {
  const map = {};
  for (const f of fieldData) {
    map[f.name] = f.values?.[0] || '';
  }
  return {
    full_name: map.full_name || map.fullName || '',
    phone: map.phone_number || map.phone || '',
    email: map.email || '',
    facebook_form_data: map,
  };
}

function getCampaignName(campaignId, campaigns) {
  const c = campaigns.find(c => c.id === campaignId);
  return c ? c.name : '';
}

const allLeads = [];
const seenIds = new Set();

for (const act of ['act_773909325186389', 'act_3003360063165090']) {
  console.log(`\n=== ${act} ===`);
  const campaigns = await getCampaigns(act);

  for (const campaign of campaigns) {
    console.log(`  Campaña: ${campaign.name} (${campaign.id})`);
    const ads = await getAds(campaign.id);

    for (const ad of ads) {
      const leads = await getLeads(ad.id);
      if (leads.length === 0) continue;

      console.log(`    → Anuncio "${ad.name}": ${leads.length} leads`);
      for (const lead of leads) {
        if (seenIds.has(lead.id)) continue;
        seenIds.add(lead.id);

        const { full_name, phone, email, facebook_form_data } = extractLeadFromFields(lead.field_data || []);

        allLeads.push({
          full_name,
          phone,
          email,
          ad_name: lead.ad_name || ad.name,
          campaign_name: campaign.name,
          facebook_form_data,
          source: 'meta_ads',
          created_at: lead.created_time || new Date().toISOString(),
        });
      }
    }
  }
}

console.log(`\nTotal leads encontrados: ${allLeads.length}`);

// Insert in batches
const BATCH_SIZE = 20;
let inserted = 0;
for (let i = 0; i < allLeads.length; i += BATCH_SIZE) {
  const batch = allLeads.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from('leads').insert(batch);
  if (error) {
    console.error(`Error batch ${i}:`, error.message);
  } else {
    inserted += batch.length;
    console.log(`Insertados ${inserted}/${allLeads.length}...`);
  }
}

console.log(`\n✅ Migración completa: ${inserted} leads insertados en Supabase`);
