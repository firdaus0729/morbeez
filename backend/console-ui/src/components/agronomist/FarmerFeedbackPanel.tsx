import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Btn } from '../ui';

const base = '/morbeez-staff/api/v1/os/agronomist';

type FeedbackItem = {
  id: string;
  farmer_suggested_diagnosis: string | null;
  ai_probable_issue: string | null;
  farmer_prior_product: string | null;
  crop_experience_years: number | null;
  status: string;
  created_at: string;
  farmer?: { name: string | null; phone: string | null; district: string | null };
  session?: { crop_type: string | null };
};

type FeedbackDetail = {
  feedback: FeedbackItem & {
    farmer_prior_experience: string | null;
    farmer_prior_outcome: string | null;
    agronomist_final_diagnosis: string | null;
  };
  block: { name: string; crop_type: string; dap: number | null } | null;
  session: {
    id: string;
    cropType: string | null;
    cropStage: string | null;
    symptomsText: string | null;
    confidence: number | null;
    imageUrl: string | null;
  } | null;
  sessionImages: Array<{ id: string; messageType: string; at: string; caption: string | null }>;
  weatherSummary: string | null;
  experienceStats: {
    trustScore: number;
    approvedFeedbackCount: number;
    correctIdentifications: number;
    recommendationSuccessRate: number | null;
    primaryCropSpecialization: string | null;
  } | null;
  farmerProfile: {
    cropExperienceYears: number | null;
    district: string | null;
    village: string | null;
    pincode: string | null;
  } | null;
  aiOutput: {
    probableIssue?: string;
    summaryEn?: string;
    summaryMl?: string;
    treatments?: unknown;
  } | null;
  similarApproved: Array<Record<string, unknown>>;
};

export function FarmerFeedbackPanel({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [finalDx, setFinalDx] = useState('');
  const [notes, setNotes] = useState('');
  const [updatedRec, setUpdatedRec] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api<{ ok: boolean; items: FeedbackItem[] }>(`${base}/farmer-feedback`);
      setItems(r.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const r = await api<{ ok: boolean } & FeedbackDetail>(`${base}/farmer-feedback/${id}`);
      setDetail({
        feedback: r.feedback,
        block: r.block,
        session: r.session ?? null,
        sessionImages: r.sessionImages ?? [],
        weatherSummary: r.weatherSummary ?? null,
        experienceStats: r.experienceStats ?? null,
        farmerProfile: r.farmerProfile ?? null,
        aiOutput: r.aiOutput,
        similarApproved: r.similarApproved ?? [],
      });
      setFinalDx(
        r.feedback.farmer_suggested_diagnosis ?? r.feedback.ai_probable_issue ?? ''
      );
      setNotes('');
      setUpdatedRec('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load detail');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function submitReview(decision: 'approved' | 'rejected' | 'partial') {
    if (!selectedId || !canWrite) return;
    setSaving(true);
    setError('');
    try {
      await api(`${base}/farmer-feedback/${selectedId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          agronomistFinalDiagnosis: finalDx.trim() || undefined,
          agronomistNotes: notes.trim() || undefined,
          updatedRecommendation: updatedRec.trim() || undefined,
        }),
      });
      setSelectedId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading farmer feedback…</p>;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          Farmers who disagreed with AI — validate before learning is stored.
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No pending farmer feedback.</p>
        ) : null}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className={`w-full rounded-xl border p-3 text-left text-sm ${
              selectedId === item.id
                ? 'border-amber-400 bg-amber-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="font-medium text-slate-900">
              {item.farmer?.name ?? item.farmer?.phone ?? 'Farmer'}
            </p>
            <p className="text-xs text-slate-500">
              {item.session?.crop_type ?? 'crop'} · AI: {item.ai_probable_issue ?? '—'} → Farmer:{' '}
              {item.farmer_suggested_diagnosis ?? '—'}
            </p>
            {item.crop_experience_years != null ? (
              <p className="text-xs text-slate-600">{item.crop_experience_years} yrs experience</p>
            ) : null}
            {item.farmer_prior_product ? (
              <p className="mt-1 text-xs text-emerald-800">Prior: {item.farmer_prior_product}</p>
            ) : null}
          </button>
        ))}
      </div>

      <div className="max-h-[80vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!detail ? (
          <p className="text-sm text-slate-500">Select feedback to review.</p>
        ) : (
          <>
            <h2 className="font-medium text-slate-900">Farmer experience review</h2>

            {detail.experienceStats ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                <strong>Farmer trust score:</strong> {Math.round(detail.experienceStats.trustScore * 100)}%
                {' · '}
                Approved corrections: {detail.experienceStats.approvedFeedbackCount}
                {detail.experienceStats.recommendationSuccessRate != null
                  ? ` · Rec success: ${Math.round(detail.experienceStats.recommendationSuccessRate * 100)}%`
                  : null}
              </div>
            ) : null}

            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">AI prediction</dt>
                <dd className="font-medium">{detail.feedback.ai_probable_issue ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Farmer suggests</dt>
                <dd className="font-medium">{detail.feedback.farmer_suggested_diagnosis ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Prior experience</dt>
                <dd className="whitespace-pre-wrap">
                  {detail.feedback.farmer_prior_experience ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Prior product / outcome</dt>
                <dd>
                  {detail.feedback.farmer_prior_product ?? '—'} /{' '}
                  {detail.feedback.farmer_prior_outcome ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Crop experience (years)</dt>
                <dd>
                  {detail.feedback.crop_experience_years ??
                    detail.farmerProfile?.cropExperienceYears ??
                    '—'}
                </dd>
              </div>
              {detail.block ? (
                <div>
                  <dt className="text-slate-500">Block · crop · DAP</dt>
                  <dd>
                    {detail.block.name} · {detail.block.crop_type} · {detail.block.dap ?? '—'} days
                  </dd>
                </div>
              ) : null}
              {detail.session?.symptomsText ? (
                <div>
                  <dt className="text-slate-500">Symptoms (session)</dt>
                  <dd>{detail.session.symptomsText}</dd>
                </div>
              ) : null}
            </dl>

            {detail.aiOutput?.summaryEn ? (
              <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-2 text-xs">
                <p className="font-medium text-slate-700">AI summary</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{detail.aiOutput.summaryEn}</p>
              </div>
            ) : null}

            {detail.sessionImages.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-700">Related images (WhatsApp)</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                  {detail.sessionImages.map((img) => (
                    <li key={img.id}>
                      {new Date(img.at).toLocaleString()} — {img.messageType}
                      {img.caption ? `: ${img.caption}` : ''}
                    </li>
                  ))}
                </ul>
                {detail.session?.imageUrl ? (
                  <a
                    className="mt-2 inline-block text-xs text-emerald-700 hover:underline"
                    href={detail.session.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open session image
                  </a>
                ) : null}
              </div>
            ) : null}

            {detail.weatherSummary ? (
              <div className="mt-3 rounded border border-sky-100 bg-sky-50/50 p-2 text-xs">
                <p className="font-medium text-sky-900">Weather (area)</p>
                <p className="mt-1 whitespace-pre-wrap text-sky-900/90">{detail.weatherSummary}</p>
              </div>
            ) : null}

            {detail.similarApproved.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-700">Similar verified cases</p>
                <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
                  {detail.similarApproved.map((s) => (
                    <li key={String(s.id)}>
                      {String(s.farmer_suggested_diagnosis ?? '—')} —{' '}
                      {String(s.farmer_prior_product ?? '')}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {canWrite ? (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                <label className="block text-sm">
                  <span className="text-slate-600">Final diagnosis (agronomist)</span>
                  <input
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    value={finalDx}
                    onChange={(e) => setFinalDx(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600">Updated recommendation (optional)</span>
                  <textarea
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    rows={3}
                    value={updatedRec}
                    onChange={(e) => setUpdatedRec(e.target.value)}
                    placeholder="Revised advice for telecaller / WhatsApp if needed"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600">Notes</span>
                  <textarea
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Btn type="button" disabled={saving} onClick={() => void submitReview('approved')}>
                    Approve & store learning
                  </Btn>
                  <Btn
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void submitReview('partial')}
                  >
                    Partial correct
                  </Btn>
                  <Btn
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void submitReview('rejected')}
                  >
                    Reject
                  </Btn>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
