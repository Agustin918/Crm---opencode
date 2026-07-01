'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { STAGES, type Lead } from '@/lib/types';
import { format, isPast, isToday, isTomorrow, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, ArrowRight, Phone, MessageSquare, ExternalLink, X,
} from 'lucide-react';

function groupByDate(leads: Lead[]): Map<string, Lead[]> {
  const groups = new Map<string, Lead[]>();
  for (const l of leads) {
    if (!l.next_action_date) continue;
    groups.set(l.next_action_date, [...(groups.get(l.next_action_date) || []), l]);
  }
  return groups;
}

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  return format(d, "EEEE d 'de' MMM", { locale: es });
}

function dayColor(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isPast(d) && !isToday(d)) return '#ef4444';
  if (isToday(d)) return '#f59e0b';
  return '#3b82f6';
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

export default function FollowUpCalendar() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(false);

  const fetchLeads = useCallback(async () => {
    const { data } = await getSupabase()
      .from('leads')
      .select('*')
      .not('next_action_date', 'is', null)
      .order('next_action_date', { ascending: true });
    if (data) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const activeLeads = leads.filter(l => l.stage !== 'cerrado_perdido' && l.stage !== 'cerrado_ganado');
  const grouped = groupByDate(activeLeads);
  const sortedDates = Array.from(grouped.keys()).sort();

  const overdue: Lead[] = [];
  const upcoming: Lead[] = [];
  const now = new Date();

  for (const l of activeLeads) {
    if (!l.next_action_date) continue;
    const d = parseISO(l.next_action_date);
    if (isPast(d) && !isToday(d)) overdue.push(l);
    else upcoming.push(l);
  }

  const stageLabel = (s: string) => STAGES.find(st => st.id === s)?.label || s;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-[#6b6b76] text-sm">
        Cargando seguimientos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-[#6b6b76] uppercase tracking-wider mb-1">
            <AlertTriangle size={12} className="text-[#ef4444]" />
            Vencidas
          </div>
          <div className="text-2xl font-semibold text-[#ef4444]">{overdue.length}</div>
        </div>
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-[#6b6b76] uppercase tracking-wider mb-1">
            <Calendar size={12} className="text-[#f59e0b]" />
            Hoy
          </div>
          <div className="text-2xl font-semibold text-[#f59e0b]">
            {activeLeads.filter(l => l.next_action_date && isToday(parseISO(l.next_action_date))).length}
          </div>
        </div>
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-[#6b6b76] uppercase tracking-wider mb-1">
            <Clock size={12} className="text-[#3b82f6]" />
            Próximas
          </div>
          <div className="text-2xl font-semibold text-[#3b82f6]">{upcoming.length}</div>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#ef4444] uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={14} />
            Vencidas · {overdue.length}
          </h3>
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a1a1e] border-b border-[#2a2a30]">
                    <th className="text-left px-4 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Lead</th>
                    <th className="text-left px-4 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Acción</th>
                    <th className="text-left px-4 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Vencía</th>
                    <th className="text-left px-4 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Etapa</th>
                    <th className="text-right px-4 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map(l => {
                    const days = Math.floor((now.getTime() - parseISO(l.next_action_date!).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={l.id} className="border-b border-[#2a2a30]/50 last:border-0 hover:bg-[#1a1a1e] transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/leads/${l.id}`} className="text-[#f0f0f2] font-medium hover:text-[#d4a853] transition-colors">
                            {l.full_name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#a1a1aa] hidden sm:table-cell truncate max-w-[200px]">
                          {l.next_action_text || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#ef4444]">
                          {format(parseISO(l.next_action_date!), "d MMM", { locale: es })}
                          <span className="text-[#6b6b76] ml-1">(-{days}d)</span>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${stageColors[l.stage]}20`, color: stageColors[l.stage] }}>
                            {stageLabel(l.stage)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <a href={`https://wa.me/${l.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#22c55e] hover:underline">
                            <MessageSquare size={10} />
                            <ExternalLink size={8} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming by date */}
      {sortedDates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#f0f0f2] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} />
            Próximas acciones
          </h3>
          <div className="space-y-3">
            {sortedDates.map(dateStr => {
              const leadsOnDate = grouped.get(dateStr)!;
              const activeOnDate = leadsOnDate.filter(l => l.stage !== 'cerrado_perdido' && l.stage !== 'cerrado_ganado');
              if (activeOnDate.length === 0) return null;
              return (
                <div key={dateStr} className="bg-[#121214] border border-[#2a2a30] rounded-xl overflow-hidden">
                  <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider flex items-center gap-2"
                    style={{ color: dayColor(dateStr) }}>
                    <Clock size={12} />
                    {dayLabel(dateStr)}
                    <span className="text-[#6b6b76] font-normal normal-case">· {activeOnDate.length} acción{activeOnDate.length !== 1 ? 'es' : ''}</span>
                  </div>
                  <div className="divide-y divide-[#2a2a30]/50">
                    {activeOnDate.map(l => (
                      <div key={l.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-[#1a1a1e] transition-colors">
                        <div className="flex items-center gap-3">
                          <Link href={`/leads/${l.id}`} className="text-sm text-[#f0f0f2] font-medium hover:text-[#d4a853] transition-colors">
                            {l.full_name}
                          </Link>
                          {l.next_action_text && (
                            <span className="text-xs text-[#6b6b76] hidden sm:inline">— {l.next_action_text}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${stageColors[l.stage]}20`, color: stageColors[l.stage] }}>
                            {stageLabel(l.stage)}
                          </span>
                          <a href={`https://wa.me/${l.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="text-[#22c55e] hover:underline">
                            <MessageSquare size={10} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeLeads.length === 0 && (
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-8 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-[#10b981]" />
          <p className="text-sm text-[#a1a1aa]">No hay seguimientos pendientes</p>
          <p className="text-xs text-[#6b6b76] mt-1">Los leads con próxima acción aparecerán aquí</p>
        </div>
      )}
    </div>
  );
}
