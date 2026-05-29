import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestForgotPassword } from '../lib/api';
import { paths, toPath } from '../lib/routes';
import { LogoMark } from '../components/LogoMark';
import { Alert, Btn, Field, Input } from '../components/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await requestForgotPassword(email.trim().toLowerCase());
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

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
          Enter your work email. If an account exists, we will provide a reset link (check with your
          administrator or server logs in development).
        </p>

        {error ? (
          <div className="mt-5">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}

        {message ? (
          <div className="mt-5">
            <Alert tone="success">{message}</Alert>
          </div>
        ) : null}

        {!message ? (
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
