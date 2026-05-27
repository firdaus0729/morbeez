import { useCallback, useEffect, useState } from 'react';
import { canFieldWrite, clearToken, fetchFieldSession, getToken } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { VisitPage } from './pages/VisitPage';

const fieldApi = '/console/api/v1/os/field';

export type Farmer = {
  id: string;
  phone: string | null;
  name: string;
  district: string | null;
  village: string | null;
};

export type Block = {
  id: string;
  name: string;
  cropType: string;
  plotLabel: string | null;
  dap: number | null;
};

export type Question = {
  id: string;
  questionKey: string;
  labelEn: string;
  labelMl: string | null;
  inputType: string;
  options: string[];
  required: boolean;
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [email, setEmail] = useState('');
  const [screen, setScreen] = useState<'home' | 'visit' | 'done'>('home');
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [lastFindingId, setLastFindingId] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    if (!getToken()) {
      setAuthed(false);
      setReady(true);
      return;
    }
    try {
      const session = await fetchFieldSession();
      setEmail(session.admin.email);
      setCanWrite(canFieldWrite(session.modules));
      setAuthed(true);
    } catch {
      clearToken();
      setAuthed(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  function startVisit(f: Farmer, b: Block) {
    setFarmer(f);
    setBlock(b);
    setScreen('visit');
  }

  function visitDone(findingId: string) {
    setLastFindingId(findingId);
    setScreen('done');
  }

  function resetFlow() {
    setFarmer(null);
    setBlock(null);
    setLastFindingId(null);
    setScreen('home');
  }

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return <LoginPage onSuccess={() => bootstrap()} />;
  }

  if (screen === 'visit' && farmer && block) {
    return (
      <VisitPage
        farmer={farmer}
        block={block}
        canWrite={canWrite}
        onBack={resetFlow}
        onDone={visitDone}
      />
    );
  }

  if (screen === 'done') {
    return (
      <div className="flex min-h-full flex-col bg-emerald-50 p-6">
        <div className="mx-auto mt-12 max-w-md rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">✓</p>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Visit saved</h1>
          <p className="mt-2 text-sm text-slate-600">
            Field finding recorded. Agronomist hub can review and submit for approval.
          </p>
          {lastFindingId ? (
            <p className="mt-2 font-mono text-xs text-slate-400">{lastFindingId}</p>
          ) : null}
          <button
            type="button"
            onClick={resetFlow}
            className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white"
          >
            New visit
          </button>
        </div>
      </div>
    );
  }

  return (
    <HomePage
      email={email}
      canWrite={canWrite}
      fieldApi={fieldApi}
      onStartVisit={startVisit}
      onLogout={() => {
        clearToken();
        setAuthed(false);
      }}
    />
  );
}
