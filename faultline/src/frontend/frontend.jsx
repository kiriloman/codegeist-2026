// Faultline admin page — Custom UI (React + @forge/bridge invoke).
// Shows every analysis Faultline has produced, with its full ranking, so
// anyone (including judges) can see exactly how the app works.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@forge/bridge';

const App = () => {
  const [analyses, setAnalyses] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke('recent-analyses')
      .then((res) => setAnalyses(res?.analyses || []))
      .catch((e) => setError(String(e?.message || e)));
  }, []);

  if (error) {
    return (
      <div>
        <h2>🔍 Faultline — activity</h2>
        <p className="empty">Could not load analyses: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>🔍 Faultline — activity</h2>
      <p className="sub">
        Every analysis Faultline has produced, with its full ranking — anyone (including
        judges) can see exactly how the app works. Rankings are deterministic: postmortem
        evidence and service dependencies are cited and linked; heuristics are labeled.
      </p>
      {analyses.length === 0 && (
        <p className="empty">
          No analyses yet. Open (or update) a pull request on a repo with the Faultline
          webhook wired, and a guide appears here within seconds.
        </p>
      )}
      {analyses.map((a) => {
        const k = `${a.ws}-${a.repo}-${a.prId}`;
        const isOpen = open === k;
        return (
          <div className="pr" key={k}>
            <h3>
              {(a.ranked?.[0]?.icon) || '⚪'} PR #{a.prId} — {a.title}{' '}
              <small>({a.ws}/{a.repo})</small>
            </h3>
            <button onClick={() => setOpen(isOpen ? null : k)}>
              {isOpen ? 'Hide ranking' : 'Show ranking'}
            </button>
            {isOpen &&
              (a.ranked || []).map((f) => (
                <p className="file" key={f.path}>
                  {f.icon} #{f.rank} <code>{f.path}</code> — {f.score}/100 ({f.tier}) —{' '}
                  {f.reasons.join(' · ')}
                  {(f.evidence || []).length > 0 && (
                    <span className="ev"> — evidence: {f.evidence.map((e) => e.text).join('; ')}</span>
                  )}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
};

createRoot(document.getElementById('root')).render(<App />);
