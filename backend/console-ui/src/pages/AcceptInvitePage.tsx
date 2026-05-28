import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { completeInvite, fetchInvitePreview } from '../lib/api';
import { roleLabel } from '../lib/format';
import { paths, toPath } from '../lib/routes';
import { LogoMark } from '../components/LogoMark';
import { Alert, Btn, Field, Input } from '../components/ui';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreviewError('Missing invitation token. Open the full link from your email.');
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setPreviewError('');
      try {
        const invite = await fetchInvitePreview(token);
        setEmail(invite.email ?? '');
        setFullName(invite.fullName ?? '');
        setRole(invite.role ?? '');
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : 'Could not load invitation');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await completeInvite(token, password);
      setDone(true);
      setTimeout(() => navigate(toPath(paths.login), { replace: true }), 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Activation failed');
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

        <h1 className="text-2xl font-bold text-slate-900">Activate your account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Confirm you received this link on your work email, then enter your organization console
          password.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading invitation…</p>
        ) : null}

        {previewError ? (
          <div className="mt-5">
            <Alert tone="error">{previewError}</Alert>
          </div>
        ) : null}

        {!loading && !previewError ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Name:</span> {fullName || '—'}
            </div>
            <div className="mt-1">
              <span className="font-semibold text-slate-900">Email:</span> {email || '—'}
            </div>
            <div className="mt-1">
              <span className="font-semibold text-slate-900">Role:</span>{' '}
              {role ? roleLabel(role) : '—'}
            </div>
          </div>
        ) : null}

        {done ? (
          <div className="mt-5">
            <Alert tone="success">Account activated. Redirecting to sign in…</Alert>
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-5">
            <Alert tone="error">{submitError}</Alert>
          </div>
        ) : null}

        {!loading && !previewError && !done ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Organization password">
              <p className="mb-2 text-xs text-slate-500">
                Use the shared console password provided by your administrator.
              </p>
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
            <Btn type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Activating…' : 'Activate & verify email'}
            </Btn>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already activated?{' '}
          <Link to={toPath(paths.login)} className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
