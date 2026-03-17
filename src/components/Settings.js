import React, { useState } from 'react';
import {
  getAgentMd,
  setAgentMd,
  getLinks,
  setLinks,
  resetAgentMd,
} from '../lib/agentMd';
import GmailConnect from './GmailConnect';

export default function Settings({ onClose }) {
  const [agentContent, setAgentContent] = useState(getAgentMd());
  const [links, setLinksState] = useState(getLinks());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setAgentMd(agentContent);
    setLinks(links.filter((l) => l.title.trim() && l.url.trim()));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultContent = resetAgentMd();
    setAgentContent(defaultContent);
  };

  const addLink = () => {
    setLinksState([...links, { title: '', url: '' }]);
  };

  const updateLink = (index, field, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinksState(updated);
  };

  const removeLink = (index) => {
    setLinksState(links.filter((_, i) => i !== index));
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
        <h3>Links</h3>
        <p className="step-desc">
          Named links for emails. The title becomes the anchor text and a merge tag.
          E.g. title "portfolio" creates <code>{'{portfolio_link}'}</code>
        </p>
        <div className="links-list">
          {links.map((link, i) => (
            <div key={i} className="link-row">
              <input
                type="text"
                value={link.title}
                onChange={(e) => updateLink(i, 'title', e.target.value)}
                className="input-field link-title-input"
                placeholder="Title (e.g. portfolio)"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
                className="input-field link-url-input"
                placeholder="https://..."
              />
              <button className="btn-remove" onClick={() => removeLink(i)}>
                &times;
              </button>
            </div>
          ))}
        </div>
        <button className="btn-secondary" onClick={addLink} style={{ marginTop: 8 }}>
          + Add Link
        </button>
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
