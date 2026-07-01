'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { STAGES, type Lead, type LeadStage, type LeadTemperature } from '@/lib/types';
import { getSequencesForStage, getCompletedSteps, getTotalSteps, fillTemplate } from '@/lib/sequences';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Route, CheckCircle2, Circle, Clock, ChevronRight, MessageSquare, ExternalLink,
} from 'lucide-react';

const stageColors: Record<string, string> = {
  lead_entrante: '#6b7280',
  conversacion_iniciada: '#3b82f6',
  llamada_realizada: '#8b5cf6',
  reunion_encuentro: '#f59e0b',
  presupuesto_enviado: '#06b6d4',
  cerrado_ganado: '#10b981',
  cerrado_perdido: '#ef4444',
};

export default function SequenceManager({ onClose }: { onClose?: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<LeadStage | 'all'>('all');
  const [applying, setApplying] = useState<string | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);

  const fetchLeads = useCallback(async () => {
    const { data } = await getSupabase()
      .from('leads')
      .select('*')
      .not('stage', 'in', '("cerrado_ganado","cerrado_perdido")')
      .order('stage_changed_at', { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filteredLeads = selectedStage === 'all'
    ? leads
    : leads.filter(l => l.stage === selectedStage);

  const applyNextStep = async (lead: Lead) => {
    setApplying(lead.id);
    try {
      const { suggestNextActionDate, suggestNextActionText } = await import('@/lib/sequences');
      const date = suggestNextActionDate(lead);
      const text = suggestNextActionText(lead);
      if (!text && !date) return;

      await getSupabase().from('leads').update({
        next_action_text: text || '',
        next_action_date: date || null,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);

      fetchLeads();
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh] text-[#6b6b76] text-sm">
        Cargando secuencias...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter */}
      {/* Bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedStage('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedStage === 'all' ? 'bg-[#1e1e24] text-[#f0f0f2] ring-1 ring-[#2a2a30]' : 'bg-[#1a1a1e] text-[#6b6b76] hover:text-[#f0f0f2]'
            }`}
          >
            Todos ({leads.length})
          </button>
          {STAGES.filter(s => s.id !== 'cerrado_ganado' && s.id !== 'cerrado_perdido').map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStage(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedStage === s.id ? 'bg-[#1e1e24] ring-1' : 'bg-[#1a1a1e] text-[#6b6b76] hover:text-[#f0f0f2]'
              }`}
              style={selectedStage === s.id ? { color: stageColors[s.id], boxShadow: `0 0 0 1px ${stageColors[s.id]}` } : {}}
            >
              {s.label} ({leads.filter(l => l.stage === s.id).length})
            </button>
          ))}
        </div>
        <button
          onClick={async () => {
            setBulkApplying(true);
            const { suggestNextActionDate, suggestNextActionText } = await import('@/lib/sequences');
            for (const lead of filteredLeads) {
              const date = suggestNextActionDate(lead);
              const text = suggestNextActionText(lead);
              if (!text && !date) continue;
              await getSupabase().from('leads').update({
                next_action_text: text || '',
                next_action_date: date || null,
                updated_at: new Date().toISOString(),
              }).eq('id', lead.id);
            }
            fetchLeads();
            setBulkApplying(false);
          }}
          disabled={bulkApplying || filteredLeads.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e24] border border-[#2a2a30] rounded-lg text-xs text-[#d4a853] hover:bg-[#24242c] disabled:opacity-30 transition-colors shrink-0"
        >
          {bulkApplying ? 'Aplicando...' : `Aplicar a ${filteredLeads.length} leads`}
        </button>
      </div>

      {/* Sequence cards */}
      {filteredLeads.length === 0 ? (
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-8 text-center text-sm text-[#6b6b76]">
          No hay leads en esta etapa
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(lead => {
            const sequences = getSequencesForStage(lead.stage, lead.temperature);
            const completed = getCompletedSteps(lead);
            const total = getTotalSteps(lead);
            const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date();

            return (
              <div key={lead.id} className="bg-[#121214] border border-[#2a2a30] rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-[#2a2a30]/50">
                  <div>
                    <a href={`/leads/${lead.id}`} className="text-sm font-medium text-[#f0f0f2] hover:text-[#d4a853] transition-colors">
                      {lead.full_name}
                    </a>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${stageColors[lead.stage]}20`, color: stageColors[lead.stage] }}>
                        {STAGES.find(s => s.id === lead.stage)?.label}
                      </span>
                      <span className="text-[10px] capitalize text-[#6b6b76]">{lead.temperature}</span>
                      {lead.next_action_date && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-[#ef4444]' : 'text-[#6b6b76]'}`}>
                          <Clock size={9} />
                          {format(new Date(lead.next_action_date), "d MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-[#6b6b76]">
                      {completed.length}/{total.length} pasos
                    </div>
                    <button
                      onClick={() => applyNextStep(lead)}
                      disabled={applying === lead.id || total.length === 0 || completed.length >= total.length}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e1e24] border border-[#2a2a30] rounded-lg text-[10px] text-[#d4a853] hover:bg-[#24242c] disabled:opacity-30 transition-colors"
                    >
                      {applying === lead.id ? '...' : 'Auto'}
                      <ChevronRight size={10} />
                    </button>
                  </div>
                </div>

                {/* Steps */}
                {sequences.length > 0 && (
                  <div className="px-4 py-2.5 space-y-2">
                    {sequences[0].steps.map((step, i) => {
                      const isDone = i < completed.length;
                      const isNext = i === completed.length;
                      return (
                        <div key={i} className={`flex items-start gap-2.5 ${isDone ? 'opacity-40' : ''}`}>
                          {isDone ? (
                            <CheckCircle2 size={14} className="mt-0.5 text-[#10b981] shrink-0" />
                          ) : isNext ? (
                            <Circle size={14} className="mt-0.5 text-[#d4a853] shrink-0" />
                          ) : (
                            <Circle size={14} className="mt-0.5 text-[#2a2a30] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className={`text-xs ${isNext ? 'text-[#f0f0f2]' : 'text-[#6b6b76]'}`}>
                              Día {step.day} — {step.label}
                            </div>
                            <div className="text-[10px] text-[#6b6b76] mt-0.5">{step.cta}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 py-2 bg-[#1a1a1e] border-t border-[#2a2a30]/50 flex gap-2">
                  <a href={`https://wa.me/${lead.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#22c55e] hover:underline">
                    <MessageSquare size={10} />
                    WhatsApp
                    <ExternalLink size={8} />
                  </a>
                  <a href={`/leads/${lead.id}`} className="text-[10px] text-[#3b82f6] hover:underline ml-auto">
                    Ver ficha →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
