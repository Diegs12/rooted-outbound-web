const DISTILL_PROMPT = `You are analyzing a brand's sports sponsorship presence. Given the research below, extract:

1. key_properties: List of specific sponsorship deals (deal name, sports property, year, details). Be specific.
2. activation_content: What original content they ARE currently making from these sponsorships (video, social, experiential, etc.)
3. activation_gap: What fan-facing content is MISSING. Be specific about what they could be doing but aren't.
4. brand_hook_line: ONE sentence (max 25 words) summarizing the gap. This will be used in a cold email.
   Format: "Right now [what they're doing], but [what's missing]."
   Example: "Right now your MLB deal shows up as broadcast signage, but there's no original content showing fans what that partnership actually looks like."
5. low_confidence: true if no sponsorship deals were found, false otherwise.

Return as JSON with these exact keys. No markdown formatting, just raw JSON.`;

// In-memory brand cache (persists for the duration of a pipeline run)
const brandCache = new Map();

export function clearBrandCache() {
  brandCache.clear();
}

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

export async function researchBrand(company, { onThrottle, website }) {
  const cacheKey = company.toLowerCase().trim();
  if (brandCache.has(cacheKey)) {
    return brandCache.get(cacheKey);
  }

  const site = website ? ` site:${website.replace(/^https?:\/\//, '')}` : '';

  // Three sequential calls (each needs 6.5s throttle for Perplexity rate limit)
  if (onThrottle) onThrottle();
  const sponsorships = await perplexityCall(
    `"${company}"${site} sports sponsorship deal partner 2024 2025 2026`,
    'Be precise and concise. Return only factual information found in search results.'
  );

  if (onThrottle) onThrottle();
  const activation = await perplexityCall(
    `"${company}" sports partnership content activation marketing campaign`,
    'Be precise and concise. Return only factual information found in search results.'
  );

  if (onThrottle) onThrottle();
  const social = await perplexityCall(
    `"${company}" instagram tiktok sports content social media fan engagement`,
    'Be precise and concise. Return only factual information found in search results.'
  );

  const combined = `BRAND: ${company}\n\nSPONSORSHIP DEALS RESEARCH:\n${sponsorships}\n\nACTIVATION & CONTENT RESEARCH:\n${activation}\n\nSOCIAL MEDIA & FAN CONTENT RESEARCH:\n${social}`;

  const distilled = await claudeCall(DISTILL_PROMPT, combined);

  let research;
  try {
    const cleaned = distilled.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    research = JSON.parse(cleaned);
  } catch {
    research = {
      key_properties: 'Parse error - review manually',
      activation_content: 'Parse error',
      activation_gap: 'Parse error',
      brand_hook_line: 'Parse error',
      low_confidence: true,
    };
  }

  brandCache.set(cacheKey, research);
  return research;
}
