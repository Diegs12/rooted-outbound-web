const TRIAGE_PROMPT = `You are an outreach strategist. Given the lead data below, classify this person on three axes for a cold email campaign from a sports sponsorship activation agency.

Return JSON with exactly these keys:

{
  "type": "cold" | "follow_up",
  "intent": "book_call" | "get_reply" | "nurture",
  "tone": "formal" | "direct" | "casual",
  "reasoning": "1 sentence explaining your classification"
}

CLASSIFICATION RULES:

TYPE:
- "cold" = no previous contact (outreach_type is "cold")
- "follow_up" = we emailed them before (outreach_type is "follow_up"). The email should acknowledge the previous outreach without being pushy.

INTENT (what we want from this specific person):
- "book_call" = Tier 1 decision makers (CMO, VP, Head of) with high confidence research. We have a strong hook and they can say yes.
- "get_reply" = Tier 2 influencers, OR Tier 1 with low confidence. We want to start a conversation, not push for a meeting yet.
- "nurture" = Follow-up leads who didn't reply last time, OR leads where brand research shows low sponsorship activity. Don't ask for anything, just share value.

TONE (how to write to this person):
- "formal" = C-suite (CMO, Chief), VP level, or brands with very corporate culture (Fortune 500, banking, insurance)
- "direct" = Directors, Heads of departments, mid-market brands. Confident, peer-to-peer.
- "casual" = Managers, coordinators, or brands in lifestyle/entertainment/sports. Sounds like a text from a colleague.

No markdown. No code fences. Just raw JSON.`;

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

export async function triageLead(lead) {
  if (lead.status === 'skipped_tier3') return lead;

  const name = `${lead.first_name} ${lead.last_name}`;
  const personResearch = lead.person_research || {};
  const brandResearch = lead.brand_research || {};

  const userPrompt = `LEAD:
Name: ${name}
Title: ${lead.title}
Company: ${lead.company}
Tier: ${lead.tier}

OUTREACH HISTORY:
Type: ${lead.outreach_type || 'cold'}
${lead.previous_outreach
    ? `Previous emails sent: ${lead.previous_outreach.count}
Last contacted: ${lead.previous_outreach.last_date}
Last subject: "${lead.previous_outreach.last_subject}"`
    : 'No previous contact.'}

RESEARCH SUMMARY:
Person confidence: ${lead.confidence || 'low'}
Personal hook: ${lead.personal_hook || 'NONE'}
Role angle: ${personResearch.role_angle || 'unknown'}
Brand has sponsorship deals: ${brandResearch.low_confidence ? 'NO' : 'YES'}
Brand hook: ${brandResearch.brand_hook_line || 'None'}`;

  try {
    const result = await claudeCall(TRIAGE_PROMPT, userPrompt);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const triage = JSON.parse(cleaned);

    lead.triage = {
      type: triage.type || lead.outreach_type || 'cold',
      intent: triage.intent || 'get_reply',
      tone: triage.tone || 'direct',
      reasoning: triage.reasoning || '',
    };
  } catch (err) {
    console.error(`[TRIAGE] Error for ${name}:`, err);
    lead.triage = {
      type: lead.outreach_type || 'cold',
      intent: lead.tier === 1 ? 'book_call' : 'get_reply',
      tone: 'direct',
      reasoning: 'Fallback: triage failed',
    };
  }

  return lead;
}
