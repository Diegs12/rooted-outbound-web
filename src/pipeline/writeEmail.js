import { getAgentMd, getLinks } from '../lib/agentMd';

function buildSystemPrompt(triage) {
  const agentMd = getAgentMd();

  const toneGuide = {
    formal: 'Write in a polished but warm tone. Complete sentences, no slang. Think "respected peer at a conference."',
    direct: 'Write in a confident, peer-to-peer tone. Short sentences. Think "quick note from your phone."',
    casual: 'Write in a relaxed, conversational tone. Feels like a text from a colleague. Contractions, short fragments OK.',
  };

  const intentGuide = {
    book_call: 'CTA: "Worth a 20-minute conversation?" You want a meeting.',
    get_reply: 'CTA: "Happy to send 2-3 specific ideas for your [deal name] deal if useful." You want to start a dialogue.',
    nurture: 'CTA: "No ask here, just thought this was worth having on your radar." You are planting a seed, not selling.',
  };

  return `${agentMd}

---

You are generating an outreach email. You will receive:
- Brand research (sponsorship deals + activation gap)
- Person research (personal hook, role angle, confidence)
- Lead details (name, title, company, tier)
- Triage classification (type, intent, tone)
- Previous outreach history (if follow-up)

You MUST return valid JSON with exactly these keys:
{
  "subject": "4-8 word subject line",
  "body": "plain text email body",
  "body_html": "same email as simple HTML paragraphs"
}

No markdown. No code fences. Just raw JSON.

TONE: ${toneGuide[triage?.tone] || toneGuide.direct}

INTENT: ${intentGuide[triage?.intent] || intentGuide.get_reply}

CRITICAL RULES:
- The email must be unique. If someone forwarded this to a colleague at the same company, it should NOT look like a template.
- First line opener depends on what data is available (follow the OPENER STRATEGY in the prompt exactly):
  1. BEST: Reference their personal_hook (something they did/said/posted)
  2. GOOD: Reference their role + tenure ("3 years running media at Academy, you have watched the SEC deal evolve")
  3. FALLBACK: Reference a specific sponsorship deal the brand has, then connect to their role
- NEVER open with a generic title reference like "Saw you're leading partnerships at..."
- ALWAYS start the email body with "Hi {first_name}," on its own line, followed by a blank line, then the opener. This is non-negotiable.
- Max 6 sentences (not counting the greeting and sign-off).
- Include links EMBEDDED in text. NEVER show raw URLs. Use <a> tags with the link title as anchor text.
- Subject line: 4-8 words, no company name, creates curiosity.
- Sign off with just "Diego"
- For body_html: use <p> tags only. No <html>, <head>, or <body> wrapper. Start with "<p>Hi {first_name},</p>" then the rest.
- NEVER use em dashes or double hyphens (--). Rewrite the sentence to use a comma, period, or conjunction instead. No exceptions.`;
}

function stripDashes(str) {
  return str.replace(/[\u2013\u2014]/g, ',').replace(/ -- /g, ', ');
}

async function claudeCall(systemPrompt, userPrompt) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Claude API error ${res.status}`);
  }
  const data = await res.json();
  return data.content;
}

export async function writeEmail(lead) {
  if (lead.status === 'skipped_tier3') return lead;

  const links = getLinks();
  const brandResearch = lead.brand_research || {};
  const personResearch = lead.person_research || {};
  const triage = lead.triage || { type: 'cold', intent: lead.tier === 1 ? 'book_call' : 'get_reply', tone: 'direct' };

  const systemPrompt = buildSystemPrompt(triage);

  // Build follow-up context if applicable
  let followUpContext = '';
  if (triage.type === 'follow_up' && lead.previous_outreach) {
    followUpContext = `\nPREVIOUS OUTREACH:
- Emails sent before: ${lead.previous_outreach.count}
- Last contacted: ${lead.previous_outreach.last_date}
- Last subject line: "${lead.previous_outreach.last_subject}"
- IMPORTANT: This is a follow-up. Do NOT repeat the same pitch. Reference or acknowledge the previous email briefly ("I reached out a few weeks back about...") then offer a NEW angle or piece of value. Keep it shorter than the first email.`;
  }

  let openerStrategy;
  if (triage.type === 'follow_up') {
    openerStrategy = 'FOLLOW-UP: Open by briefly referencing your previous email, then pivot to a new angle or share something specific and valuable (a relevant case study, a new idea for their deal, etc.).';
  } else if (personResearch.personal_hook) {
    openerStrategy = 'HIGH CONFIDENCE: Open with their personal hook, reference what they did/said/posted.';
  } else if (personResearch.tenure && personResearch.tenure !== 'unknown') {
    openerStrategy = `LOW CONFIDENCE + TENURE KNOWN: Open by referencing their specific role at the company and how long they have been in it. Example: "3 years leading media at Academy, you have seen the SEC Nation deal from the inside." Then bridge to the activation gap.`;
  } else {
    openerStrategy = `LOW CONFIDENCE + NO TENURE: Open by referencing the brand's specific sponsorship deal (not their title generically). Example: "Academy's SEC Nation deal has great bones. Presenting sponsor, on-site presence, but the content side is wide open." Then connect to their role.`;
  }

  const userPrompt = `Write ${triage.type === 'follow_up' ? 'a follow-up' : 'a cold'} email for this lead:

NAME: ${lead.first_name} ${lead.last_name}
TITLE: ${lead.title}
COMPANY: ${lead.company}${lead.city ? `\nCITY: ${lead.city}` : ''}${lead.website ? `\nWEBSITE: ${lead.website}` : ''}
TIER: ${lead.tier}
TRIAGE: type=${triage.type}, intent=${triage.intent}, tone=${triage.tone}

BRAND RESEARCH:
- Key sponsorship properties: ${JSON.stringify(brandResearch.key_properties)}
- Current activation content: ${brandResearch.activation_content || 'None found'}
- Activation gap: ${brandResearch.activation_gap || 'Unknown'}
- Brand hook line: ${brandResearch.brand_hook_line || 'None'}

PERSON RESEARCH:
- Tenure: ${personResearch.tenure || 'unknown'}
- Personal hook: ${personResearch.personal_hook || 'NONE'}
- Role angle: ${personResearch.role_angle || 'unknown'}
- Confidence: ${personResearch.confidence || 'low'}
${followUpContext}
OPENER STRATEGY (follow this exactly):
${openerStrategy}

LINKS TO EMBED (use these as hyperlinks with the title as anchor text):
${links.filter(l => l.title && l.url).map(l => `- "${l.title}": ${l.url}`).join('\n') || 'None configured'}`;

  const result = await claudeCall(systemPrompt, userPrompt);

  let email;
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    email = JSON.parse(cleaned);
  } catch {
    lead.status = 'error';
    return lead;
  }

  lead.subject = stripDashes(email.subject);
  lead.body = stripDashes(email.body);
  lead.body_html = stripDashes(email.body_html);
  lead.status = 'drafted';
  return lead;
}
