'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { STAGES, type Lead, type LeadActivity, type LeadStage, type LeadTemperature } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft, Phone, MessageSquare, Calendar, Target, TrendingUp,
  Plus, Send, X, ExternalLink, Clock, Save, Sparkles, CheckCircle2, Circle,
} from 'lucide-react';
import AIMessageModal from './AIMessageModal';
import { suggestNextActionDate, suggestNextActionText, getSequencesForStage, getCompletedSteps, getTotalSteps } from '@/lib/sequences';

interface Props {
  id: string;
}

const stageColors: Record<string, string> = {
  lead_entrante: '#6b7280',
  conversacion_iniciada: '#3b82f6',
  llamada_realizada: '#8b5cf6',
  reunion_encuentro: '#f59e0b',
  presupuesto_enviado: '#06b6d4',
  cerrado_ganado: '#10b981',
  cerrado_perdido: '#ef4444',
};

const tempColors: Record<string, string> = {
  caliente: '#10b981',
  tibio: '#f59e0b',
  frio: '#6b7280',
};

export default function LeadDetail({ id }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [nextActionText, setNextActionText] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [selectedStage, setSelectedStage] = useState<LeadStage | ''>('');
  const [revenue, setRevenue] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const fetchLead = useCallback(async () => {
    const { data } = await getSupabase().from('leads').select('*').eq('id', id).single();
    if (data) {
      setLead(data);
      setSelectedStage(data.stage);
      setNextActionText(data.next_action_text || '');
      setNextActionDate(data.next_action_date || '');
      setRevenue(data.revenue ? String(data.revenue) : '');
    }
  }, [id]);

  const fetchActivity = useCallback(async () => {
    const { data } = await getSupabase()
      .from('lead_activity_log')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });
    if (data) setActivities(data);
  }, [id]);

  useEffect(() => { fetchLead(); fetchActivity(); }, [fetchLead, fetchActivity]);

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#6b6b76]">
        Cargando...
      </div>
    );
  }

  const handleStageChange = async (newStage: LeadStage) => {
    const now = new Date().toISOString();
    const update: Partial<Lead> = {
      stage: newStage,
      stage_changed_at: now,
      updated_at: now,
    };
    if (newStage === 'cerrado_ganado' || newStage === 'cerrado_perdido') {
      update.closed_at = now;
    }
    if (lead.stage === 'cerrado_ganado' && newStage !== 'cerrado_ganado') {
      update.revenue = null;
    }
    if (newStage !== 'cerrado_ganado' && newStage !== 'cerrado_perdido') {
      const tempLead: Lead = { ...lead, stage: newStage, stage_changed_at: now };
      const nextDate = suggestNextActionDate(tempLead);
      const nextText = suggestNextActionText(tempLead);
      if (nextText) update.next_action_text = nextText;
      if (nextDate) update.next_action_date = nextDate;
    }
    await getSupabase().from('leads').update(update).eq('id', id);
    await getSupabase().from('lead_activity_log').insert({
      lead_id: id,
      from_stage: lead.stage,
      to_stage: newStage,
    });
    setSelectedStage(newStage);
    fetchLead();
    fetchActivity();
  };

  const handleTemperatureChange = async (temp: LeadTemperature) => {
    await getSupabase().from('leads').update({ temperature: temp, updated_at: new Date().toISOString() }).eq('id', id);
    fetchLead();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const notes = [...(lead.notes || []), {
      stage: lead.stage,
      content: newNote.trim(),
      created_at: new Date().toISOString(),
    }];
    await getSupabase().from('leads').update({ notes, updated_at: new Date().toISOString() }).eq('id', id);
    setNewNote('');
    fetchLead();
  };

  const handleSaveNextAction = async () => {
    await getSupabase().from('leads').update({
      next_action_text: nextActionText,
      next_action_date: nextActionDate || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
  };

  const handleSaveRevenue = async () => {
    const val = revenue ? parseFloat(revenue.replace(/[^0-9.]/g, '')) : null;
    await getSupabase().from('leads').update({
      revenue: val,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
  };

  const handleDiscard = async () => {
    const reason = prompt('Motivo de descarte:');
    if (!reason) return;
    await getSupabase().from('leads').update({
      stage: 'cerrado_perdido',
      discard_reason: reason,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    fetchLead();
  };

  const fbData = lead.facebook_form_data || {};
  const stageLabel = (s: string) => STAGES.find((st) => st.id === s)?.label || s;

  const fbPhone = fbData?.phone_number || fbData?.phone || '';
  const displayPhone = lead.phone || fbPhone;

  const knownFields: Record<string, { label: string; formatter?: (v: string) => string }> = {
    terreno: { label: 'Terreno' },
    superficie: { label: 'Superficie' },
    superficie_m2: { label: 'Superficie (m²)' },
    inversion: { label: 'Inversión' },
    presupuesto: { label: 'Presupuesto' },
    plazo: { label: 'Plazo' },
    objetivo: { label: 'Objetivo' },
    descripcion: { label: 'Descripción' },
    consulta: { label: 'Consulta' },
    mensaje: { label: 'Mensaje' },
  };

  const parsedFields: { label: string; value: string }[] = [];
  const extraFields: [string, string][] = [];

  if (fbData && typeof fbData === 'object') {
    for (const [key, val] of Object.entries(fbData)) {
      const strVal = String(val || '');
      if (!strVal) continue;
      const known = knownFields[key];
      if (known) {
        parsedFields.push({ label: known.label, value: strVal });
      } else if (!['full_name', 'email', 'phone_number', 'phone'].includes(key)) {
        extraFields.push([key, strVal]);
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[#6b6b76] hover:text-[#f0f0f2] transition-colors"
      >
        <ArrowLeft size={15} />
        Volver
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#f0f0f2]">{lead.full_name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {displayPhone && (
              <a
                href={`https://wa.me/${displayPhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-[#3b82f6] hover:underline"
              >
                <Phone size={13} />
                {displayPhone}
                <ExternalLink size={11} />
              </a>
            )}
            {lead.email && (
              <span className="text-sm text-[#a1a1aa]">{lead.email}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['caliente', 'tibio', 'frio'] as LeadTemperature[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTemperatureChange(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  lead.temperature === t
                    ? 'bg-[#1e1e24] ring-1 ring-[#2a2a30]'
                    : 'text-[#6b6b76] hover:text-[#f0f0f2]'
                }`}
                style={lead.temperature === t ? { color: tempColors[t] } : {}}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Stages & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage selector */}
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-3">Etapa actual</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStageChange(s.id)}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedStage === s.id
                      ? 'bg-[#1e1e24] ring-1'
                      : 'bg-[#1a1a1e] hover:bg-[#1e1e24] text-[#6b6b76]'
                  }`}
                  style={selectedStage === s.id ? { boxShadow: `0 0 0 1px ${stageColors[s.id]}`, color: stageColors[s.id] } : {}}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: stageColors[s.id] }} />
                    {s.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Información del lead */}
          {(parsedFields.length > 0 || extraFields.length > 0) && (
            <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-3">Información del lead</h3>
              <div className="space-y-2">
                {parsedFields.map((f) => (
                  <div key={f.label} className="flex justify-between text-sm py-1.5 border-b border-[#2a2a30]/50 last:border-0">
                    <span className="text-[#6b6b76]">{f.label}</span>
                    <span className="text-[#f0f0f2] text-right ml-4 max-w-[65%] capitalize">{f.value.replace(/_/g, ' ')}</span>
                  </div>
                ))}
                {extraFields.length > 0 && (
                  <>
                    <div className="text-[10px] text-[#6b6b76] uppercase tracking-wider pt-2">Otros datos</div>
                    {extraFields.map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm py-1 border-b border-[#2a2a30]/50 last:border-0">
                        <span className="text-[#6b6b76] capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-[#f0f0f2] text-right ml-4 max-w-[60%]">{val}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-3">Notas</h3>
            <div className="flex gap-2 mb-3">
              <input
                placeholder="Agregar nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                className="flex-1 bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
              />
              <button
                onClick={handleAddNote}
                className="px-3 py-2 bg-[#d4a853] text-black rounded-lg text-sm font-medium hover:bg-[#c49a3a] transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lead.notes && lead.notes.length > 0 ? (
                [...lead.notes].reverse().map((n, i) => (
                  <div key={i} className="bg-[#1a1a1e] rounded-lg p-3">
                    <div className="flex items-center gap-2 text-[10px] text-[#6b6b76] mb-1">
                      <span>{stageLabel(n.stage)}</span>
                      <span>·</span>
                      <span>{format(new Date(n.created_at), 'dd MMM HH:mm', { locale: es })}</span>
                    </div>
                    <p className="text-sm text-[#a1a1aa]">{n.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#6b6b76] text-center py-4">Sin notas aún</p>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-3">Historial de movimientos</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activities.length > 0 ? (
                activities.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm py-2 border-b border-[#2a2a30]/50 last:border-0">
                    <div className="flex items-center gap-1.5 text-[#a1a1aa]">
                      <span className="text-[#6b6b76]">{a.from_stage ? stageLabel(a.from_stage) : '—'}</span>
                      <span className="text-[#3b82f6]">→</span>
                      <span style={{ color: stageColors[a.to_stage] }}>{stageLabel(a.to_stage)}</span>
                    </div>
                    <span className="text-[10px] text-[#6b6b76] ml-auto">
                      {format(new Date(a.created_at), 'dd MMM HH:mm', { locale: es })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#6b6b76] text-center py-4">Sin movimientos aún</p>
              )}
            </div>
          </div>
        </div>

        {/* Right - Info Sidebar */}
        <div className="space-y-4">
          {/* Source */}
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-2">Fuente</h3>
            <p className="text-sm text-[#f0f0f2]">{lead.source}</p>
            {lead.campaign_name && (
              <p className="text-xs text-[#6b6b76] mt-1">{lead.campaign_name}</p>
            )}
            {lead.ad_name && (
              <p className="text-xs text-[#6b6b76]">{lead.ad_name}</p>
            )}
          </div>

          {/* Created */}
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-2">Creado</h3>
            <p className="text-sm text-[#f0f0f2]">
              {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy HH:mm", { locale: es })}
            </p>
          </div>

          {/* Next Action */}
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-3">Próxima acción</h3>
            <input
              placeholder="¿Qué sigue?"
              value={nextActionText}
              onChange={(e) => setNextActionText(e.target.value)}
              className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors mb-2"
            />
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] outline-none focus:border-[#d4a853]/50 transition-colors mb-2"
            />
            <button
              onClick={handleSaveNextAction}
              className="w-full px-3 py-2 bg-[#1e1e24] border border-[#2a2a30] text-[#f0f0f2] rounded-lg text-sm hover:bg-[#24242c] transition-colors flex items-center justify-center gap-1"
            >
              <Save size={14} />
              Guardar
            </button>
          </div>

          {/* Secuencia de seguimiento */}
          {lead.stage !== 'cerrado_ganado' && lead.stage !== 'cerrado_perdido' && (() => {
            const allSteps = getTotalSteps(lead);
            const done = getCompletedSteps(lead).length;
            return (
            <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-3">Secuencia de seguimiento</h3>
              <div className="space-y-2">
                {allSteps.length > 0 ? (
                  allSteps.map((step, i) => {
                    const isDone = i < done;
                    const isNext = i === done;
                    return (
                      <div key={i} className={`flex items-start gap-2 ${isDone ? 'opacity-40' : ''}`}>
                        {isDone ? (
                          <CheckCircle2 size={12} className="mt-0.5 text-[#10b981] shrink-0" />
                        ) : isNext ? (
                          <Circle size={12} className="mt-0.5 text-[#d4a853] shrink-0" />
                        ) : (
                          <Circle size={12} className="mt-0.5 text-[#2a2a30] shrink-0" />
                        )}
                        <div className="text-[11px]">
                          <span className={isNext ? 'text-[#f0f0f2]' : 'text-[#6b6b76]'}>
                            Día {step.day} — {step.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#6b6b76] text-center py-2">Sin secuencia definida</p>
                )}
              </div>
            </div>
            );
          })()}

          {/* Revenue (solo cerrado_ganado) */}
          {lead.stage === 'cerrado_ganado' && (
            <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-wider text-[#6b6b76] font-medium mb-3">Revenue cerrado</h3>
              <input
                placeholder="Monto en USD"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors mb-2"
              />
              <button
                onClick={handleSaveRevenue}
                className="w-full px-3 py-2 bg-[#1e1e24] border border-[#2a2a30] text-[#f0f0f2] rounded-lg text-sm hover:bg-[#24242c] transition-colors flex items-center justify-center gap-1"
              >
                <Save size={14} />
                Guardar revenue
              </button>
            </div>
          )}

          {/* IA - Sugerir mensaje */}
          <button
            onClick={() => setShowAIModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#1e1e24] border border-[#d4a853]/30 rounded-xl p-4 text-sm text-[#d4a853] hover:bg-[#24242c] transition-colors"
          >
            <Sparkles size={16} />
            Sugerir mensaje con IA
          </button>

          {/* WhatsApp */}
          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#1e1e24] border border-[#2a2a30] rounded-xl p-4 text-sm text-[#f0f0f2] hover:bg-[#24242c] transition-colors"
            >
              <MessageSquare size={16} className="text-[#22c55e]" />
              Abrir WhatsApp
              <ExternalLink size={13} className="text-[#6b6b76]" />
            </a>
          )}

          {/* Discard */}
          {lead.stage !== 'cerrado_perdido' && lead.stage !== 'cerrado_ganado' && (
            <button
              onClick={handleDiscard}
              className="w-full px-3 py-2 border border-[#ef4444]/30 text-[#ef4444] rounded-xl text-sm hover:bg-[#ef4444]/5 transition-colors"
            >
              Descartar lead
            </button>
          )}
        </div>
      </div>

      {showAIModal && (
        <AIMessageModal
          leadId={lead.id}
          leadName={lead.full_name}
          leadPhone={lead.phone || ''}
          stage={lead.stage}
          notes={lead.notes?.map(n => n.content).join('\n')}
          description={(lead.facebook_form_data as Record<string, string>)?.['describinos_brevemente_cuál_es_tu_objetivo_principal_de_este_proyecto:'] || ''}
          campaign_name={lead.campaign_name}
          ad_name={lead.ad_name}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </div>
  );
}
