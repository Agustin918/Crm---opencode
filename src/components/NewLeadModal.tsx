'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewLeadModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    ad_name: '',
    campaign_name: '',
    temperature: 'tibio' as string,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    await getSupabase().from('leads').insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      ad_name: form.ad_name.trim(),
      campaign_name: form.campaign_name.trim(),
      temperature: form.temperature,
    });
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f0f0f2]">Nuevo lead</h2>
          <button onClick={onClose} className="text-[#6b6b76] hover:text-[#f0f0f2] transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Nombre completo *"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
          />
          <input
            placeholder="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
          />
          <input
            placeholder="Nombre del anuncio (opcional)"
            value={form.ad_name}
            onChange={(e) => setForm({ ...form, ad_name: e.target.value })}
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
          />
          <input
            placeholder="Campaña (opcional)"
            value={form.campaign_name}
            onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
          />
          <select
            value={form.temperature}
            onChange={(e) => setForm({ ...form, temperature: e.target.value })}
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] outline-none focus:border-[#d4a853]/50 transition-colors"
          >
            <option value="frio">Frío</option>
            <option value="tibio">Tibio</option>
            <option value="caliente">Caliente</option>
          </select>
          <button
            type="submit"
            className="w-full bg-[#d4a853] text-black font-medium rounded-lg px-3 py-2 text-sm hover:bg-[#c49a3a] transition-colors"
          >
            Crear lead
          </button>
        </form>
      </div>
    </div>
  );
}
