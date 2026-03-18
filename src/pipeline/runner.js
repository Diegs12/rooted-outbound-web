import { enrichLead } from './enrich';
import { tierLead } from './tier';
import { researchBrand, clearBrandCache } from './researchBrand';
import { researchPerson } from './researchPerson';
import { triageLead } from './triage';
import { writeEmail } from './writeEmail';

const PERPLEXITY_THROTTLE_MS = 6500;

let lastPerplexityCall = 0;

async function throttlePerplexity() {
  const now = Date.now();
  const elapsed = now - lastPerplexityCall;
  if (elapsed < PERPLEXITY_THROTTLE_MS) {
    const wait = PERPLEXITY_THROTTLE_MS - elapsed;
    await new Promise((r) => setTimeout(r, wait));
  }
  lastPerplexityCall = Date.now();
}

// --- Outreach History (localStorage) ---

const HISTORY_KEY = 'rooted_outreach_history';

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function tagLeadHistory(lead, history) {
  const entry = history[lead.email];
  if (entry && entry.count > 0) {
    lead.outreach_type = 'follow_up';
    lead.previous_outreach = {
      last_date: entry.dates[entry.dates.length - 1],
      last_subject: entry.subjects[entry.subjects.length - 1],
      count: entry.count,
    };
  } else {
    lead.outreach_type = 'cold';
    lead.previous_outreach = null;
  }
}

function recordOutreach(lead, history) {
  if (lead.status !== 'drafted' || !lead.email) return;
  if (!history[lead.email]) {
    history[lead.email] = { dates: [], subjects: [], count: 0 };
  }
  history[lead.email].dates.push(new Date().toISOString().slice(0, 10));
  history[lead.email].subjects.push(lead.subject || '');
  history[lead.email].count++;
}

// --- Steps ---

export const STEPS = {
  ENRICHING: 'Enriching',
  TIERING: 'Tiering',
  BRAND_RESEARCH: 'Brand Research',
  PERSON_RESEARCH: 'Person Research',
  TRIAGING: 'Triaging',
  WRITING_EMAIL: 'Writing Email',
  DONE: 'Done',
  SKIPPED: 'Skipped',
  ERROR: 'Error',
};

/**
 * Run the full pipeline on a set of leads.
 * @param {Array} leads - parsed leads from CSV
 * @param {Function} onUpdate - callback(leads, currentIndex, currentStep, stats)
 * @param {AbortSignal} signal - abort signal to cancel the run
 * @returns {Array} processed leads
 */
export async function runPipeline(leads, onUpdate, signal) {
  clearBrandCache();
  lastPerplexityCall = 0;

  // Load outreach history and tag leads
  const history = loadHistory();
  let followUpCount = 0;
  for (const lead of leads) {
    tagLeadHistory(lead, history);
    if (lead.outreach_type === 'follow_up') followUpCount++;
  }
  if (followUpCount > 0) {
    console.log(`[HISTORY] ${followUpCount} returning leads detected as follow-ups`);
  }

  const stats = {
    total: leads.length,
    completed: 0,
    drafted: 0,
    skipped: 0,
    errors: 0,
  };

  const throttleCallbacks = { onThrottle: throttlePerplexity };

  for (let i = 0; i < leads.length; i++) {
    if (signal?.aborted) break;

    const lead = leads[i];
    const name = `${lead.first_name} ${lead.last_name}`;

    try {
      // Step 1: Enrich (title discovery)
      lead._step = STEPS.ENRICHING;
      onUpdate([...leads], i, STEPS.ENRICHING, { ...stats });

      await enrichLead(lead, throttleCallbacks);

      // Step 2: Tier scoring
      lead._step = STEPS.TIERING;
      onUpdate([...leads], i, STEPS.TIERING, { ...stats });
      tierLead(lead);

      if (lead.tier === 3) {
        lead._step = STEPS.SKIPPED;
        stats.skipped++;
        stats.completed++;
        onUpdate([...leads], i, STEPS.SKIPPED, { ...stats });
        continue;
      }

      // Step 3: Brand research
      lead._step = STEPS.BRAND_RESEARCH;
      onUpdate([...leads], i, STEPS.BRAND_RESEARCH, { ...stats });

      lead.brand_research = await researchBrand(lead.company, { ...throttleCallbacks, website: lead.website });

      // Step 4: Person research (adaptive)
      lead._step = STEPS.PERSON_RESEARCH;
      onUpdate([...leads], i, STEPS.PERSON_RESEARCH, { ...stats });

      await researchPerson(lead, throttleCallbacks);

      // Step 5: AI Triage (type/intent/tone)
      lead._step = STEPS.TRIAGING;
      onUpdate([...leads], i, STEPS.TRIAGING, { ...stats });

      await triageLead(lead);

      // Step 6: Write email (triage-aware)
      lead._step = STEPS.WRITING_EMAIL;
      onUpdate([...leads], i, STEPS.WRITING_EMAIL, { ...stats });

      await writeEmail(lead);

      if (lead.status === 'drafted') {
        lead._step = STEPS.DONE;
        lead.approved = true; // default to approved
        stats.drafted++;
        // Record in outreach history
        recordOutreach(lead, history);
      } else {
        lead._step = STEPS.ERROR;
        stats.errors++;
      }
    } catch (err) {
      console.error(`[RUNNER] Error processing ${name}:`, err);
      lead.status = 'error';
      lead._step = STEPS.ERROR;
      lead._error = err.message;
      stats.errors++;
    }

    stats.completed++;
    onUpdate([...leads], i, lead._step, { ...stats });
  }

  // Save updated outreach history
  saveHistory(history);

  return leads;
}
