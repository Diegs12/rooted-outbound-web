const SIGNAL_CHECK_PROMPT = `You are evaluating initial research results for a person. Determine if there is enough signal to write a personalized cold email, or if a different search angle is needed.

Given the search results, return JSON:
{
  "signal_strength": "strong" | "weak" | "none",
  "personal_hook": "specific thing they did/said (max 15 words)" or null,
  "tenure": "how long at company" or "unknown",
  "linkedin_url": "URL" or null,
  "next_query": "a better search query to try" or null
}

RULES:
- "strong" = found a specific personal hook (conference talk, career move, published quote, social post)
- "weak" = found some info about them but nothing hook-worthy (just job title confirmations, generic mentions)
- "none" = search returned nothing relevant about this specific person
- If signal is "strong", set next_query to null (no more research needed)
- If signal is "weak" or "none", suggest a DIFFERENT search angle in next_query (e.g. try their name without company, try their LinkedIn directly, try industry events)

No markdown. No code fences. Just raw JSON.`;

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
  const allResults = [];

  // Search 1: LinkedIn, interviews, panels
  if (onThrottle) onThrottle();
  const result1 = await perplexityCall(
    `"${lead.first_name} ${lead.last_name}" "${lead.company}" linkedin interview podcast panel speaker`,
    'Be precise and concise. Return only factual information found in search results.'
  );
  allResults.push({ label: 'LinkedIn/interviews/panels', text: result1 });

  // Adaptive: evaluate signal strength after first search
  const signalRaw = await claudeCall(
    SIGNAL_CHECK_PROMPT,
    `PERSON: ${name}\nTITLE: ${lead.title}\nCOMPANY: ${lead.company}\n\nSEARCH RESULTS:\n${result1}`
  );

  let signal;
  try {
    signal = JSON.parse(signalRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch {
    signal = { signal_strength: 'weak', next_query: null };
  }

  if (signal.signal_strength === 'strong') {
    // Strong signal: do one more targeted search, skip generic third
    if (onThrottle) onThrottle();
    const result2 = await perplexityCall(
      `"${lead.first_name} ${lead.last_name}" "${lead.company}" announcement promotion "recently joined" "just joined" "named" "appointed"`,
      'Be precise and concise. Return only factual information found in search results.'
    );
    allResults.push({ label: 'career moves/announcements', text: result2 });
  } else {
    // Weak or no signal: do standard second + adaptive third search
    if (onThrottle) onThrottle();
    const result2 = await perplexityCall(
      `"${lead.first_name} ${lead.last_name}" "${lead.company}" announcement promotion "recently joined" "just joined" "named" "appointed"`,
      'Be precise and concise. Return only factual information found in search results.'
    );
    allResults.push({ label: 'career moves/announcements', text: result2 });

    const q3 = signal.next_query || `"${lead.first_name} ${lead.last_name}" "${lead.company}" marketing sponsorship content brand activation`;
    if (onThrottle) onThrottle();
    const result3 = await perplexityCall(q3, 'Be precise and concise. Return only factual information found in search results.');
    allResults.push({ label: signal.next_query ? 'adaptive search' : 'marketing/sponsorship activity', text: result3 });
  }

  // Distill all results
  const combined = `PERSON: ${name}\nTITLE: ${lead.title}\nCOMPANY: ${lead.company}\n\n${allResults.map((r, i) => `SEARCH ${i + 1} (${r.label}):\n${r.text}`).join('\n\n')}`;

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

  // Use early signal data as fallback
  if (!research.personal_hook && signal.personal_hook) {
    research.personal_hook = signal.personal_hook;
    if (research.confidence === 'low') research.confidence = 'medium';
  }
  if (research.tenure === 'unknown' && signal.tenure && signal.tenure !== 'unknown') {
    research.tenure = signal.tenure;
  }
  if (!research.linkedin_url && signal.linkedin_url) {
    research.linkedin_url = signal.linkedin_url;
  }

  research.searches_used = allResults.length;

  lead.person_research = research;
  lead.personal_hook = research.personal_hook;
  lead.confidence = research.confidence;
  lead.linkedin_url = lead.linkedin_url || research.linkedin_url;
  return lead;
}
