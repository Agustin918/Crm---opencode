'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { STAGES, type Lead } from '@/lib/types';
import {
  getLeadHonorario, getAdStats, getConversionRates,
  getTimelineDistribution, getNewLeadsComparison, getStaleLeads,
  parseSquareMeters, parseInvestment, parseTimeline,
} from '@/lib/dashboard-utils';
import {
  TrendingUp, DollarSign, BarChart3, Users, Clock,
  AlertTriangle, ArrowUp, ArrowDown, Target,
  Building2, Phone, MessageSquare, ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#1e1e24] flex items-center justify-center" style={{ color: color || '#d4a853' }}>
          <Icon size={16} />
        </div>
        <span className="text-xs text-[#6b6b76] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[#f0f0f2]">{value}</div>
      {sub && <div className="text-xs text-[#6b6b76] mt-1">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-[#f0f0f2] uppercase tracking-wider mb-4">{children}</h2>
  );
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

const stageLabels: Record<string, string> = {};
for (const s of STAGES) stageLabels[s.id] = s.label;

const stageColors: Record<string, string> = {
  lead_entrante: '#6b7280',
  conversacion_iniciada: '#3b82f6',
  llamada_realizada: '#8b5cf6',
  reunion_encuentro: '#f59e0b',
  presupuesto_enviado: '#06b6d4',
  cerrado_ganado: '#10b981',
  cerrado_perdido: '#ef4444',
};

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    const { data } = await getSupabase().from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#6b6b76]">
        Cargando dashboard...
      </div>
    );
  }

  const activeLeads = leads.filter(l => l.stage !== 'cerrado_perdido');
  const hotLeads = leads.filter(l => l.temperature === 'caliente' && l.stage !== 'cerrado_perdido');
  const budgetLeads = leads.filter(l => l.stage === 'presupuesto_enviado');
  const totalHonorarios = activeLeads.reduce((sum, l) => sum + getLeadHonorario(l), 0);
  const hotHonorarios = hotLeads.reduce((sum, l) => sum + getLeadHonorario(l), 0);
  const budgetHonorarios = budgetLeads.reduce((sum, l) => sum + getLeadHonorario(l), 0);
  const adStats = getAdStats(leads);
  const conversionRates = getConversionRates(leads);
  const timelineDist = getTimelineDistribution(leads);
  const newComparison = getNewLeadsComparison(leads);
  const staleLeads = getStaleLeads(leads);

  const avgInvestment = leads.reduce((sum, l) => {
    const inv = parseInvestment(l);
    return sum + (inv || 0);
  }, 0) / leads.length;

  const avgM2 = leads.reduce((sum, l) => {
    const m2 = parseSquareMeters(l);
    return sum + (m2 || 0);
  }, 0) / leads.length;

  const topAd = adStats[0];
  const topTimeline = timelineDist[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Leads activos"
          value={String(activeLeads.length)}
          sub={`${leads.length - activeLeads.length} descartados`}
          color="#3b82f6"
        />
        <StatCard
          icon={Clock}
          label="Nuevos (esta semana)"
          value={String(newComparison.thisWeek)}
          sub={
            newComparison.lastWeek > 0
              ? `${newComparison.change > 0 ? '+' : ''}${newComparison.change}% vs semana anterior`
              : 'Sin datos de semana anterior'
          }
          color="#10b981"
        />
        <StatCard
          icon={TrendingUp}
          label="Honorarios potenciales"
          value={formatUSD(totalHonorarios)}
          sub={`${activeLeads.length} leads activos`}
          color="#d4a853"
        />
        <StatCard
          icon={AlertTriangle}
          label="Sin contacto > 3 días"
          value={String(staleLeads.length)}
          sub={staleLeads.length > 0 ? 'Requieren atención' : 'Al día'}
          color="#ef4444"
        />
      </div>

      {/* Pipeline Financiero */}
      <div>
        <SectionTitle>Pipeline financiero</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={DollarSign}
            label="Total activos"
            value={formatUSD(totalHonorarios)}
            color="#d4a853"
          />
          <StatCard
            icon={Target}
            label="Leads calientes"
            value={formatUSD(hotHonorarios)}
            sub={`${hotLeads.length} leads`}
            color="#10b981"
          />
          <StatCard
            icon={BarChart3}
            label="Presupuesto enviado"
            value={formatUSD(budgetHonorarios)}
            sub={`${budgetLeads.length} leads`}
            color="#06b6d4"
          />
        </div>
      </div>

      {/* Ads Performance */}
      <div>
        <SectionTitle>Rendimiento de anuncios</SectionTitle>
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a1a1e] border-b border-[#2a2a30]">
                  <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Anuncio</th>
                  <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Campaña</th>
                  <th className="text-right px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Leads</th>
                </tr>
              </thead>
              <tbody>
                {adStats.map((ad, i) => (
                  <tr key={ad.adName} className="border-b border-[#2a2a30]/50 last:border-0 hover:bg-[#1a1a1e] transition-colors">
                    <td className="px-4 py-3 text-[#6b6b76] text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-[#f0f0f2] font-medium">{ad.adName}</td>
                    <td className="px-4 py-3 text-[#6b6b76] text-xs hidden sm:table-cell truncate max-w-[200px]">{ad.campaign}</td>
                    <td className="px-4 py-3 text-right text-[#f0f0f2] font-medium">{ad.leads}</td>
                  </tr>
                ))}
                {adStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#6b6b76] text-sm">Sin datos de anuncios</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Conversión y Perfil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rates */}
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
          <SectionTitle>Tasa de conversión entre etapas</SectionTitle>
          <div className="space-y-3">
            {conversionRates.map((r) => (
              <div key={r.from}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#a1a1aa]">{stageLabels[r.from] || r.from}</span>
                  <span className="text-[#6b6b76]">→</span>
                  <span className="text-[#a1a1aa]">{stageLabels[r.to] || r.to}</span>
                  <span className="text-[#f0f0f2] font-medium" style={{ color: stageColors[r.to] }}>{r.rate}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#1e1e24] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${r.rate}%`, background: stageColors[r.to] }}
                  />
                </div>
              </div>
            ))}
            {conversionRates.every(r => r.rate === 0) && (
              <p className="text-xs text-[#6b6b76] text-center py-4">
                Aún no hay movimiento entre etapas para calcular conversión
              </p>
            )}
          </div>
        </div>

        {/* Perfil Promedio */}
        <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4">
          <SectionTitle>Perfil del lead promedio</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1e1e24] rounded-lg p-3 text-center">
              <div className="text-xs text-[#6b6b76] mb-1">Inversión estimada</div>
              <div className="text-lg font-semibold text-[#f0f0f2]">
                {avgInvestment > 0 ? formatUSD(Math.round(avgInvestment)) : '—'}
              </div>
            </div>
            <div className="bg-[#1e1e24] rounded-lg p-3 text-center">
              <div className="text-xs text-[#6b6b76] mb-1">Superficie promedio</div>
              <div className="text-lg font-semibold text-[#f0f0f2]">
                {avgM2 > 0 ? `${Math.round(avgM2)} m²` : '—'}
              </div>
            </div>
            <div className="bg-[#1e1e24] rounded-lg p-3 text-center">
              <div className="text-xs text-[#6b6b76] mb-1">Plazo más frecuente</div>
              <div className="text-lg font-semibold text-[#f0f0f2] text-sm leading-tight">
                {topTimeline ? topTimeline.label : '—'}
              </div>
              {topTimeline && (
                <div className="text-[10px] text-[#6b6b76] mt-1">{topTimeline.count} leads</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leads sin contacto */}
      {staleLeads.length > 0 && (
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#ef4444]" />
              Leads sin contacto hace más de 3 días
            </span>
          </SectionTitle>
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a1a1e] border-b border-[#2a2a30]">
                    <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                    <th className="text-left px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Desde</th>
                    <th className="text-right px-4 py-3 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {staleLeads.slice(0, 10).map((l) => {
                    const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={l.id} className="border-b border-[#2a2a30]/50 last:border-0 hover:bg-[#1a1a1e] transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/leads/${l.id}`} className="text-[#f0f0f2] font-medium hover:text-[#d4a853] transition-colors">
                            {l.full_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {l.phone && (
                            <a
                              href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[#3b82f6] hover:underline text-xs"
                            >
                              <Phone size={10} />
                              {l.phone}
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#ef4444]">
                          {days} {days === 1 ? 'día' : 'días'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`https://wa.me/${l.phone?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1e1e24] border border-[#2a2a30] text-xs text-[#22c55e] hover:bg-[#24242c] transition-colors"
                          >
                            <MessageSquare size={11} />
                            WhatsApp
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {staleLeads.length > 10 && (
              <div className="px-4 py-3 text-xs text-[#6b6b76] text-center border-t border-[#2a2a30]">
                +{staleLeads.length - 10} leads más
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
