import React, { useCallback, useState, useRef } from 'react';
import { parseCSV } from '../lib/csvParser';

export default function UploadStep({ onLeadsLoaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dupeCount, setDupeCount] = useState(0);
  const fileInputRef = useRef();

  const handleFile = useCallback(
    async (file) => {
      setError(null);
      setPreview(null);
      try {
        const { leads, dupeCount: dupes } = await parseCSV(file);
        setPreview(leads);
        setDupeCount(dupes);
      } catch (err) {
        setError(err.message);
      }
    },
    []
  );

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

  return (
    <div className="step-container">
      <h2>Upload Leads</h2>
      <p className="step-desc">
        Drop a CSV with columns: first_name, last_name, email, company. Optional: title, linkedin_url
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
          <button className="btn-primary" onClick={() => onLeadsLoaded(preview)}>
            Start Processing
          </button>
        </>
      )}
    </div>
  );
}
