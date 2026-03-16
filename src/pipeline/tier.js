const TIER_1_PATTERNS = [
  'cmo', 'chief marketing', 'chief brand', 'chief content',
  'vp marketing', 'vp partnerships', 'vp brand', 'vp sponsorship', 'vp content', 'vp media',
  'vice president marketing', 'vice president partnerships', 'vice president brand',
  'vice president sponsorship', 'vice president content', 'vice president media',
  'svp marketing', 'svp brand', 'svp partnerships',
  'head of partnerships', 'head of sponsorship', 'head of marketing',
  'head of brand', 'head of content',
  'director of partnerships', 'director of sponsorships', 'director of sponsorship',
  'director of marketing', 'director, marketing',
  'senior director marketing', 'senior director partnerships',
];

const TIER_2_PATTERNS = [
  'sr. manager marketing', 'sr. manager partnerships', 'senior manager marketing',
  'senior manager partnerships', 'senior manager, partnership',
  'marketing manager', 'partnership manager', 'sponsorship manager',
  'marketing director', 'director of media', 'director media',
  'brand manager', 'content director', 'social media director',
  'director of content', 'director of brand', 'director, brand',
  'senior marketing', 'manager, marketing', 'manager, partnerships',
  'marketing coordinator', 'media manager',
  'director digital marketing', 'director, digital',
  'senior creative', 'creative director',
];

const TIER_3_PATTERNS = [
  'district manager', 'regional manager', 'regional vice president',
  'franchise owner', 'franchise',
  'cfo', 'chief financial', 'chief operating', 'coo',
  'board member', 'board of directors',
  'operations', 'hr ', 'human resources',
  'it ', 'information technology',
  'sales rep', 'account manager', 'account executive',
  'executive director amea', 'divisional manager',
  'retail operations', 'project management',
  'owner', 'store manager',
];

function normalize(str) {
  return str.toLowerCase().replace(/[,.\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesTier(title, patterns) {
  const norm = normalize(title);
  return patterns.some((p) => norm.includes(p));
}

export function scoreTier(lead) {
  if (!lead.title || lead.title === 'Unknown') {
    return 3;
  }

  const normTitle = normalize(lead.title);
  if (normTitle === 'ceo' || normTitle === 'president' || normTitle.includes('president and ceo')) {
    return 3;
  }

  if (matchesTier(lead.title, TIER_1_PATTERNS)) return 1;
  if (matchesTier(lead.title, TIER_2_PATTERNS)) return 2;
  if (matchesTier(lead.title, TIER_3_PATTERNS)) return 3;

  if (/marketing|brand|content|sponsorship|media|partnership/i.test(lead.title)) {
    return 2;
  }

  return 3;
}

export function tierLead(lead) {
  lead.tier = scoreTier(lead);
  if (lead.tier === 3) {
    lead.status = 'skipped_tier3';
  }
  return lead;
}
