import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { completePasswordReset, fetchResetPasswordPreview } from '../lib/api';
import { validatePasswordPair } from '../lib/password-form';
import { paths, toPath } from '../lib/routes';
import { LogoMark } from '../components/LogoMark';
import { Alert, Btn, Field, Input } from '../components/ui';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreviewError('Missing reset token. Use the full link from your email.');
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setPreviewError('');
      try {
        const reset = await fetchResetPasswordPreview(token);
        setEmail(reset.email ?? '');
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : 'Could not load reset link');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const clientErr = validatePasswordPair(password, confirmPassword);
    if (clientErr) {
      setSubmitError(clientErr);
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await completePasswordReset(token, password, confirmPassword);
      setDone(true);
      setTimeout(() => navigate(toPath(paths.login), { replace: true }), 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setSubmitting(false);
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

        <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose a personal password for your account. You will use this each time you sign in.
        </p>

        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

        {previewError ? (
          <div className="mt-5">
            <Alert tone="error">{previewError}</Alert>
          </div>
        ) : null}

        {!loading && !previewError && email ? (
          <p className="mt-5 text-sm text-slate-700">
            Resetting password for <strong>{email}</strong>
          </p>
        ) : null}

        {done ? (
          <div className="mt-5">
            <Alert tone="success">Password updated. Redirecting to sign in…</Alert>
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-5">
            <Alert tone="error">{submitError}</Alert>
          </div>
        ) : null}

        {!loading && !previewError && !done ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="New password">
              <Input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <Btn type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Saving…' : 'Update password'}
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
