'use client';

import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, Loader2, AlertTriangle } from 'lucide-react';

export default function TokenManager() {
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    fetch('/api/meta/token')
      .then(r => r.json())
      .then(d => { setToken(d.token); setSavedToken(d.token); })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/meta/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = await res.json();
      if (body.error) { setError(body.error); return; }
      setSaved(true);
      setSavedToken(token);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/meta/insights?date_preset=last_30d');
      const body = await res.json();
      setTestResult(body.error ? 'fail' : 'ok');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const hasChanged = token !== savedToken;

  return (
    <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-[#d4a853]" />
        <h3 className="text-sm font-semibold text-[#f0f0f2] uppercase tracking-wider">Meta Ads — Token de acceso</h3>
      </div>

      <div className="text-xs text-[#6b6b76]">
        El token de Meta Ads expira cada ~2 horas. Actualizalo acá cuando venza.
      </div>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Ingresá el access_token de Meta Ads..."
          className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2.5 pr-10 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors font-mono text-[11px]"
        />
        <button
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b76] hover:text-[#f0f0f2] transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[#ef4444]">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanged}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#d4a853] text-black rounded-lg text-sm font-medium hover:bg-[#c49a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Key size={14} />}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar token'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !savedToken}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1e1e24] border border-[#2a2a30] text-[#f0f0f2] rounded-lg text-sm hover:bg-[#24242c] disabled:opacity-50 transition-colors"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : testResult === 'ok' ? <Check size={14} className="text-[#10b981]" /> : testResult === 'fail' ? <AlertTriangle size={14} className="text-[#ef4444]" /> : null}
          {testing ? 'Probando...' : 'Probar conexión'}
        </button>
      </div>
    </div>
  );
}
