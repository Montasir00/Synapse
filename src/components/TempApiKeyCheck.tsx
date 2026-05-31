import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Key } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import axios from 'axios';

type CheckStatus = 'idle' | 'checking' | 'valid' | 'invalid';

const getValidationHint = (code: number | null, baseUrl: string): string => {
  if (code === -2015) {
    const exchangeHint = baseUrl.includes('binance.us')
      ? 'Use Binance US API keys for Binance US.'
      : 'Use Binance Global API keys for Binance Global.';

    return `${exchangeHint} Also check API key permissions (Enable Reading) and disable API IP restriction for testing.`;
  }

  if (code === 0) {
    return 'Your region or account may be restricted for this Binance endpoint.';
  }

  return '';
};

export default function TempApiKeyCheck() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('binance_base_url') || 'https://api.binance.com');
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [message, setMessage] = useState('Enter key and secret to validate in real time.');
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const user = auth.currentUser;

  const canCheck = useMemo(() => apiKey.trim().length > 0 && apiSecret.trim().length > 0, [apiKey, apiSecret]);

  const runCheck = useCallback(async () => {
    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();

    if (!cleanKey || !cleanSecret) {
      setStatus('idle');
      setErrorCode(null);
      setMessage('Enter key and secret to validate in real time.');
      return;
    }

    if (cleanKey.includes('*') || cleanSecret.includes('*')) {
      setStatus('invalid');
      setErrorCode(null);
      setMessage('Masked values detected. Paste the full key and secret.');
      return;
    }

    if (!user) {
      setStatus('invalid');
      setErrorCode(null);
      setMessage('Sign in first to run validation.');
      return;
    }

    setStatus('checking');
    setErrorCode(null);
    setMessage('Checking credentials...');

    try {
      const token = await user.getIdToken();
      const { validateBinanceCredentials } = await import('../services/binanceService');
      const result = await validateBinanceCredentials(token, cleanKey, cleanSecret, baseUrl);
      const hint = getValidationHint(result.code ?? null, baseUrl);
      const combinedMsg = [result.msg || (result.ok ? 'Credentials are valid.' : 'Credentials are invalid.'), hint]
        .filter(Boolean)
        .join(' ');

      if (result.ok) {
        setStatus('valid');
        setErrorCode(null);
        setMessage(combinedMsg);
      } else {
        setStatus('invalid');
        setErrorCode(result.code ?? null);
        setMessage(combinedMsg);
      }
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const msg = error?.response?.data?.msg || error?.response?.data?.error || error?.message || 'Validation failed.';
      const hint = getValidationHint(typeof code === 'number' ? code : null, baseUrl);
      setStatus('invalid');
      setErrorCode(typeof code === 'number' ? code : null);
      setMessage([msg, hint].filter(Boolean).join(' '));
    }
  }, [apiKey, apiSecret, baseUrl, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runCheck();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [runCheck]);

  useEffect(() => {
    localStorage.setItem('binance_base_url', baseUrl);
  }, [baseUrl]);

  const saveValidatedCredentials = useCallback(async () => {
    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();

    if (!user) {
      setStatus('invalid');
      setMessage('Sign in first to save credentials.');
      return;
    }

    if (status !== 'valid') {
      setStatus('invalid');
      setMessage('Validate credentials first, then save.');
      return;
    }

    if (!cleanKey || !cleanSecret) {
      setStatus('invalid');
      setMessage('API key and secret are required.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/binance/save-credentials`, {
        apiKey: cleanKey,
        apiSecret: cleanSecret
      }, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }
      });
      
      const { encryptedKey, encryptedSecret } = response.data.payload;

      await setDoc(doc(db, 'user_secrets', user.uid), {
        binanceApiKey: encryptedKey,
        binanceApiSecret: encryptedSecret,
        updatedAt: serverTimestamp()
      });

      localStorage.setItem('binance_base_url', baseUrl);
      setMessage('Credentials encrypted via Neural Vault and persisted.');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.details || error?.response?.data?.error || error?.message || 'Failed to save credentials.';
      setStatus('invalid');
      setMessage(errorMsg);
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, apiSecret, baseUrl, status, user]);

  const statusClass =
    status === 'valid'
      ? 'text-success border-success/30 bg-success/10'
      : status === 'invalid'
        ? 'text-alert border-alert/30 bg-alert/10'
        : status === 'checking'
          ? 'text-accent border-accent/30 bg-accent/10'
          : 'text-muted border-border bg-surface-subtle';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
      <div className="soothing-card p-6 sm:p-8 lg:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-ink">API Checker (Temp)</h2>
            <p className="micro-label">Validate Binance credentials before saving</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setBaseUrl('https://api.binance.com')}
            className={`rounded-full border px-4 py-3 text-xs font-black uppercase tracking-wide transition-colors ${baseUrl === 'https://api.binance.com'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface-subtle text-muted hover:text-ink'
              }`}
          >
            Binance Global
          </button>
          <button
            type="button"
            onClick={() => setBaseUrl('https://api.binance.us')}
            className={`rounded-full border px-4 py-3 text-xs font-black uppercase tracking-wide transition-colors ${baseUrl === 'https://api.binance.us'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface-subtle text-muted hover:text-ink'
              }`}
          >
            Binance US
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="api-key" className="micro-label">API Key</label>
            <input
              id="api-key"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste API key"
              className="w-full bg-surface-subtle border border-border rounded-full px-5 py-3 text-sm font-mono font-semibold text-ink focus:border-accent/40 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="api-secret" className="micro-label">API Secret</label>
            <input
              id="api-secret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Paste API secret"
              className="w-full bg-surface-subtle border border-border rounded-full px-5 py-3 text-sm font-mono font-semibold text-ink focus:border-accent/40 outline-none"
            />
          </div>
        </div>

        <div className={`rounded-2xl border px-4 py-4 ${statusClass}`}>
          <div className="flex items-start gap-3">
            {status === 'checking' && <Loader2 className="w-4 h-4 mt-0.5 animate-spin" />}
            {status === 'valid' && <CheckCircle2 className="w-4 h-4 mt-0.5" />}
            {status === 'invalid' && <AlertTriangle className="w-4 h-4 mt-0.5" />}
            {status === 'idle' && <Key className="w-4 h-4 mt-0.5" />}
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide">Status: {status}</p>
              <p className="text-sm font-semibold">{message}</p>
              {typeof errorCode === 'number' && (
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">Code: {errorCode}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={!canCheck || status !== 'valid' || isSaving}
            onClick={() => {
              void saveValidatedCredentials();
            }}
            className="precise-button px-6 py-3 text-xs"
          >
            {isSaving ? 'Saving...' : 'Save for Trade Tracker'}
          </button>
          <button
            type="button"
            disabled={!canCheck || status === 'checking'}
            onClick={() => {
              void runCheck();
            }}
            className="precise-button px-6 py-3 text-xs"
          >
            Test Now
          </button>
        </div>
      </div>
    </div>
  );
}
