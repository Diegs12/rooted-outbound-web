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

export async function enrichLead(lead, { onThrottle }) {
  if (lead.title) return lead;

  const query = `"${lead.first_name} ${lead.last_name}" "${lead.company}" current job title role position`;

  if (onThrottle) onThrottle();
  const raw = await perplexityCall(
    query,
    'Find this person\'s current job title at the specified company. Return their exact title if found.'
  );

  const distilled = await claudeCall(
    'Extract the job title from this research. Return ONLY the job title (e.g. "VP Marketing", "Director of Partnerships", "CMO"). If no title is found, return "Unknown".',
    `Person: ${lead.first_name} ${lead.last_name} at ${lead.company}\n\nResearch:\n${raw}`
  );

  lead.title = distilled.trim().replace(/^"|"$/g, '');
  return lead;
}
