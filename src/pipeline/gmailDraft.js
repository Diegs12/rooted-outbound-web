/* global google */

const GMAIL_TOKEN_KEY = 'rooted_gmail_token';
const CLIENT_ID_KEY = 'rooted_gmail_client_id';

// Default client ID - can be overridden in Settings
const DEFAULT_CLIENT_ID = '';

export function getGmailClientId() {
  return localStorage.getItem(CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
}

export function setGmailClientId(id) {
  localStorage.setItem(CLIENT_ID_KEY, id);
}

export function getGmailToken() {
  const stored = localStorage.getItem(GMAIL_TOKEN_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    // Check expiry
    if (parsed.expires_at && Date.now() > parsed.expires_at) {
      localStorage.removeItem(GMAIL_TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setGmailToken(tokenResponse) {
  const tokenData = {
    access_token: tokenResponse.access_token,
    expires_at: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    scope: tokenResponse.scope,
  };
  localStorage.setItem(GMAIL_TOKEN_KEY, JSON.stringify(tokenData));
  return tokenData;
}

export function clearGmailToken() {
  localStorage.removeItem(GMAIL_TOKEN_KEY);
}

export function isGmailConnected() {
  return !!getGmailToken();
}

export function initGmailAuth(callback) {
  const clientId = getGmailClientId();
  if (!clientId) {
    callback(new Error('No Google Client ID configured. Set it in Settings.'));
    return;
  }

  try {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/gmail.compose',
      callback: (response) => {
        if (response.error) {
          callback(new Error(response.error));
          return;
        }
        const tokenData = setGmailToken(response);
        callback(null, tokenData);
      },
    });
    tokenClient.requestAccessToken();
  } catch (err) {
    callback(err);
  }
}

function makeRawEmail(to, subject, bodyHtml) {
  const emailParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    bodyHtml,
  ];
  const email = emailParts.join('\r\n');
  // Base64url encode
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function createDraft(lead) {
  const token = getGmailToken();
  if (!token) {
    throw new Error('Gmail not connected');
  }

  const raw = makeRawEmail(lead.email, lead.subject, lead.body_html);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail API error: ${err}`);
  }

  return await response.json();
}

export async function createAllDrafts(leads, onProgress) {
  const toDraft = leads.filter((l) => l.approved && l.status === 'drafted');
  let success = 0;
  let fail = 0;

  for (let i = 0; i < toDraft.length; i++) {
    try {
      await createDraft(toDraft[i]);
      success++;
    } catch (err) {
      console.error(`Draft failed for ${toDraft[i].email}:`, err);
      fail++;
    }
    if (onProgress) onProgress(i + 1, toDraft.length, success, fail);
    // Small delay between drafts
    if (i < toDraft.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { success, fail, total: toDraft.length };
}
