import type { Lead } from './types';

const M2_KEY = '¿qué_tamaño_aproximado_de_construcción_tenés_en_mente?';
const INVEST_KEY = '¿cuál_es_el_rango_de_inversión_total_que_estimas_para_tu_obra?';
const TIMELINE_KEY = '¿en_qué_plazo_tenes_previsto_iniciar_la_construcción?';
const DESC_KEY = 'describinos_brevemente_cuál_es_tu_objetivo_principal_de_este_proyecto:';

function getField(lead: Lead, key: string): string {
  return (lead.facebook_form_data as Record<string, string>)?.[key] || '';
}

function extractM2FromText(text: string): number | null {
  const patterns = [
    /(\d+)\s*[-–/a]\s*(\d+)\s*m²?/i,
    /(\d+)\s*m²?/i,
    /(\d+)\s*metros/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      if (m[2]) return (parseInt(m[1]) + parseInt(m[2])) / 2;
      return parseInt(m[1]);
    }
  }
  return null;
}

export function parseSquareMeters(lead: Lead): number | null {
  const val = getField(lead, M2_KEY);
  if (!val) return extractM2FromText(getField(lead, DESC_KEY));

  if (val.includes('menos_de_150')) return 75;
  if (val.includes('entre_150_y_300')) return 225;
  if (val.includes('más_de_300')) return 375;
  if (val.includes('más_de_250')) return 375;

  const fromText = extractM2FromText(getField(lead, DESC_KEY));
  if (fromText) return fromText;

  const num = parseInt(val.replace(/\D/g, ''));
  return isNaN(num) ? null : num;
}

export function calculateHonorario(m2: number): number {
  return Math.round(m2 * 1400 * 0.04);
}

export function parseInvestment(lead: Lead): number | null {
  const val = getField(lead, INVEST_KEY);
  if (!val) return null;
  if (val.includes('menos_de_150k')) return 100000;
  if (val.includes('150k_-_250k')) return 200000;
  if (val.includes('más_de_250k') || val.includes('mas_de_250k')) return 325000;
  return null;
}

export function parseTimeline(lead: Lead): string | null {
  const val = getField(lead, TIMELINE_KEY);
  if (!val) return null;
  if (val.includes('inmediato')) return 'Inmediato (< 3 meses)';
  if (val.includes('3_a_6') || val.includes('3 a 6')) return '3 a 6 meses';
  if (val.includes('6_a_12') || val.includes('6 a 12')) return '6 a 12 meses';
  if (val.includes('más_de_12') || val.includes('mas_de_12')) return 'Más de 12 meses';
  return val.replace(/_/g, ' ');
}

export function getLeadHonorario(lead: Lead): number {
  const m2 = parseSquareMeters(lead);
  return m2 ? calculateHonorario(m2) : 0;
}

export interface AdStats {
  adName: string;
  leads: number;
  campaign: string;
}

export function getAdStats(leads: Lead[]): AdStats[] {
  const map = new Map<string, { leads: number; campaign: string }>();
  for (const l of leads) {
    const key = l.ad_name || 'Sin anuncio';
    const existing = map.get(key) || { leads: 0, campaign: l.campaign_name || '' };
    existing.leads++;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([adName, v]) => ({ adName, ...v }))
    .sort((a, b) => b.leads - a.leads);
}

export function getConversionRates(leads: Lead[]): { from: string; to: string; rate: number }[] {
  const stageOrder = [
    'lead_entrante', 'conversacion_iniciada', 'llamada_realizada',
    'reunion_encuentro', 'presupuesto_enviado', 'cerrado_ganado',
  ];
  const rates: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < stageOrder.length - 1; i++) {
    const from = stageOrder[i];
    const to = stageOrder[i + 1];
    const inFrom = leads.filter(l => l.stage === from).length;
    const inTo = leads.filter(l => l.stage === to).length;
    const progressed = leads.filter(l => {
      const idx = stageOrder.indexOf(l.stage);
      return idx > i;
    }).length;
    const rate = inFrom > 0 ? Math.round((progressed / (inFrom + progressed)) * 100) : 0;
    rates.push({ from, to, rate });
  }
  return rates;
}

export function getTimelineDistribution(leads: Lead[]): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const l of leads) {
    const t = parseTimeline(l);
    if (t) counts[t] = (counts[t] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function getNewLeadsComparison(leads: Lead[]): { thisWeek: number; lastWeek: number; change: number } {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = leads.filter(l => now - new Date(l.created_at).getTime() < week).length;
  const lastWeek = leads.filter(l => {
    const t = now - new Date(l.created_at).getTime();
    return t >= week && t < week * 2;
  }).length;
  return { thisWeek, lastWeek, change: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0 };
}

export function getStaleLeads(leads: Lead[]): Lead[] {
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return leads.filter(l => {
    if (l.stage === 'cerrado_ganado' || l.stage === 'cerrado_perdido') return false;
    if (l.stage !== 'lead_entrante') return false;
    return Date.now() - new Date(l.created_at).getTime() > threeDays;
  });
}
