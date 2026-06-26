'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { STAGES, type Lead, type LeadStage, type LeadTemperature } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, ChevronDown, ArrowUpDown } from 'lucide-react';

const tempColors: Record<string, string> = {
  caliente: 'text-[#10b981]',
  tibio: 'text-[#f59e0b]',
  frio: 'text-[#6b7280]',
};

export default function LeadTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [tempFilter, setTempFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'full_name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchLeads = useCallback(async () => {
    let query = getSupabase().from('leads').select('*');
    if (stageFilter !== 'all') query = query.eq('stage', stageFilter);
    if (tempFilter !== 'all') query = query.eq('temperature', tempFilter);
    query = query.order(sortBy, { ascending: sortDir === 'asc' });
    const { data } = await query;
    if (data) setLeads(data);
  }, [stageFilter, tempFilter, sortBy, sortDir]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filtered = search
    ? leads.filter(
        (l) =>
          l.full_name.toLowerCase().includes(search.toLowerCase()) ||
          l.phone.includes(search) ||
          l.email.toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const stageLabel = (s: string) => STAGES.find((st) => st.id === s)?.label || s;

  const toggleSort = (field: 'created_at' | 'full_name') => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b76]" />
          <input
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg pl-9 pr-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="appearance-none bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 pr-8 text-sm text-[#f0f0f2] outline-none focus:border-[#d4a853]/50 transition-colors"
            >
              <option value="all">Todas las etapas</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6b76] pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={tempFilter}
              onChange={(e) => setTempFilter(e.target.value)}
              className="appearance-none bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 pr-8 text-sm text-[#f0f0f2] outline-none focus:border-[#d4a853]/50 transition-colors"
            >
              <option value="all">Todas</option>
              <option value="caliente">Caliente</option>
              <option value="tibio">Tibio</option>
              <option value="frio">Frío</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6b76] pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2a2a30]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#121214]">
              <th
                className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-[#f0f0f2] transition-colors"
                onClick={() => toggleSort('full_name')}
              >
                <span className="flex items-center gap-1">
                  Nombre <ArrowUpDown size={12} />
                </span>
              </th>
              <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Contacto</th>
              <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Etapa</th>
              <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden md:table-cell">Temp.</th>
              <th
                className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-[#f0f0f2] transition-colors hidden lg:table-cell"
                onClick={() => toggleSort('created_at')}
              >
                <span className="flex items-center gap-1">
                  Fecha <ArrowUpDown size={12} />
                </span>
              </th>
              <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Campaña</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-[#2a2a30] hover:bg-[#1a1a1e] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="text-[#f0f0f2] font-medium hover:text-[#d4a853] transition-colors">
                    {lead.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3b82f6] hover:underline text-xs block"
                    >
                      {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <span className="text-[#6b6b76] text-xs block truncate max-w-[200px]">{lead.email}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[#a1a1aa]">{stageLabel(lead.stage)}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs font-medium capitalize ${tempColors[lead.temperature]}`}>
                    {lead.temperature}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#6b6b76] hidden lg:table-cell">
                  {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}
                </td>
                <td className="px-4 py-3 text-xs text-[#6b6b76] hidden lg:table-cell truncate max-w-[150px]">
                  {lead.campaign_name || '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#6b6b76] text-sm">
                  No se encontraron leads
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
