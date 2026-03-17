import React, { useState } from 'react';
import { exportCSV } from '../lib/csvExport';
import { createAllDrafts, isGmailConnected } from '../pipeline/gmailDraft';

export default function ExportStep({ leads, onRestart, onBack }) {
  const [gmailProgress, setGmailProgress] = useState(null);
  const [gmailResult, setGmailResult] = useState(null);
  const [gmailRunning, setGmailRunning] = useState(false);
  const [csvDownloaded, setCsvDownloaded] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const drafted = leads.filter((l) => l.status === 'drafted');
  const approved = drafted.filter((l) => l.approved);
  const gmailConnected = isGmailConnected();

  const handleDownloadCSV = () => {
    exportCSV(leads);
    setCsvDownloaded(true);
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
      <button className="btn-back" onClick={onBack}>&larr; Back to Review</button>
      <h2>Export</h2>
      <p className="step-desc">
        {approved.length} approved email{approved.length !== 1 ? 's' : ''} ready to export.
      </p>

      <div className="export-section">
        <h3>Download CSV</h3>
        <p className="step-desc">Get a spreadsheet with all leads, emails, and research data.</p>
        <button className="btn-primary" onClick={handleDownloadCSV}>
          {csvDownloaded ? 'Downloaded! Click to download again' : 'Download CSV'}
        </button>
      </div>

      <div className="export-section">
        <h3>Create Gmail Drafts</h3>
        {!gmailConnected ? (
          <div>
            <p className="step-desc">
              Gmail is not connected. Go to Settings (gear icon, top right) to connect your Gmail account.
            </p>
          </div>
        ) : (
          <>
            <p className="step-desc">
              This will create {approved.length} draft{approved.length !== 1 ? 's' : ''} in your Gmail. You can review and send them from Gmail.
            </p>
            {!gmailResult && (
              <button
                className="btn-primary"
                onClick={handleCreateDrafts}
                disabled={gmailRunning || approved.length === 0}
              >
                {gmailRunning ? 'Creating drafts...' : `Create ${approved.length} Draft${approved.length !== 1 ? 's' : ''} in Gmail`}
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
            {gmailResult.success} draft{gmailResult.success !== 1 ? 's' : ''} created.
            {gmailResult.fail > 0 && ` ${gmailResult.fail} failed.`}
            {' '}Open Gmail and check your Drafts folder.
          </div>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        {!confirmRestart ? (
          <button className="btn-secondary" onClick={() => setConfirmRestart(true)}>
            Start New Batch
          </button>
        ) : (
          <div className="confirm-restart">
            <span>This will clear all current leads. Are you sure?</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-secondary" onClick={() => setConfirmRestart(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={onRestart}>
                Yes, start over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
