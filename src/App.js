import React, { useState, useCallback } from 'react';
import UploadStep from './components/UploadStep';
import ProcessingStep from './components/ProcessingStep';
import ReviewStep from './components/ReviewStep';
import ExportStep from './components/ExportStep';
import Settings from './components/Settings';
import './App.css';

const STEP_LABELS = ['Upload', 'Process', 'Review', 'Export'];

export default function App() {
  const [step, setStep] = useState(0); // 0=Upload, 1=Processing, 2=Review, 3=Export
  const [leads, setLeads] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  const handleLeadsLoaded = useCallback((parsedLeads) => {
    setLeads(parsedLeads);
    setStep(1);
  }, []);

  const handleTemplateReady = useCallback((parsedLeads, subject, body) => {
    const merged = parsedLeads.map((lead) => {
      const merge = (str) =>
        str
          .replace(/\{first_name\}/g, lead.first_name || '')
          .replace(/\{last_name\}/g, lead.last_name || '')
          .replace(/\{email\}/g, lead.email || '')
          .replace(/\{company\}/g, lead.company || '')
          .replace(/\{title\}/g, lead.title || '')
          .replace(/\{custom_intro\}/g, lead.custom_intro || '');

      const mergedBody = merge(body);
      const mergedSubject = merge(subject);
      const bodyHtml = mergedBody
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
        .join('');

      return {
        ...lead,
        subject: mergedSubject,
        body: mergedBody,
        body_html: bodyHtml,
        status: 'drafted',
        approved: true,
        tier: lead.tier || null,
        _step: 'Done',
      };
    });
    setLeads(merged);
    setStep(2);
  }, []);

  const handleProcessingComplete = useCallback((processedLeads) => {
    setLeads(processedLeads);
    setStep(2);
  }, []);

  const handleLeadUpdate = useCallback((index, updates) => {
    setLeads((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  const handleRestart = useCallback(() => {
    setLeads([]);
    setStep(0);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">Rooted Outbound</h1>
        </div>
        <nav className="stepper">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`stepper-item ${i === step ? 'stepper-active' : ''} ${i < step ? 'stepper-done' : ''}`}>
              <span className="stepper-num">{i + 1}</span>
              <span className="stepper-label">{label}</span>
            </div>
          ))}
        </nav>
        <button className="btn-settings" onClick={() => setShowSettings(!showSettings)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <main className="main">
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}

        {!showSettings && step === 0 && <UploadStep onLeadsLoaded={handleLeadsLoaded} onTemplateReady={handleTemplateReady} />}
        {!showSettings && step === 1 && (
          <ProcessingStep leads={leads} onComplete={handleProcessingComplete} />
        )}
        {!showSettings && step === 2 && (
          <ReviewStep leads={leads} onUpdate={handleLeadUpdate} onNext={() => setStep(3)} />
        )}
        {!showSettings && step === 3 && (
          <ExportStep leads={leads} onRestart={handleRestart} />
        )}
      </main>
    </div>
  );
}
