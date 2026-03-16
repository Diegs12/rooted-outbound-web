import React, { useEffect, useState, useRef } from 'react';
import { runPipeline, STEPS } from '../pipeline/runner';

const STEP_ORDER = [STEPS.ENRICHING, STEPS.TIERING, STEPS.BRAND_RESEARCH, STEPS.PERSON_RESEARCH, STEPS.WRITING_EMAIL];

function StepBadge({ step }) {
  const cls =
    step === STEPS.DONE
      ? 'badge-done'
      : step === STEPS.SKIPPED
      ? 'badge-skipped'
      : step === STEPS.ERROR
      ? 'badge-error'
      : 'badge-active';

  return <span className={`badge ${cls}`}>{step}</span>;
}

export default function ProcessingStep({ leads: initialLeads, onComplete }) {
  const [leads, setLeads] = useState(initialLeads);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ total: initialLeads.length, completed: 0, drafted: 0, skipped: 0, errors: 0 });
  const [running, setRunning] = useState(true);
  const abortRef = useRef(new AbortController());

  useEffect(() => {
    const controller = abortRef.current;

    runPipeline(
      initialLeads,
      (updatedLeads, idx, step, newStats) => {
        setLeads([...updatedLeads]);
        setCurrentIndex(idx);
        setStats({ ...newStats });
      },
      controller.signal
    ).then((finalLeads) => {
      setLeads([...finalLeads]);
      setRunning(false);
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line
  }, []);

  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="step-container">
      <h2>Processing</h2>

      <div className="progress-bar-wrap">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-stats">
        <span>{stats.completed} / {stats.total} leads</span>
        <span>{pct}%</span>
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat-num stat-drafted">{stats.drafted}</span>
          <span className="stat-label">Drafted</span>
        </div>
        <div className="stat">
          <span className="stat-num stat-skipped">{stats.skipped}</span>
          <span className="stat-label">Skipped</span>
        </div>
        <div className="stat">
          <span className="stat-num stat-errors">{stats.errors}</span>
          <span className="stat-label">Errors</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Company</th>
              <th>Title</th>
              <th>Tier</th>
              <th>Step</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <tr key={i} className={i === currentIndex && running ? 'row-active' : ''}>
                <td className="cell-num">{i + 1}</td>
                <td>{lead.first_name} {lead.last_name}</td>
                <td>{lead.company}</td>
                <td className="cell-muted">{lead.title || '...'}</td>
                <td>
                  {lead.tier && (
                    <span className={`tier-badge tier-${lead.tier}`}>T{lead.tier}</span>
                  )}
                </td>
                <td>
                  {lead._step ? (
                    <StepBadge step={lead._step} />
                  ) : (
                    <span className="cell-muted">Waiting</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!running && (
        <button className="btn-primary" onClick={() => onComplete(leads)}>
          Review Emails
        </button>
      )}
    </div>
  );
}
