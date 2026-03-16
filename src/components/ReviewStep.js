import React, { useState } from 'react';

function EmailCard({ lead, index, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(lead.subject || '');
  const [body, setBody] = useState(lead.body || '');

  if (lead.status !== 'drafted') return null;

  const saveEdits = () => {
    onUpdate(index, { subject, body });
    setEditing(false);
  };

  const confidenceCls =
    lead.confidence === 'high'
      ? 'conf-high'
      : lead.confidence === 'medium'
      ? 'conf-med'
      : 'conf-low';

  return (
    <div className={`email-card ${lead.approved ? '' : 'email-card-rejected'}`}>
      <div className="email-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="email-card-left">
          <span className={`tier-badge tier-${lead.tier}`}>T{lead.tier}</span>
          <span className={`conf-badge ${confidenceCls}`}>{lead.confidence || 'low'}</span>
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
        </div>
      </div>

      {expanded && (
        <div className="email-card-body">
          <div className="email-meta">
            <span>To: {lead.email}</span>
            <span>Title: {lead.title}</span>
            {lead.personal_hook && <span>Hook: {lead.personal_hook}</span>}
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

export default function ReviewStep({ leads, onUpdate, onNext }) {
  const drafted = leads.filter((l) => l.status === 'drafted');
  const approvedCount = drafted.filter((l) => l.approved).length;

  const approveAll = () => {
    drafted.forEach((_, i) => {
      const realIndex = leads.indexOf(drafted[i]);
      onUpdate(realIndex, { approved: true });
    });
  };

  const rejectAll = () => {
    drafted.forEach((_, i) => {
      const realIndex = leads.indexOf(drafted[i]);
      onUpdate(realIndex, { approved: false });
    });
  };

  return (
    <div className="step-container">
      <h2>Review Emails</h2>
      <p className="step-desc">
        {drafted.length} emails drafted. Click to expand, edit, and approve or reject.
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
          />
        ))}
      </div>

      <button className="btn-primary" onClick={onNext} style={{ marginTop: 16 }}>
        Export
      </button>
    </div>
  );
}
