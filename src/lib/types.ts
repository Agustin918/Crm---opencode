export const STAGES = [
  { id: 'lead_entrante', label: 'Lead entrante', color: '#6b7280' },
  { id: 'conversacion_iniciada', label: 'Conversación iniciada', color: '#3b82f6' },
  { id: 'llamada_realizada', label: 'Llamada realizada', color: '#8b5cf6' },
  { id: 'reunion_encuentro', label: 'Reunión / encuentro', color: '#f59e0b' },
  { id: 'presupuesto_enviado', label: 'Presupuesto enviado', color: '#06b6d4' },
  { id: 'cerrado_ganado', label: 'Cerrado ganado', color: '#10b981' },
  { id: 'cerrado_perdido', label: 'Cerrado perdido', color: '#ef4444' },
] as const;

export type LeadStage = typeof STAGES[number]['id'];
export type LeadTemperature = 'frio' | 'tibio' | 'caliente';

export interface LeadNote {
  stage: string;
  content: string;
  created_at: string;
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  facebook_form_data: Record<string, string>;
  ad_name: string;
  campaign_name: string;
  source: string;
  stage: LeadStage;
  temperature: LeadTemperature;
  notes: LeadNote[];
  next_action_text: string;
  next_action_date: string | null;
  discard_reason: string;
  revenue: number | null;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
  closed_at: string | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  from_stage: LeadStage | null;
  to_stage: LeadStage;
  note: string;
  created_at: string;
}
