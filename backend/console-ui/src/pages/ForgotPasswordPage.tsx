import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestForgotPassword } from '../lib/api';
import { paths, toPath } from '../lib/routes';
import { LogoMark } from '../components/LogoMark';
import { Alert, Btn, Field, Input } from '../components/ui';

const PENDING_MS = 5000;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'pending' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetUrl(null);
    setPhase('form');
    setCopied(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setLoading(true);
    try {
      const res = await requestForgotPassword(email.trim().toLowerCase());
      setMessage(res.message);

      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
        setPhase('pending');
        timerRef.current = setTimeout(() => {
          setPhase('done');
          timerRef.current = null;
        }, PENDING_MS);
      } else {
        setPhase('done');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function copyResetUrl() {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const showForm = phase === 'form';
  const showPendingMessage = phase === 'pending' || (phase === 'done' && !resetUrl);
  const showResetLink = phase === 'done' && resetUrl;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl sm:p-10">
        <div className="mb-8 flex items-center gap-4">
          <LogoMark />
          <div>
            <div className="text-xl font-extrabold tracking-tight text-brand-900">Morbeez</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Staff console
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your work email. When your account is found, a one-time password reset link will appear
          below (valid for 1 hour).
        </p>

        {error ? (
          <div className="mt-5">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}

        {showPendingMessage && message ? (
          <div className="mt-5">
            <Alert tone="success">{message}</Alert>
            {phase === 'pending' && resetUrl ? (
              <p className="mt-3 text-center text-sm text-slate-500">Preparing your reset link…</p>
            ) : null}
          </div>
        ) : null}

        {showResetLink ? (
          <div className="mt-5 space-y-3">
            <Alert tone="success">Your password reset link is ready. Open it to choose a new password.</Alert>
            <label className="block text-sm font-medium text-slate-700">Reset link</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
              readOnly
              value={resetUrl}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex flex-wrap gap-2">
              <Btn type="button" variant="primary" className="flex-1" onClick={() => copyResetUrl()}>
                {copied ? 'Copied' : 'Copy link'}
              </Btn>
              <a
                href={resetUrl}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-brand-600 bg-white px-4 py-2 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Open reset page
              </a>
            </div>
            <p className="text-xs text-slate-500">
              Share this link only with the employee who owns the account. Email delivery will be added
              later; until then, copy and send the link manually if needed.
            </p>
          </div>
        ) : null}

        {showForm ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Work email">
              <Input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Btn type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Btn>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to={toPath(paths.login)} className="font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
