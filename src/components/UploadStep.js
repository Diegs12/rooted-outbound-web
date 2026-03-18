import React, { useCallback, useState, useRef } from 'react';
import { parseCSV } from '../lib/csvParser';
import { getLinks } from '../lib/agentMd';

const BASE_TAGS = ['{first_name}', '{last_name}', '{name}', '{email}', '{company}', '{title}', '{city}', '{custom_intro}'];

export default function UploadStep({ onLeadsLoaded, onTemplateReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dupeCount, setDupeCount] = useState(0);
  const [mode, setMode] = useState('template');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const fileInputRef = useRef();

  // Track which field + cursor position so clicks on tags don't lose it
  const lastCursor = useRef({ id: 'template-body', start: 0, end: 0 });

  const saveCursor = (id) => {
    const el = document.getElementById(id);
    if (el) {
      lastCursor.current = { id, start: el.selectionStart, end: el.selectionEnd };
    }
  };

  const handleFile = useCallback(async (file) => {
    setError(null);
    setPreview(null);
    try {
      const { leads, dupeCount: dupes } = await parseCSV(file);
      if (leads.length === 0) {
        setError('No valid leads found in CSV. Check your column names.');
        return;
      }
      setPreview(leads);
      setDupeCount(dupes);
    } catch (err) {
      console.error('CSV parse error:', err);
      setError(err.message || 'Failed to parse CSV');
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

  const insertTag = (tag) => {
    const { id, start, end } = lastCursor.current;
    const setter = id === 'template-subject' ? setTemplateSubject : setTemplateBody;
    setter((prev) => prev.slice(0, start) + tag + prev.slice(end));
    const newPos = start + tag.length;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleTagDragStart = (e, tag) => {
    e.dataTransfer.setData('text/plain', tag);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleFieldDrop = (e, fieldId, setter) => {
    e.preventDefault();
    const tag = e.dataTransfer.getData('text/plain');
    if (!tag.startsWith('{')) return;

    // Get drop position from the caret
    const el = document.getElementById(fieldId);
    if (!el) return;

    // For textarea/input, use document.caretPositionFromPoint or fallback to end
    let pos = el.value.length;
    if (document.caretRangeFromPoint) {
      // Approximate: insert at end of current value (browser caret APIs are unreliable for inputs)
      // Better approach: use the saved cursor or append
    }
    // Insert at cursor if field was focused, otherwise append
    if (lastCursor.current.id === fieldId) {
      pos = lastCursor.current.start;
    }

    setter((prev) => prev.slice(0, pos) + tag + prev.slice(pos));
    const newPos = pos + tag.length;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newPos, newPos);
      lastCursor.current = { id: fieldId, start: newPos, end: newPos };
    }, 0);
  };

  const allTags = [...BASE_TAGS, ...getLinks().filter(l => l.title && l.url).map(l => `{${l.title.toLowerCase().replace(/\s+/g, '_')}_link}`)];

  return (
    <div className="step-container">
      <h2>Upload Your Leads</h2>
      <p className="step-desc">
        Export your lead list from Google Sheets as a CSV. Needs columns: Brand, Name, Email. Optional: Role, Location, Website.
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
          <p>Drop your CSV here or click to browse</p>
          <span className="dropzone-hint">Exports from Google Sheets, Excel, or any spreadsheet app work great</span>
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
              className={`mode-btn ${mode === 'template' ? 'mode-btn-active' : ''}`}
              onClick={() => setMode('template')}
            >
              Template
            </button>
            <button
              className={`mode-btn ${mode === 'ai' ? 'mode-btn-active' : ''}`}
              onClick={() => setMode('ai')}
            >
              AI Pipeline
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
                Click or drag merge tags into subject or body to personalize each email.
              </p>
              <div className="merge-tags">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`merge-tag ${tag.endsWith('_link}') ? 'merge-tag-link' : ''}`}
                    draggable
                    onDragStart={(e) => handleTagDragStart(e, tag)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertTag(tag)}
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
                onFocus={() => saveCursor('template-subject')}
                onClick={() => saveCursor('template-subject')}
                onKeyUp={() => saveCursor('template-subject')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFieldDrop(e, 'template-subject', setTemplateSubject)}
                className="input-field"
                placeholder="e.g. Quick idea for {company}"
              />
              <label className="input-label" style={{ marginTop: 12 }}>Body</label>
              <textarea
                id="template-body"
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                onFocus={() => saveCursor('template-body')}
                onClick={() => saveCursor('template-body')}
                onKeyUp={() => saveCursor('template-body')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFieldDrop(e, 'template-body', setTemplateBody)}
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
