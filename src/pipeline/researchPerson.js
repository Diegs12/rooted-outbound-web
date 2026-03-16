const DISTILL_PROMPT = `You are researching a specific person for a cold email. Given the research below, extract:

1. tenure: How long they've been at this company/role. If not found, say "unknown".
2. personal_hook: ONE specific thing they said, posted, were quoted on, presented at, or a recent career move.
   Rules:
   - Must be SPECIFIC -- not "leads marketing at X" or "works in partnerships"
   - Must reference something they DID, SAID, or a specific MOVE/EVENT
   - Max 15 words
   - Good examples: "spoke on fan engagement at SXSW 2025", "just joined from Nike in January", "posted about rethinking brand activations last month"
   - Bad examples: "leads marketing efforts", "oversees partnerships", "experienced professional"
   - If nothing specific found, return null
3. role_angle: What this person likely cares about based on their title:
   - CMO/VP -> brand ROI, strategy, competitive positioning
   - Director -> execution, activation ideas, proving partnership value
   - Manager -> tactics, deliverables, content pipeline
4. linkedin_url: Their LinkedIn URL if found in the research. null if not found.
5. confidence: "high" if personal_hook is specific and verified, "medium" if we have some info but hook is weak, "low" if we found almost nothing about this person.

Return as JSON with these exact keys. No markdown formatting, just raw JSON.`;

async function perplexityCall(query, systemPrompt) {
  const res = await fetch('/api/perplexity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, systemPrompt }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Perplexity API error ${res.status}`);
  }
  const data = await res.json();
  return data.content;
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

export async function researchPerson(lead, { onThrottle }) {
  const name = `${lead.first_name} ${lead.last_name}`;
  const results = [];

  if (onThrottle) onThrottle();
  results.push(
    await perplexityCall(
      `"${lead.first_name} ${lead.last_name}" "${lead.company}" linkedin interview podcast panel speaker`,
      'Be precise and concise. Return only factual information found in search results.'
    )
  );

  if (onThrottle) onThrottle();
  results.push(
    await perplexityCall(
      `"${lead.first_name} ${lead.last_name}" "${lead.company}" announcement promotion "recently joined" "just joined" "named" "appointed"`,
      'Be precise and concise. Return only factual information found in search results.'
    )
  );

  if (onThrottle) onThrottle();
  results.push(
    await perplexityCall(
      `"${lead.first_name} ${lead.last_name}" "${lead.company}" marketing sponsorship content brand activation`,
      'Be precise and concise. Return only factual information found in search results.'
    )
  );

  const combined = `PERSON: ${name}\nTITLE: ${lead.title}\nCOMPANY: ${lead.company}\n\nSEARCH 1 (LinkedIn/interviews/panels):\n${results[0]}\n\nSEARCH 2 (career moves/announcements):\n${results[1]}\n\nSEARCH 3 (marketing/sponsorship activity):\n${results[2]}`;

  const distilled = await claudeCall(DISTILL_PROMPT, combined);

  let research;
  try {
    const cleaned = distilled.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    research = JSON.parse(cleaned);
  } catch {
    research = {
      tenure: 'unknown',
      personal_hook: null,
      role_angle: 'unknown',
      linkedin_url: null,
      confidence: 'low',
    };
  }

  lead.person_research = research;
  lead.personal_hook = research.personal_hook;
  lead.confidence = research.confidence;
  lead.linkedin_url = lead.linkedin_url || research.linkedin_url;
  return lead;
}
