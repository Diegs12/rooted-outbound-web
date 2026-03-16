import { getAgentMd, getPortfolioLink } from '../lib/agentMd';

function buildSystemPrompt() {
  const agentMd = getAgentMd();
  return `${agentMd}

---

You are generating a cold email. You will receive:
- Brand research (sponsorship deals + activation gap)
- Person research (personal hook, role angle, confidence)
- Lead details (name, title, company, tier)

You MUST return valid JSON with exactly these keys:
{
  "subject": "4-8 word subject line",
  "body": "plain text email body",
  "body_html": "same email as simple HTML paragraphs"
}

No markdown. No code fences. Just raw JSON.

CRITICAL RULES:
- The email must be unique. If someone forwarded this to a colleague at the same company, it should NOT look like a template.
- First line opener depends on what data is available (follow the OPENER STRATEGY in the prompt exactly):
  1. BEST: Reference their personal_hook (something they did/said/posted)
  2. GOOD: Reference their role + tenure ("3 years running media at Academy, you've watched the SEC deal evolve")
  3. FALLBACK: Reference a specific sponsorship deal the brand has, then connect to their role
- NEVER open with a generic title reference like "Saw you're leading partnerships at..."
- ALWAYS start the email body with "Hi {first_name}," on its own line, followed by a blank line, then the opener. This is non-negotiable.
- Max 6 sentences (not counting the greeting and sign-off).
- Include the portfolio link EMBEDDED in text. NEVER show a raw URL. In the plain text body use "Here's a quick look at what we do (link)." In the HTML body use an <a> tag like: "Here's a quick look at <a href="PORTFOLIO_URL">what we do</a>." The link text should feel natural, like "what we do" or "some of our work" or "a few examples."
- Subject line: 4-8 words, no company name, creates curiosity.
- Sign off with just "Diego"
- For body_html: use <p> tags only. No <html>, <head>, or <body> wrapper. Start with "<p>Hi {first_name},</p>" then the rest. Portfolio link MUST be an <a> tag with descriptive anchor text, NEVER a raw URL.
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

  const portfolioLink = getPortfolioLink();
  const brandResearch = lead.brand_research || {};
  const personResearch = lead.person_research || {};

  const systemPrompt = buildSystemPrompt();

  let openerStrategy;
  if (personResearch.personal_hook) {
    openerStrategy = 'HIGH CONFIDENCE: Open with their personal hook, reference what they did/said/posted.';
  } else if (personResearch.tenure && personResearch.tenure !== 'unknown') {
    openerStrategy = `LOW CONFIDENCE + TENURE KNOWN: Open by referencing their specific role at the company and how long they have been in it. Example: "3 years leading media at Academy, you have seen the SEC Nation deal from the inside." Then bridge to the activation gap.`;
  } else {
    openerStrategy = `LOW CONFIDENCE + NO TENURE: Open by referencing the brand's specific sponsorship deal (not their title generically). Example: "Academy's SEC Nation deal has great bones. Presenting sponsor, on-site presence, but the content side is wide open." Then connect to their role.`;
  }

  const userPrompt = `Write a cold email for this lead:

NAME: ${lead.first_name} ${lead.last_name}
TITLE: ${lead.title}
COMPANY: ${lead.company}
TIER: ${lead.tier} ${lead.tier === 1 ? '(decision maker, CTA: "Worth a 20-minute conversation?")' : '(influencer, CTA: "Happy to send 2-3 specific ideas for your [deal name] deal if useful.")'}

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

OPENER STRATEGY (follow this exactly):
${openerStrategy}

Portfolio link to include: ${portfolioLink}`;

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
