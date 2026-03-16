import React, { useCallback, useState, useRef } from 'react';
import { parseCSV } from '../lib/csvParser';

const MERGE_TAGS = ['{first_name}', '{last_name}', '{email}', '{company}', '{title}', '{city}', '{custom_intro}'];

export default function UploadStep({ onLeadsLoaded, onTemplateReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dupeCount, setDupeCount] = useState(0);
  const [mode, setMode] = useState('ai'); // 'ai' or 'template'
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const fileInputRef = useRef();

  const handleFile = useCallback(async (file) => {
    setError(null);
    setPreview(null);
    try {
      const { leads, dupeCount: dupes } = await parseCSV(file);
      setPreview(leads);
      setDupeCount(dupes);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const insertTag = (tag, setter, inputId) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setter((prev) => prev.slice(0, start) + tag + prev.slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  return (
    <div className="step-container">
      <h2>Upload Leads</h2>
      <p className="step-desc">
        Drop a CSV with columns: Brand, First Name, Last Name, Email. Optional: Role, Location, Website, Custom Intro
      </p>

      <div
        className={`dropzone ${dragOver ? 'dropzone-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="dropzone-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>Drop CSV here or click to browse</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {preview && (
        <>
          <div className="preview-header">
            <span>
              {preview.length} leads loaded
              {dupeCount > 0 && ` (${dupeCount} duplicates removed)`}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((lead, i) => (
                  <tr key={i}>
                    <td className="cell-num">{i + 1}</td>
                    <td>{lead.first_name} {lead.last_name}</td>
                    <td className="cell-email">{lead.email}</td>
                    <td>{lead.company}</td>
                    <td className="cell-muted">{lead.title || 'Will discover'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <p className="cell-muted" style={{ textAlign: 'center', padding: '8px' }}>
                ...and {preview.length - 50} more
              </p>
            )}
          </div>

          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'ai' ? 'mode-btn-active' : ''}`}
              onClick={() => setMode('ai')}
            >
              AI Pipeline
            </button>
            <button
              className={`mode-btn ${mode === 'template' ? 'mode-btn-active' : ''}`}
              onClick={() => setMode('template')}
            >
              Template
            </button>
          </div>

          {mode === 'ai' && (
            <p className="step-desc" style={{ marginTop: 12 }}>
              Full pipeline: enrich titles, research brands + people, AI-write unique emails per lead.
            </p>
          )}

          {mode === 'template' && (
            <div className="template-section">
              <p className="step-desc" style={{ marginTop: 0 }}>
                Paste your subject and body. Use merge tags to personalize. Add a <code>custom_intro</code> column in your CSV for per-lead openers.
              </p>
              <div className="merge-tags">
                {MERGE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    className="merge-tag"
                    onClick={() => insertTag(tag, setTemplateBody, 'template-body')}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <label className="input-label">Subject</label>
              <input
                id="template-subject"
                type="text"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                className="input-field"
                placeholder="e.g. Quick idea for {company}"
              />
              <label className="input-label" style={{ marginTop: 12 }}>Body</label>
              <textarea
                id="template-body"
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={10}
                className="input-field"
                placeholder={`Hi {first_name},\n\nYour email body here...\n\nDiego`}
              />
            </div>
          )}

          {mode === 'ai' && (
            <button className="btn-primary" onClick={() => onLeadsLoaded(preview)}>
              Start Processing
            </button>
          )}

          {mode === 'template' && (
            <button
              className="btn-primary"
              disabled={!templateSubject.trim() || !templateBody.trim()}
              onClick={() => onTemplateReady(preview, templateSubject, templateBody)}
            >
              Merge &amp; Review
            </button>
          )}
        </>
      )}
    </div>
  );
}
