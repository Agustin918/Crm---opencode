'use client';

import { useState } from 'react';
import { Sparkles, Send, X, Loader2, MessageSquare, ExternalLink, Copy, Check } from 'lucide-react';

interface Props {
  leadId: string;
  leadName: string;
  leadPhone: string;
  stage: string;
  notes?: string;
  description?: string;
  campaign_name?: string;
  ad_name?: string;
  onClose: () => void;
}

export default function AIMessageModal({
  leadName, leadPhone, stage, notes, description, campaign_name, ad_name, onClose,
}: Props) {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError('');
    setSuggestion('');
    try {
      const res = await fetch('/api/ai/suggest-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: leadName,
          stage,
          notes,
          description,
          campaign_name,
          ad_name,
        }),
      });
      const body = await res.json();
      if (body.error) { setError(body.error); return; }
      setSuggestion(body.message);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = leadPhone
    ? `https://wa.me/${leadPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(suggestion)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#121214] border border-[#2a2a30] rounded-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a30]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#d4a853]" />
            <h2 className="text-sm font-semibold text-[#f0f0f2] uppercase tracking-wider">
              IA — Sugerir mensaje
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#1e1e24] flex items-center justify-center text-[#6b6b76] hover:text-[#f0f0f2] transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Lead info */}
          <div className="bg-[#1a1a1e] rounded-lg p-3 text-xs text-[#6b6b76] space-y-1">
            <p><span className="text-[#a1a1aa]">Lead:</span> {leadName}</p>
            <p><span className="text-[#a1a1aa]">Etapa:</span> {stage.replace(/_/g, ' ')}</p>
            {description && <p className="truncate"><span className="text-[#a1a1aa]">Proyecto:</span> {description}</p>}
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d4a853] text-black rounded-lg text-sm font-medium hover:bg-[#c49a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Pensando...' : 'Generar mensaje sugerido'}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-[#1e1e24] border border-[#ef4444]/30 rounded-lg p-3 text-xs text-[#ef4444]">
              {error}
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div className="space-y-3">
              <div className="bg-[#1a1a1e] border border-[#2a2a30] rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="text-sm text-[#f0f0f2] whitespace-pre-wrap leading-relaxed">{suggestion}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1e1e24] border border-[#2a2a30] text-[#f0f0f2] rounded-lg text-sm hover:bg-[#24242c] transition-colors"
                >
                  {copied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] rounded-lg text-sm hover:bg-[#22c55e]/20 transition-colors"
                  >
                    <MessageSquare size={14} />
                    Abrir WhatsApp
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
