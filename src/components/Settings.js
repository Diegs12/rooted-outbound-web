import React, { useState } from 'react';
import {
  getAgentMd,
  setAgentMd,
  getPortfolioLink,
  setPortfolioLink,
  resetAgentMd,
} from '../lib/agentMd';
import GmailConnect from './GmailConnect';

export default function Settings({ onClose }) {
  const [agentContent, setAgentContent] = useState(getAgentMd());
  const [portfolio, setPortfolio] = useState(getPortfolioLink());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setAgentMd(agentContent);
    setPortfolioLink(portfolio);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultContent = resetAgentMd();
    setAgentContent(defaultContent);
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="btn-close" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="settings-section">
        <h3>Gmail</h3>
        <GmailConnect />
      </div>

      <div className="settings-section">
        <h3>Portfolio Link</h3>
        <p className="step-desc">Embedded in every email.</p>
        <input
          type="text"
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          className="input-field"
          placeholder="https://..."
        />
      </div>

      <div className="settings-section">
        <h3>Voice Rules (AGENT.md)</h3>
        <p className="step-desc">
          The prompt that controls email tone and structure. Edit to adjust voice.
        </p>
        <textarea
          value={agentContent}
          onChange={(e) => setAgentContent(e.target.value)}
          rows={20}
          className="input-field agent-textarea"
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn-secondary" onClick={handleReset}>
            Reset to Default
          </button>
        </div>
      </div>

      <div className="settings-footer">
        <button className="btn-primary" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
