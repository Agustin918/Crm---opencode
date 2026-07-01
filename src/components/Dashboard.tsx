'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { STAGES, type Lead, type LeadTemperature } from '@/lib/types';
import {
  getLeadHonorario, getAdStats, getConversionRates,
  getTimelineDistribution, getNewLeadsComparison, getStaleLeads,
  parseSquareMeters, parseInvestment, parseTimeline,
} from '@/lib/dashboard-utils';
import {
  TrendingUp, DollarSign, BarChart3, Users, Clock,
  AlertTriangle, ArrowUp, ArrowDown, Target,
  Building2, Phone, MessageSquare, ExternalLink, X,
  Thermometer, Snowflake, Flame, TrendingDown, Calendar,
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

function ClickableStatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: any; label: string; value: string; sub?: string; color?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full text-left bg-[#121214] border border-[#2a2a30] rounded-xl p-4 hover:border-[#d4a853]/50 transition-all cursor-pointer group">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#1e1e24] flex items-center justify-center" style={{ color: color || '#d4a853' }}>
          <Icon size={16} />
        </div>
        <span className="text-xs text-[#6b6b76] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[#f0f0f2] group-hover:text-[#d4a853] transition-colors">{value}</div>
      {sub && <div className="text-xs text-[#6b6b76] mt-1">{sub}</div>}
    </button>
  );
}

function LeadListModal({ leads, temperature, onClose }: {
  leads: Lead[]; temperature: LeadTemperature | null; onClose: () => void;
}) {
  const tempColors: Record<string, string> = {
    caliente: '#10b981',
    tibio: '#3b82f6',
    frio: '#ef4444',
  };
  const tempLabels: Record<string, string> = {
    caliente: 'Calientes',
    tibio: 'Tibios',
    frio: 'Fríos',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#121214] border border-[#2a2a30] rounded-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a30]">
          <h2 className="text-sm font-semibold text-[#f0f0f2] uppercase tracking-wider" style={{ color: tempColors[temperature || ''] }}>
            {tempLabels[temperature || '']} · {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#1e1e24] flex items-center justify-center text-[#6b6b76] hover:text-[#f0f0f2] transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
          {leads.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#6b6b76]">Sin leads en esta categoría</div>
          ) : (
            leads.map(l => {
              const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={l.id} className="px-5 py-3 border-b border-[#2a2a30]/50 last:border-0 hover:bg-[#1a1a1e] transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link href={`/leads/${l.id}`} className="text-sm font-medium text-[#f0f0f2] hover:text-[#d4a853] transition-colors">
                        {l.full_name}
                      </Link>
                      {l.phone && (
                        <a href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#3b82f6] hover:underline mt-0.5">
                          <Phone size={9} /> {l.phone}
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#6b6b76]">{days}d</div>
                      <div className="text-[10px] text-[#6b6b76]">{l.stage?.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
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
  const [popupTemperature, setPopupTemperature] = useState<LeadTemperature | null>(null);
  const [paidInsights, setPaidInsights] = useState<any[] | null>(null);
  const [paidLoading, setPaidLoading] = useState(true);
  const [paidError, setPaidError] = useState('');

  const fetchLeads = useCallback(async () => {
    const { data } = await getSupabase().from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    async function loadPaidInsights() {
      try {
        const res = await fetch('/api/meta/insights?date_preset=last_30d');
        const body = await res.json();
        if (body.error) { setPaidError(body.error); setPaidInsights(null); }
        else { setPaidInsights(body.accounts); setPaidError(''); }
      } catch { setPaidError('Error al cargar insights'); setPaidInsights(null); }
      finally { setPaidLoading(false); }
    }
    loadPaidInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#6b6b76]">
        Cargando dashboard...
      </div>
    );
  }

  const activeLeads = leads.filter(l => l.stage !== 'cerrado_perdido');
  const hotLeads = leads.filter(l => l.temperature === 'caliente' && l.stage !== 'cerrado_perdido');
  const warmLeads = leads.filter(l => l.temperature === 'tibio' && l.stage !== 'cerrado_perdido');
  const coldLeads = leads.filter(l => l.temperature === 'frio' && l.stage !== 'cerrado_perdido');
  const budgetLeads = leads.filter(l => l.stage === 'presupuesto_enviado');
  const totalHonorarios = activeLeads.reduce((sum, l) => sum + getLeadHonorario(l), 0);
  const hotHonorarios = hotLeads.reduce((sum, l) => sum + getLeadHonorario(l), 0);
  const budgetHonorarios = budgetLeads.reduce((sum, l) => sum + getLeadHonorario(l), 0);
  const adStats = getAdStats(leads);
  const conversionRates = getConversionRates(leads);
  const timelineDist = getTimelineDistribution(leads);
  const newComparison = getNewLeadsComparison(leads);
  const staleLeads = getStaleLeads(leads);

  const closedRevenue = leads
    .filter(l => l.stage === 'cerrado_ganado' && l.revenue)
    .reduce((sum, l) => sum + (l.revenue || 0), 0);
  const totalAdSpend = paidInsights?.reduce((s: number, a: any) => s + a.totalSpend, 0) || 0;
  const totalAdLeads = paidInsights?.reduce((s: number, a: any) => s + a.totalLeads, 0) || 0;
  const roas = totalAdSpend > 0 ? closedRevenue / totalAdSpend : 0;

  const now = new Date();
  const followUpLeads = leads.filter(l =>
    l.stage !== 'cerrado_perdido' && l.stage !== 'cerrado_ganado' && l.next_action_date
  );
  const overdueCount = followUpLeads.filter(l => new Date(l.next_action_date!) < new Date(now.toDateString())).length;

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

      {/* Temperatura de leads */}
      <div>
        <SectionTitle>Leads por temperatura</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <ClickableStatCard
            icon={Flame}
            label="Calientes"
            value={String(hotLeads.length)}
            sub="Listos para avanzar"
            color="#10b981"
            onClick={() => setPopupTemperature('caliente')}
          />
          <ClickableStatCard
            icon={Thermometer}
            label="Tibios"
            value={String(warmLeads.length)}
            sub="En seguimiento"
            color="#3b82f6"
            onClick={() => setPopupTemperature('tibio')}
          />
          <ClickableStatCard
            icon={Snowflake}
            label="Fríos"
            value={String(coldLeads.length)}
            sub="Seguimiento pasivo"
            color="#ef4444"
            onClick={() => setPopupTemperature('frio')}
          />
        </div>
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

      {/* Paid Insights + ROAS */}
      <div>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <BarChart3 size={14} className="text-[#d4a853]" />
            Paid Insights + ROAS
          </span>
        </SectionTitle>
        {paidLoading ? (
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-6 text-center text-sm text-[#6b6b76]">
            Cargando datos de Meta Ads...
          </div>
        ) : paidError ? (
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-6 text-center text-sm text-[#ef4444]">
            {paidError}
          </div>
        ) : paidInsights && paidInsights.length > 0 ? (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard icon={DollarSign} label="Gasto total" value={formatUSD(Math.round(totalAdSpend))} color="#ef4444" />
              <StatCard icon={Users} label="Leads de ads" value={String(totalAdLeads)} color="#3b82f6" />
              <StatCard icon={TrendingDown} label="CPA" value={formatUSD(Math.round(totalAdSpend / (totalAdLeads || 1)))} color="#f59e0b" />
              <StatCard icon={Target} label="Revenue cerrado" value={formatUSD(Math.round(closedRevenue))} color="#10b981" />
              <StatCard icon={TrendingUp} label="ROAS" value={roas > 0 ? `${roas.toFixed(1)}x` : '—'} color={roas >= 1 ? '#10b981' : '#6b6b76'} sub={roas > 0 ? 'por $1 invertido' : 'sin revenue aún'} />
            </div>
            {/* Per-account table */}
            {paidInsights.map((account: any) => (
              <div key={account.accountName} className="bg-[#121214] border border-[#2a2a30] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 text-xs text-[#6b6b76] uppercase tracking-wider border-b border-[#2a2a30]">
                  {account.accountName}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1a1a1e] border-b border-[#2a2a30]">
                        <th className="text-left px-3 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Campaña</th>
                        <th className="text-right px-3 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Gasto</th>
                        <th className="text-right px-3 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Impr.</th>
                        <th className="text-right px-3 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Clicks</th>
                        <th className="text-right px-3 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">Leads</th>
                        <th className="text-right px-3 py-2.5 text-[#6b6b76] font-medium text-xs uppercase tracking-wider">CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.campaigns.map((c: any) => (
                        <tr key={c.campaign_id} className="border-b border-[#2a2a30]/50 last:border-0 hover:bg-[#1a1a1e] transition-colors">
                          <td className="px-3 py-2.5 text-[#f0f0f2] font-medium text-xs truncate max-w-[200px]">{c.campaign_name}</td>
                          <td className="px-3 py-2.5 text-right text-[#f0f0f2] text-xs">{formatUSD(Math.round(c.spend))}</td>
                          <td className="px-3 py-2.5 text-right text-[#6b6b76] text-xs hidden sm:table-cell">{(c.impressions / 1000).toFixed(0)}k</td>
                          <td className="px-3 py-2.5 text-right text-[#6b6b76] text-xs hidden sm:table-cell">{c.clicks}</td>
                          <td className="px-3 py-2.5 text-right text-[#f0f0f2] text-xs">{c.leads}</td>
                          <td className="px-3 py-2.5 text-right text-xs" style={{ color: (c.spend / (c.leads || 1)) > 50 ? '#ef4444' : '#10b981' }}>
                            {formatUSD(Math.round(c.spend / (c.leads || 1)))}
                          </td>
                        </tr>
                      ))}
                      {account.campaigns.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-[#6b6b76] text-xs">Sin datos de campañas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-6 text-center text-sm text-[#6b6b76]">
            Conectá Meta Ads para ver insights
          </div>
        )}
      </div>

      {/* Próximas acciones */}
      <div>
        <SectionTitle>
          <Link href="/seguimientos" className="flex items-center gap-2 hover:text-[#d4a853] transition-colors">
            <Calendar size={14} />
            Próximas acciones
            {overdueCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ef4444]/20 text-[#ef4444] font-normal">
                {overdueCount} vencida{overdueCount !== 1 ? 's' : ''}
              </span>
            )}
          </Link>
        </SectionTitle>
        <Link href="/seguimientos" className="block group">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4 group-hover:border-[#ef4444]/50 transition-colors">
              <div className="text-xs text-[#6b6b76] uppercase tracking-wider mb-1">Vencidas</div>
              <div className="text-2xl font-semibold text-[#ef4444]">{overdueCount}</div>
            </div>
            <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4 group-hover:border-[#f59e0b]/50 transition-colors">
              <div className="text-xs text-[#6b6b76] uppercase tracking-wider mb-1">Hoy</div>
              <div className="text-2xl font-semibold text-[#f59e0b]">
                {followUpLeads.filter(l => {
                  const d = new Date(l.next_action_date!);
                  const today = new Date();
                  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                }).length}
              </div>
            </div>
            <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-4 group-hover:border-[#3b82f6]/50 transition-colors">
              <div className="text-xs text-[#6b6b76] uppercase tracking-wider mb-1">Próximas</div>
              <div className="text-2xl font-semibold text-[#3b82f6]">{followUpLeads.length}</div>
            </div>
          </div>
        </Link>
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

      {/* Lead Popup */}
      {popupTemperature && (
        <LeadListModal
          leads={leads.filter(l => l.temperature === popupTemperature && l.stage !== 'cerrado_perdido')}
          temperature={popupTemperature}
          onClose={() => setPopupTemperature(null)}
        />
      )}
    </div>
  );
}
