import React, { useState } from 'react';

function EmailCard({ lead, index, onUpdate, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(lead.subject || '');
  const [body, setBody] = useState(lead.body || '');

  if (lead.status !== 'drafted') return null;

  const saveEdits = () => {
    onUpdate(index, { subject, body });
    setEditing(false);
  };

  return (
    <div className={`email-card ${lead.approved ? '' : 'email-card-rejected'}`}>
      <div className="email-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="email-card-left">
          <strong>{lead.first_name} {lead.last_name}</strong>
          <span className="cell-muted">{lead.company}</span>
        </div>
        <div className="email-card-right">
          <span className="email-subject-preview">{lead.subject}</span>
          <button
            className={`btn-toggle ${lead.approved ? 'btn-toggle-on' : 'btn-toggle-off'}`}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(index, { approved: !lead.approved });
            }}
          >
            {lead.approved ? 'Approved' : 'Rejected'}
          </button>
          <span className="expand-arrow">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </div>

      {expanded && (
        <div className="email-card-body">
          <div className="email-meta">
            <span>To: {lead.email}</span>
            {lead.title && <span>Role: {lead.title}</span>}
          </div>

          {editing ? (
            <div className="email-edit">
              <label>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-field"
              />
              <label>Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="input-field"
              />
              <div className="email-edit-actions">
                <button className="btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={saveEdits}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="email-preview">
                <div className="email-preview-subject">Subject: {lead.subject}</div>
                <div className="email-preview-body">{lead.body}</div>
              </div>
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewStep({ leads, onUpdate, onNext, onBack }) {
  const drafted = leads.filter((l) => l.status === 'drafted');
  const approvedCount = drafted.filter((l) => l.approved).length;

  const approveAll = () => {
    drafted.forEach((lead) => {
      const realIndex = leads.indexOf(lead);
      onUpdate(realIndex, { approved: true });
    });
  };

  const rejectAll = () => {
    drafted.forEach((lead) => {
      const realIndex = leads.indexOf(lead);
      onUpdate(realIndex, { approved: false });
    });
  };

  return (
    <div className="step-container">
      <button className="btn-back" onClick={onBack}>&larr; Back to Upload</button>
      <h2>Review Emails</h2>

      {drafted.length === 0 ? (
        <div className="empty-state">
          <p>No emails were generated.</p>
          <p className="cell-muted">
            Go back and make sure your CSV has leads and your template has a subject and body filled in.
          </p>
          <button className="btn-primary" onClick={onBack} style={{ marginTop: 16 }}>
            &larr; Go Back
          </button>
        </div>
      ) : (
        <>
          <p className="step-desc">
            {drafted.length} email{drafted.length !== 1 ? 's' : ''} ready. Click any row to preview. Edit or reject before exporting.
          </p>

          <div className="review-actions">
            <span>
              {approvedCount} / {drafted.length} approved
            </span>
            <div>
              <button className="btn-secondary" onClick={rejectAll}>
                Reject All
              </button>
              <button className="btn-primary" onClick={approveAll} style={{ marginLeft: 8 }}>
                Approve All
              </button>
            </div>
          </div>

          <div className="email-cards">
            {leads.map((lead, i) => (
              <EmailCard
                key={i}
                lead={lead}
                index={i}
                onUpdate={(idx, updates) => onUpdate(idx, updates)}
                defaultExpanded={i === 0 && drafted[0] === lead}
              />
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={onNext}
            disabled={approvedCount === 0}
            style={{ marginTop: 16 }}
          >
            Export {approvedCount} Email{approvedCount !== 1 ? 's' : ''}
          </button>
        </>
      )}
    </div>
  );
}
