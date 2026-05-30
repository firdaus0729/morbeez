import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Alert, Btn, Loading } from '../ui';
import {
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconExpand,
  IconFeedback,
  IconFilter,
  IconHelp,
  IconList,
  IconPencil,
  IconSend,
  IconThumbsUp,
  IconTrendUp,
  IconWhatsApp,
} from './case-review-icons';
import '../../styles/case-review.css';

const base = '/morbeez-staff/api/v1/os/agronomist';

type QueueItem = {
  id: string;
  caseRef: string;
  farmerName: string;
  farmerPhone: string | null;
  cropType: string;
  dap: number | null;
  confidence: number | null;
  priority: string;
  status: string;
  timeAgo: string;
  farmerDisagrees: boolean;
};

type TimelineKind = 'whatsapp' | 'ai' | 'farmer' | 'pending';

type CaseDetail = {
  escalation: {
    id: string;
    caseRef: string;
    sessionId: string;
    status: string;
    priority: string;
    confidence: number | null;
    timeAgo: string;
  };
  farmer: { name: string; phone: string; district: string | null; language?: string } | null;
  block: { name: string; cropType: string; dap: number | null } | null;
  location: {
    district: string | null;
    village: string | null;
    state: string | null;
    weatherSummary: string | null;
  };
  images: Array<{ id: string; url: string | null; caption: string | null; at: string }>;
  ai: {
    topDiagnoses: Array<{ label: string; confidence: number }>;
    summary: string;
    probableIssue: string | null;
    confidence: number | null;
  };
  confidenceBreakdown: Array<{ label: string; score: number }>;
  context: {
    lastSpray: {
      product: string;
      dosage: string | null;
      at: string | null;
      appliedAt?: string;
    } | null;
    soil: { ph: unknown; ec: unknown; testedAt: string | null } | null;
    previousIssue: { issue: string | null; outcome: string | null } | null;
    rainfallNote: string | null;
  };
  farmerFeedback: {
    farmerDiagnosis: string | null;
    farmerExperience: string | null;
    farmerProduct: string | null;
    farmerOutcome: string | null;
    cropExperienceYears: number | null;
  } | null;
  similarCases: Array<{
    id: string;
    issueLabel: string;
    symptomKey: string;
    dap: number | null;
  }>;
  timeline: Array<{ at: string | null; label: string; status: 'done' | 'pending'; kind?: TimelineKind }>;
};

type ReviewAction = 'approve_ai' | 'correct_ai' | 'partial_match' | 'escalate_urgent';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function scoreDec(n: number): string {
  return n.toFixed(2);
}

function farmerInitial(name: string): string {
  const t = name.trim();
  return (t[0] ?? 'F').toUpperCase();
}

function relativeDays(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function confTone(c: number | null): 'high' | 'medium' | 'low' {
  if (c == null) return 'medium';
  if (c >= 0.75) return 'high';
  if (c >= 0.5) return 'medium';
  return 'low';
}

function formatLocation(detail: CaseDetail): string {
  const parts = [
    detail.location.village,
    detail.location.district,
    detail.location.state,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : detail.location.district ?? '—';
}

function parseWeatherLine(summary: string | null): string {
  if (!summary) return '—';
  const line = summary.split('\n')[0];
  return line.length > 48 ? `${line.slice(0, 45)}…` : line;
}

const DX_OPTIONS = [
  'Thrips Damage',
  'Heat Stress',
  'Leaf Spot (Fungal)',
  'Nutrient Deficiency',
  'Root Rot',
  'Bacterial Wilt',
];

export function CaseReviewPanel({ canWrite }: { canWrite: boolean }) {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sort, setSort] = useState<'priority' | 'newest'>('priority');
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const [action, setAction] = useState<ReviewAction>('approve_ai');
  const [correctDiagnosis, setCorrectDiagnosis] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [recommendationText, setRecommendationText] = useState('');
  const [dosage, setDosage] = useState('');
  const [notesForLearning, setNotesForLearning] = useState('');

  const pageSize = 6;

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    const keepSelection = selectedId;
    try {
      const r = await api<{ ok: boolean; items: QueueItem[]; total: number }>(
        `${base}/cases?status=${encodeURIComponent(statusFilter)}&sort=${sort}&limit=${pageSize}&page=${page}`
      );
      setQueue(r.items ?? []);
      setTotal(r.total ?? 0);
      if (r.items?.length && !keepSelection) setSelectedId(r.items[0].id);
      else if (r.items?.length && keepSelection && !r.items.some((i) => i.id === keepSelection)) {
        setSelectedId(r.items[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sort, page]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await api<{ ok: boolean } & CaseDetail>(`${base}/cases/${id}`);
      setDetail({
        escalation: r.escalation,
        farmer: r.farmer,
        block: r.block,
        location: r.location,
        images: r.images ?? [],
        ai: r.ai,
        confidenceBreakdown: r.confidenceBreakdown ?? [],
        context: r.context,
        farmerFeedback: r.farmerFeedback,
        similarCases: r.similarCases ?? [],
        timeline: r.timeline ?? [],
      });
      setImageIndex(0);
      setZoom(100);
      setCorrectDiagnosis(r.ai.probableIssue ?? '');
      setRecommendationText(r.ai.summary ?? '');
      setAction(r.farmerFeedback ? 'correct_ai' : 'approve_ai');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [statusFilter, sort, page]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const activeImage = detail?.images[imageIndex] ?? detail?.images[0];
  const overallConf = detail?.ai.confidence ?? detail?.escalation.confidence;
  const diagnosisOptions = useMemo(() => {
    const fromAi = detail?.ai.topDiagnoses.map((d) => d.label) ?? [];
    return [...new Set([...fromAi, ...DX_OPTIONS, correctDiagnosis].filter(Boolean))];
  }, [detail, correctDiagnosis]);

  const pageStart = (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function submitReview(submitForApproval: boolean) {
    if (!canWrite || !selectedId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const r = await api<{ ok: boolean; submittedForApproval?: boolean }>(
        `${base}/cases/${selectedId}/review`,
        {
          method: 'POST',
          body: JSON.stringify({
            action,
            correctDiagnosis: action !== 'approve_ai' ? correctDiagnosis : undefined,
            severity,
            recommendationText,
            dosage: dosage || undefined,
            notesForLearning: notesForLearning || undefined,
            submitForApproval,
          }),
        }
      );
      setSuccess(
        r.submittedForApproval
          ? 'Saved and submitted for Super Admin approval.'
          : 'Review saved.'
      );
      await loadQueue();
      if (selectedId) await loadDetail(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save review');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cr-page">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div className="cr-shell">
        {/* ── Left column (20%) ── */}
        <aside className="cr-col-left">
          <div className="cr-queue-panel">
            <div className="cr-queue-head">
              <h2 className="cr-h2">Escalation Queue</h2>
              <button
                type="button"
                className="cr-icon-btn"
                aria-label="Filter status"
                onClick={() => setShowFilter((v) => !v)}
              >
                <IconFilter />
              </button>
            </div>
            {showFilter ? (
              <div className="cr-filter-row">
                <select
                  className="cr-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_review">In review</option>
                  <option value="resolved">Resolved</option>
                  <option value="all">All</option>
                </select>
              </div>
            ) : null}
            <label className="cr-sort-row">
              <span className="cr-sort-label">Sort:</span>
              <select
                className="cr-select cr-select--inline"
                value={sort}
                onChange={(e) => setSort(e.target.value as 'priority' | 'newest')}
              >
                <option value="priority">Priority</option>
                <option value="newest">Newest</option>
              </select>
            </label>

            {loading && queue.length === 0 ? (
              <Loading label="Loading queue…" />
            ) : null}
            <ul className="cr-queue-list" aria-busy={loading}>
              {queue.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`cr-queue-item${selectedId === item.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="cr-queue-item-row">
                      <span className="cr-queue-item-name">{item.farmerName}</span>
                      <span
                        className={`cr-tag cr-tag--priority-${item.priority === 'high' || item.priority === 'urgent' ? 'high' : 'normal'}`}
                      >
                        {item.priority === 'high' || item.priority === 'urgent' ? 'High' : 'Normal'}
                      </span>
                    </div>
                    <p className="cr-queue-item-crop">
                      {item.cropType}
                      {item.dap != null ? ` · DAP ${item.dap}` : ''}
                    </p>
                    <div className="cr-queue-item-row">
                      <span className={`cr-conf cr-conf--${confTone(item.confidence)}`}>
                        {item.confidence != null
                          ? `${Math.round(item.confidence * 100)}% Conf.`
                          : '—'}
                      </span>
                      <span className="cr-queue-item-time">{item.timeAgo}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {!loading && queue.length === 0 ? (
              <p className="cr-muted cr-pad">No cases in this filter.</p>
            ) : null}
            <div className="cr-pagination">
              <span className="cr-muted">
                Showing {queue.length ? pageStart : 0}–{pageEnd} of {total}
              </span>
              <div className="cr-pagination-btns">
                <button
                  type="button"
                  className="cr-icon-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <IconChevronLeft />
                </button>
                <button
                  type="button"
                  className="cr-icon-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <IconChevronRight />
                </button>
              </div>
            </div>
          </div>

          {detail?.farmerFeedback ? (
            <div className="cr-fb-card">
              <div className="cr-fb-head">
                <IconFeedback />
                <span className="cr-fb-title">Farmer Feedback</span>
                <span className="cr-tag cr-tag--disagree">Disagrees with AI</span>
              </div>
              <blockquote className="cr-fb-quote">
                {detail.farmerFeedback.farmerDiagnosis ||
                  detail.farmerFeedback.farmerExperience ||
                  'Farmer reported a different diagnosis.'}
              </blockquote>
              <div className="cr-fb-grid">
                <div>
                  <span className="cr-fb-k">Product Used</span>
                  <span className="cr-fb-v">{detail.farmerFeedback.farmerProduct ?? '—'}</span>
                </div>
                <div>
                  <span className="cr-fb-k">Outcome</span>
                  <span className="cr-tag cr-tag--improved">
                    {detail.farmerFeedback.farmerOutcome ?? 'Reported'}
                  </span>
                </div>
                <div className="cr-fb-span2">
                  <span className="cr-fb-k">Experience</span>
                  <span className="cr-fb-v">
                    {detail.farmerFeedback.cropExperienceYears != null
                      ? `${detail.farmerFeedback.cropExperienceYears}+ years growing ${detail.block?.cropType ?? 'crop'}`
                      : detail.farmerFeedback.farmerExperience ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        {/* ── Header spans center + right ── */}
        {detail ? (
          <header className="cr-header" aria-busy={detailLoading}>
            <div className="cr-header-farmer">
              <div className="cr-avatar" aria-hidden>
                {farmerInitial(detail.farmer?.name ?? 'F')}
              </div>
              <div>
                <h1 className="cr-farmer-name">{detail.farmer?.name ?? 'Farmer'}</h1>
                {detail.farmer?.phone ? (
                  <p className="cr-wa-row">
                    <IconWhatsApp />
                    <a
                      href={`https://wa.me/${detail.farmer.phone.replace(/\D/g, '')}`}
                      className="cr-wa-link"
                    >
                      {detail.farmer.phone}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="cr-header-stats">
              <div className="cr-stat">
                <span className="cr-stat-k">Crop</span>
                <span className="cr-stat-v">{detail.block?.cropType ?? '—'}</span>
              </div>
              <div className="cr-stat">
                <span className="cr-stat-k">DAP</span>
                <span className="cr-stat-v">{detail.block?.dap ?? '—'}</span>
              </div>
              <div className="cr-stat">
                <span className="cr-stat-k">Location</span>
                <span className="cr-stat-v">{formatLocation(detail)}</span>
              </div>
              <div className="cr-stat">
                <span className="cr-stat-k">Weather</span>
                <span className="cr-stat-v cr-stat-v--weather">
                  {parseWeatherLine(detail.location.weatherSummary)}
                </span>
              </div>
            </div>
            <div className="cr-header-case">
              <div className="cr-case-id-row">
                <span className="cr-case-id-label">Case ID:</span>
                <span className="cr-case-id-val">{detail.escalation.caseRef}</span>
                <span className="cr-tag cr-tag--new">New</span>
              </div>
              <div className="cr-case-meta-row">
                <IconHelp />
                <span className="cr-muted">{detail.escalation.timeAgo} ago</span>
                <IconChevronRight />
              </div>
            </div>
          </header>
        ) : (
          <header className="cr-header cr-header--empty" />
        )}

        {/* ── Center column (55%) ── */}
        <main className="cr-col-center">
          {!selectedId ? (
            <p className="cr-empty-center">Select a case from the escalation queue.</p>
          ) : detailLoading || !detail ? (
            detailLoading ? (
              <Loading label="Loading case…" />
            ) : (
              <p className="cr-empty-center">Could not load this case.</p>
            )
          ) : (
            <>
              {detail.images.length > 0 ? (
                <section className="cr-media-block">
                  <div className="cr-viewer-wrap">
                    <div className="cr-viewer">
                      {activeImage?.url ? (
                        <img
                          src={activeImage.url}
                          alt="Crop symptom"
                          className="cr-viewer-img"
                          style={{ transform: `scale(${zoom / 100})` }}
                        />
                      ) : null}
                      <span className="cr-viewer-count">
                        {`${imageIndex + 1}/${detail.images.length}`}
                      </span>
                      <div className="cr-viewer-zoom">
                        <button type="button" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
                          −
                        </button>
                        <span>{zoom}%</span>
                        <button type="button" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
                          +
                        </button>
                      </div>
                      {activeImage?.url ? (
                        <a
                          href={activeImage.url}
                          target="_blank"
                          rel="noreferrer"
                          className="cr-viewer-expand"
                          aria-label="Open full size"
                        >
                          <IconExpand />
                        </a>
                      ) : null}
                    </div>
                    <div className="cr-thumbs-v">
                      {detail.images.map((img, i) => (
                        <button
                          key={img.id}
                          type="button"
                          className={`cr-thumb-v${i === imageIndex ? ' is-active' : ''}`}
                          onClick={() => setImageIndex(i)}
                        >
                          <img src={img.url} alt="" />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

                <div className="cr-ai-block">
                  <h3 className="cr-h3">AI Diagnosis (Top 3)</h3>
                  <ul className="cr-dx-list">
                    {detail.ai.topDiagnoses.map((d, i) => (
                      <li key={d.label}>
                        <div className="cr-dx-head">
                          <span>{d.label}</span>
                          <span className="cr-dx-pct">{pct(d.confidence)}</span>
                        </div>
                        <div className="cr-bar-track">
                          <div
                            className={`cr-bar-fill cr-bar-fill--${i === 0 ? 'primary' : 'orange'}`}
                            style={{ width: pct(d.confidence) }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="cr-summary-toggle"
                    onClick={() => setSummaryOpen((o) => !o)}
                  >
                    AI Summary {summaryOpen ? '▾' : '▸'}
                  </button>
                  {summaryOpen ? (
                    <p className="cr-summary-text">{detail.ai.summary || '—'}</p>
                  ) : null}
                </div>

              <section className="cr-context-block">
                <h3 className="cr-h3">Context Summary</h3>
                <ul className="cr-ctx-list">
                  <li>
                    <span className="cr-ctx-icon">💧</span>
                    <div>
                      <span className="cr-ctx-k">Last Spray</span>
                      <span className="cr-ctx-v">
                        {detail.context.lastSpray
                          ? `${detail.context.lastSpray.product}${detail.context.lastSpray.dosage ? ` · ${detail.context.lastSpray.dosage}` : ''}`
                          : '—'}
                      </span>
                      {detail.context.lastSpray?.appliedAt ? (
                        <span className="cr-ctx-sub">
                          {relativeDays(detail.context.lastSpray.appliedAt) ?? detail.context.lastSpray.at}
                        </span>
                      ) : null}
                    </div>
                  </li>
                  <li>
                    <span className="cr-ctx-icon">🌱</span>
                    <div>
                      <span className="cr-ctx-k">Soil</span>
                      <span className="cr-ctx-v">
                        {detail.context.soil
                          ? `pH ${detail.context.soil.ph ?? '—'} · EC ${detail.context.soil.ec ?? '—'}`
                          : 'No recent report'}
                      </span>
                    </div>
                  </li>
                  <li>
                    <span className="cr-ctx-icon">📋</span>
                    <div>
                      <span className="cr-ctx-k">Previous Issue</span>
                      <span className="cr-ctx-v">
                        {detail.context.previousIssue?.issue ?? '—'}
                        {detail.context.previousIssue?.outcome === 'better' ? (
                          <span className="cr-tag cr-tag--improved cr-ml">Resolved</span>
                        ) : null}
                      </span>
                    </div>
                  </li>
                  <li>
                    <span className="cr-ctx-icon">🌧</span>
                    <div>
                      <span className="cr-ctx-k">Rainfall</span>
                      <span className="cr-ctx-v">{detail.context.rainfallNote ?? '—'}</span>
                    </div>
                  </li>
                </ul>
                <button type="button" className="cr-link-btn">
                  View full history <IconChevronRight />
                </button>
              </section>

              <div className="cr-bottom-row">
                <section className="cr-card">
                  <h3 className="cr-h3">Confidence Breakdown</h3>
                  <ul className="cr-breakdown">
                    {detail.confidenceBreakdown
                      .filter((r) => r.label !== 'Overall')
                      .map((row) => (
                        <li key={row.label}>
                          <span className="cr-bd-label">{row.label}</span>
                          <div className="cr-bar-track cr-bar-track--sm">
                            <div
                              className={`cr-bar-fill ${row.score >= 0.75 ? 'cr-bar-fill--green' : 'cr-bar-fill--orange'}`}
                              style={{ width: pct(row.score) }}
                            />
                          </div>
                          <span className="cr-bd-val">{scoreDec(row.score)}</span>
                        </li>
                      ))}
                  </ul>
                  <p className="cr-overall-conf">
                    Overall Confidence:{' '}
                    <strong className={`cr-conf cr-conf--${confTone(overallConf)}`}>
                      {overallConf != null ? pct(overallConf) : '—'}
                    </strong>
                  </p>
                </section>

                <section className="cr-card">
                  <h3 className="cr-h3">
                    Similar Verified Cases
                    <span className="cr-muted cr-count">
                      {detail.similarCases.length} similar cases found
                    </span>
                  </h3>
                  <div className="cr-similar-row">
                    {detail.similarCases.slice(0, 3).map((c) => (
                      <div key={c.id} className="cr-similar-item">
                        <div className="cr-similar-thumb" />
                        <p className="cr-similar-dap">DAP {c.dap ?? '—'}</p>
                        <p className="cr-similar-dx">{c.issueLabel}</p>
                        <span className="cr-tag cr-tag--improved">Improved</span>
                      </div>
                    ))}
                    {detail.similarCases.length === 0 ? (
                      <p className="cr-muted">No similar verified cases yet.</p>
                    ) : null}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>

        {/* ── Right column (25%) ── */}
        <aside className="cr-col-right">
          {detail ? (
            <>
              <h3 className="cr-h3 cr-actions-title">Agronomist Action</h3>
              {canWrite ? (
                <>
                  <div className="cr-act-grid">
                    <button
                      type="button"
                      className={`cr-act-tile cr-act-tile--approve${action === 'approve_ai' ? ' is-active' : ''}`}
                      onClick={() => setAction('approve_ai')}
                    >
                      <IconThumbsUp />
                      <span>Approve AI</span>
                    </button>
                    <button
                      type="button"
                      className={`cr-act-tile cr-act-tile--correct${action === 'correct_ai' ? ' is-active' : ''}`}
                      onClick={() => setAction('correct_ai')}
                    >
                      <IconPencil />
                      <span>Correct AI</span>
                    </button>
                    <button
                      type="button"
                      className={`cr-act-tile cr-act-tile--partial${action === 'partial_match' ? ' is-active' : ''}`}
                      onClick={() => setAction('partial_match')}
                    >
                      <IconList />
                      <span>Partial Match</span>
                    </button>
                    <button
                      type="button"
                      className={`cr-act-tile cr-act-tile--escalate${action === 'escalate_urgent' ? ' is-active' : ''}`}
                      onClick={() => setAction('escalate_urgent')}
                    >
                      <IconArrowUp />
                      <span>Escalate</span>
                    </button>
                  </div>

                  <label className="cr-field">
                    <span className="cr-field-label">Correct Diagnosis</span>
                    <select
                      className="cr-input"
                      value={correctDiagnosis}
                      onChange={(e) => setCorrectDiagnosis(e.target.value)}
                      disabled={action === 'approve_ai'}
                    >
                      {diagnosisOptions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="cr-field">
                    <span className="cr-field-label">Severity</span>
                    <div className="cr-seg">
                      {(['mild', 'moderate', 'severe'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`cr-seg-btn${severity === s ? ' is-active' : ''}`}
                          onClick={() => setSeverity(s)}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="cr-field">
                    <span className="cr-field-label">Recommendation</span>
                    <textarea
                      className="cr-textarea"
                      rows={3}
                      value={recommendationText}
                      onChange={(e) => setRecommendationText(e.target.value)}
                      placeholder="Farmer-facing recommendation"
                    />
                  </label>

                  <label className="cr-field">
                    <span className="cr-field-label">Dosage</span>
                    <textarea
                      className="cr-textarea"
                      rows={2}
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                    />
                  </label>

                  <label className="cr-field">
                    <span className="cr-field-label">Notes for learning</span>
                    <textarea
                      className="cr-textarea"
                      rows={2}
                      value={notesForLearning}
                      onChange={(e) => setNotesForLearning(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>

                  <div className="cr-btn-row">
                    <button
                      type="button"
                      className="cr-btn cr-btn--outline"
                      disabled={saving || !recommendationText.trim()}
                      onClick={() => void submitReview(false)}
                    >
                      Save Review
                    </button>
                    <button
                      type="button"
                      className="cr-btn cr-btn--primary"
                      disabled={saving || !recommendationText.trim()}
                      onClick={() => void submitReview(true)}
                    >
                      Save &amp; Send Recommendation
                      <IconSend />
                    </button>
                  </div>
                </>
              ) : (
                <p className="cr-muted">Read-only access</p>
              )}

              <div className="cr-impact">
                <IconTrendUp />
                <p>
                  This correction will improve future AI detection for similar symptoms in this
                  region.
                </p>
              </div>

              <section className="cr-timeline-block">
                <h3 className="cr-h3">Case Timeline</h3>
                <ol className="cr-timeline">
                  {detail.timeline.map((ev, i) => (
                    <li key={i} className={ev.status === 'pending' ? 'is-pending' : ''}>
                      <span className={`cr-tl-dot cr-tl-dot--${ev.kind ?? 'pending'}`} />
                      <div>
                        <p className="cr-tl-text">{ev.label}</p>
                        {ev.at ? (
                          <p className="cr-tl-time">
                            {new Date(ev.at).toLocaleTimeString('en-IN', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : (
            <p className="cr-muted cr-pad">Select a case to review.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
