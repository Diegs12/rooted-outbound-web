import React, { useState } from 'react';
import {
  isGmailConnected,
  getGmailToken,
  clearGmailToken,
  initGmailAuth,
  getGmailClientId,
  setGmailClientId,
} from '../pipeline/gmailDraft';

export default function GmailConnect() {
  const [connected, setConnected] = useState(isGmailConnected());
  const [clientId, setClientIdState] = useState(getGmailClientId());
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setError(null);
    setLoading(true);
    initGmailAuth((err, tokenData) => {
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setConnected(true);
    });
  };

  const handleDisconnect = () => {
    clearGmailToken();
    setConnected(false);
  };

  const handleSaveClientId = () => {
    setGmailClientId(clientId);
    setError(null);
  };

  if (connected) {
    const token = getGmailToken();
    return (
      <div className="gmail-status">
        <div className="gmail-connected">
          <span className="gmail-dot" />
          Connected
          {token?.expires_at && (
            <span className="cell-muted" style={{ marginLeft: 8 }}>
              Expires: {new Date(token.expires_at).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button className="btn-secondary" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="gmail-connect">
      <div style={{ marginBottom: 12 }}>
        <label className="input-label">Google OAuth Client ID</label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientIdState(e.target.value)}
          className="input-field"
          placeholder="xxxx.apps.googleusercontent.com"
        />
        <button
          className="btn-secondary"
          onClick={handleSaveClientId}
          style={{ marginTop: 4 }}
        >
          Save Client ID
        </button>
      </div>
      <button className="btn-primary" onClick={handleConnect} disabled={loading || !clientId}>
        {loading ? 'Connecting...' : 'Connect Gmail'}
      </button>
      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
