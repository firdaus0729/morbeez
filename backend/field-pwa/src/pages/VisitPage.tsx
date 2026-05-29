import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Block, Farmer, Question } from '../App';

const fieldApi = '/morbeez-staff/api/v1/os/field';

type Props = {
  farmer: Farmer;
  block: Block;
  canWrite: boolean;
  onBack: () => void;
  onDone: (findingId: string) => void;
};

type PhotoPreview = { file: File; preview: string };

async function fileToBase64(file: File): Promise<{ filename: string; mimeType: string; dataBase64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1]! : result;
      resolve({
        filename: file.name,
        mimeType: file.type || 'image/jpeg',
        dataBase64: base64,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function VisitPage({ farmer, block, canWrite, onBack, onDone }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState('');
  const [diseasePest, setDiseasePest] = useState('');
  const [diseaseTone, setDiseaseTone] = useState<'healthy' | 'warning' | 'danger'>('warning');
  const [actionTaken, setActionTaken] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ ok: boolean; questions: Question[] }>(
      `${fieldApi}/questionnaire/${encodeURIComponent(block.cropType)}`
    )
      .then((d) => setQuestions(d.questions ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load form'))
      .finally(() => setLoading(false));
  }, [block.cropType]);

  function setAnswer(key: string, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next = files.slice(0, 8 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((p) => [...p, ...next].slice(0, 8));
    e.target.value = '';
  }

  function removePhoto(i: number) {
    setPhotos((p) => {
      const copy = [...p];
      URL.revokeObjectURL(copy[i]!.preview);
      copy.splice(i, 1);
      return copy;
    });
  }

  async function submit() {
    if (!canWrite) return;
    for (const q of questions) {
      if (q.required && !answers[q.questionKey]?.trim()) {
        setError(`Required: ${q.labelEn}`);
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      const photoPayload = await Promise.all(photos.map((p) => fileToBase64(p.file)));
      const answerRows = questions.map((q) => ({
        questionKey: q.questionKey,
        label: q.labelEn,
        value: answers[q.questionKey] ?? '',
      }));

      const d = await api<{ ok: boolean; finding: { id: string } }>(`${fieldApi}/visits`, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: farmer.id,
          blockId: block.id,
          blockName: block.name,
          cropType: block.cropType,
          observations: observations.trim() || undefined,
          diseasePest: diseasePest.trim() || undefined,
          diseaseTone,
          actionTaken: actionTaken.trim() || undefined,
          answers: answerRows,
          photos: photoPayload.length ? photoPayload : undefined,
        }),
      });
      onDone(d.finding.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" onClick={onBack} className="text-sm text-emerald-700">
          ← Cancel
        </button>
        <h1 className="mt-1 text-lg font-semibold">{block.name}</h1>
        <p className="text-sm text-slate-600">
          {farmer.name} · {block.cropType}
        </p>
      </header>

      <main className="flex-1 space-y-6 p-4 pb-28">
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading questionnaire…</p>
        ) : (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-medium text-slate-900">Visit checklist</h2>
            {questions.map((q) => (
              <label key={q.id} className="block text-sm">
                <span className="text-slate-700">
                  {q.labelEn}
                  {q.required ? <span className="text-red-500"> *</span> : null}
                </span>
                {q.inputType === 'select' && q.options.length > 0 ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base"
                    value={answers[q.questionKey] ?? ''}
                    onChange={(e) => setAnswer(q.questionKey, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {q.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : q.inputType === 'boolean' ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base"
                    value={answers[q.questionKey] ?? ''}
                    onChange={(e) => setAnswer(q.questionKey, e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                ) : q.inputType === 'number' ? (
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base"
                    value={answers[q.questionKey] ?? ''}
                    onChange={(e) => setAnswer(q.questionKey, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base"
                    value={answers[q.questionKey] ?? ''}
                    onChange={(e) => setAnswer(q.questionKey, e.target.value)}
                  />
                )}
              </label>
            ))}
          </section>
        )}

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Observations</h2>
          <textarea
            rows={4}
            placeholder="What you see in the field…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
          <input
            type="text"
            placeholder="Disease / pest (if any)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
            value={diseasePest}
            onChange={(e) => setDiseasePest(e.target.value)}
          />
          <label className="block text-sm text-slate-600">
            Severity
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base"
              value={diseaseTone}
              onChange={(e) => setDiseaseTone(e.target.value as typeof diseaseTone)}
            >
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </select>
          </label>
          <input
            type="text"
            placeholder="Action taken on visit (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Photos</h2>
          <p className="mt-1 text-xs text-slate-500">Up to 8 images · online upload</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={p.preview} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 8 ? (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 text-2xl text-emerald-600">
                +
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onPhotoPick}
                />
              </label>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">
        <button
          type="button"
          disabled={saving || !canWrite || loading}
          onClick={submit}
          className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Uploading…' : 'Submit field visit'}
        </button>
      </footer>
    </div>
  );
}
