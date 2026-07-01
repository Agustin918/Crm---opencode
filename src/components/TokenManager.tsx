'use client';

import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, Loader2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

export default function TokenManager() {
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [savedAppId, setSavedAppId] = useState('');
  const [savedAppSecret, setSavedAppSecret] = useState('');
  const [savingApp, setSavingApp] = useState(false);
  const [savedApp, setSavedApp] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [tokenUpdatedAt, setTokenUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/meta/token').then(r => r.json()),
      fetch('/api/meta/app').then(r => r.json()),
      fetch('/api/meta/token/refresh').then(r => r.json()),
    ]).then(([tokenData, appData, statusData]) => {
      setToken(tokenData.token);
      setSavedToken(tokenData.token);
      setAppId(appData.app_id || '');
      setAppSecret(appData.app_secret || '');
      setSavedAppId(appData.app_id || '');
      setSavedAppSecret(appData.app_secret || '');
      if (statusData.token_updated_at) {
        setTokenUpdatedAt(statusData.token_updated_at);
      }
    }).catch(() => {});
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
      setTokenUpdatedAt(new Date().toISOString());
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

  const handleSaveApp = async () => {
    setSavingApp(true);
    setSavedApp(false);
    try {
      const res = await fetch('/api/meta/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      });
      const body = await res.json();
      if (body.error) { setError(body.error); return; }
      setSavedApp(true);
      setSavedAppId(appId);
      setSavedAppSecret(appSecret);
      setTimeout(() => setSavedApp(false), 3000);
    } catch {
      setError('Error al guardar');
    } finally {
      setSavingApp(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch('/api/meta/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      });
      const body = await res.json();
      setRefreshResult(body);
      if (body.ok) {
        setTokenUpdatedAt(new Date().toISOString());
        const tokenRes = await fetch('/api/meta/token').then(r => r.json());
        if (tokenRes.token) {
          setToken(tokenRes.token);
          setSavedToken(tokenRes.token);
        }
      }
    } catch {
      setRefreshResult({ ok: false, message: 'Error al refrescar token' });
    } finally {
      setRefreshing(false);
    }
  };

  const hasChanged = token !== savedToken;
  const appHasChanged = appId !== savedAppId || appSecret !== savedAppSecret;
  const hasAppCreds = savedAppId && savedAppSecret;

  const tokenAge = tokenUpdatedAt
    ? Math.floor((Date.now() - new Date(tokenUpdatedAt).getTime()) / (1000 * 60))
    : null;

  return (
    <div className="bg-[#121214] border border-[#2a2a30] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-[#d4a853]" />
        <h3 className="text-sm font-semibold text-[#f0f0f2] uppercase tracking-wider">Meta Ads — Token de acceso</h3>
      </div>

      {tokenAge !== null && (
        <div className={`text-xs px-3 py-2 rounded-lg ${tokenAge > 90 ? 'bg-[#451a1a] text-[#ef4444]' : 'bg-[#1a2a1a] text-[#4ade80]'}`}>
          {tokenAge > 90
            ? `Token guardado hace ${Math.floor(tokenAge / 60)}h ${tokenAge % 60}m (probablemente expirado)`
            : `Token guardado hace ${tokenAge} minutos`}
        </div>
      )}

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
        <button
          onClick={handleRefresh}
          disabled={refreshing || !hasAppCreds || !savedToken}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1e1e24] border border-[#2a2a30] text-[#f0f0f2] rounded-lg text-sm hover:bg-[#24242c] disabled:opacity-50 transition-colors"
          title={!hasAppCreds ? 'Configurá App ID y App Secret primero' : 'Refrescar token vía Meta API'}
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {refreshing ? 'Refrescando...' : 'Refrescar token'}
        </button>
      </div>

      {refreshResult && (
        <div className={`text-xs px-3 py-2 rounded-lg ${refreshResult.ok ? 'bg-[#1a2a1a] text-[#4ade80]' : 'bg-[#451a1a] text-[#ef4444]'}`}>
          {refreshResult.ok ? 'OK: ' : 'Error: '}{refreshResult.message}
        </div>
      )}

      <hr className="border-[#2a2a30]" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[#f0f0f2] uppercase tracking-wider">App de Facebook (para refresh automático)</h4>
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#d4a853] text-xs hover:underline"
          >
            <ExternalLink size={10} />
            Ir a Meta Developers
          </a>
        </div>
        <div className="text-xs text-[#6b6b76]">
          Creá o usá una app existente en Meta Developers. Andá a Configuración &rarr; Básico y copiá el ID y Secret.
        </div>
        <input
          value={appId}
          onChange={e => setAppId(e.target.value)}
          placeholder="App ID"
          className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
        />
        <input
          type="password"
          value={appSecret}
          onChange={e => setAppSecret(e.target.value)}
          placeholder="App Secret"
          className="w-full bg-[#1a1a1e] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0f0f2] placeholder-[#6b6b76] outline-none focus:border-[#d4a853]/50 transition-colors"
        />
        <button
          onClick={handleSaveApp}
          disabled={savingApp || !appHasChanged}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1e1e24] border border-[#2a2a30] text-[#f0f0f2] rounded-lg text-sm hover:bg-[#24242c] disabled:opacity-50 transition-colors"
        >
          {savingApp ? <Loader2 size={14} className="animate-spin" /> : savedApp ? <Check size={14} /> : <Key size={14} />}
          {savingApp ? 'Guardando...' : savedApp ? 'Guardado' : 'Guardar credenciales'}
        </button>
      </div>
    </div>
  );
}
