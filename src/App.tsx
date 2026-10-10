import {useState} from 'react';
import {Dashboard} from './components/Dashboard';
import {CaseRunner} from './components/CaseRunner';
import {caseById} from './data/cases';
import {loadAttempts, saveAttempt, type Attempt} from './lib/progress';

type Route = {name: 'dashboard'} | {name: 'case'; caseId: string; seed: number};

export default function App() {
  const [route, setRoute] = useState<Route>({name: 'dashboard'});
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts());

  const start = (caseId: string) => setRoute({name: 'case', caseId, seed: Math.floor(Math.random() * 1e9)});

  if (route.name === 'case') {
    const c = caseById(route.caseId);
    if (c) {
      return (
        <CaseRunner
          key={`${route.caseId}-${route.seed}`}
          clinicalCase={c}
          seed={route.seed}
          onExit={() => setRoute({name: 'dashboard'})}
          onRetry={() => start(route.caseId)}
          onComplete={score =>
            setAttempts(saveAttempt({caseId: c.id, score, seed: route.seed, date: new Date().toISOString()}))
          }
        />
      );
    }
  }
  return <Dashboard attempts={attempts} onStart={start} onAttemptsChange={setAttempts} />;
}
