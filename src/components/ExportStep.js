import React, { useState } from 'react';
import { exportCSV } from '../lib/csvExport';
import { createAllDrafts, isGmailConnected } from '../pipeline/gmailDraft';

export default function ExportStep({ leads, onRestart }) {
  const [gmailProgress, setGmailProgress] = useState(null);
  const [gmailResult, setGmailResult] = useState(null);
  const [gmailRunning, setGmailRunning] = useState(false);

  const drafted = leads.filter((l) => l.status === 'drafted');
  const approved = drafted.filter((l) => l.approved);
  const skipped = leads.filter((l) => l.status === 'skipped_tier3');
  const errors = leads.filter((l) => l.status === 'error');
  const gmailConnected = isGmailConnected();

  const handleDownloadCSV = () => {
    exportCSV(leads);
  };

  const handleCreateDrafts = async () => {
    setGmailRunning(true);
    setGmailProgress({ current: 0, total: approved.length });

    const result = await createAllDrafts(leads, (current, total, success, fail) => {
      setGmailProgress({ current, total, success, fail });
    });

    setGmailResult(result);
    setGmailRunning(false);
  };

  return (
    <div className="step-container">
      <h2>Export</h2>

      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat">
          <span className="stat-num stat-drafted">{approved.length}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat">
          <span className="stat-num">{drafted.length - approved.length}</span>
          <span className="stat-label">Rejected</span>
        </div>
        <div className="stat">
          <span className="stat-num stat-skipped">{skipped.length}</span>
          <span className="stat-label">Wrong Role</span>
        </div>
        <div className="stat">
          <span className="stat-num stat-errors">{errors.length}</span>
          <span className="stat-label">Errors</span>
        </div>
      </div>

      <div className="export-section">
        <h3>Download CSV</h3>
        <p className="step-desc">Full enriched CSV with all research, emails, and status columns.</p>
        <button className="btn-primary" onClick={handleDownloadCSV}>
          Download CSV
        </button>
      </div>

      <div className="export-section">
        <h3>Create Gmail Drafts</h3>
        {!gmailConnected ? (
          <p className="step-desc">
            Connect Gmail in Settings first to create drafts.
          </p>
        ) : (
          <>
            <p className="step-desc">
              Create drafts for {approved.length} approved emails in your Gmail account.
            </p>
            {!gmailResult && (
              <button
                className="btn-primary"
                onClick={handleCreateDrafts}
                disabled={gmailRunning || approved.length === 0}
              >
                {gmailRunning ? 'Creating...' : `Create ${approved.length} Drafts`}
              </button>
            )}
          </>
        )}

        {gmailProgress && (
          <div style={{ marginTop: 12 }}>
            <div className="progress-bar-wrap">
              <div
                className="progress-bar"
                style={{
                  width: `${gmailProgress.total > 0 ? (gmailProgress.current / gmailProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="progress-stats">
              <span>{gmailProgress.current} / {gmailProgress.total}</span>
            </div>
          </div>
        )}

        {gmailResult && (
          <div className="gmail-result">
            {gmailResult.success} drafts created
            {gmailResult.fail > 0 && `, ${gmailResult.fail} failed`}.
            Check your Gmail Drafts folder.
          </div>
        )}
      </div>

      <button className="btn-secondary" onClick={onRestart} style={{ marginTop: 32 }}>
        Start New Batch
      </button>
    </div>
  );
}
