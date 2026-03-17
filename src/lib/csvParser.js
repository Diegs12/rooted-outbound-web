// Map user-friendly column names to internal field names
const COLUMN_ALIASES = {
  'brand': 'company',
  'company': 'company',
  'first name': 'first_name',
  'first_name': 'first_name',
  'last name': 'last_name',
  'last_name': 'last_name',
  'name': 'name', // single name column, will be split into first_name + last_name
  'full name': 'name',
  'email': 'email',
  'role': 'title',
  'title': 'title',
  'location': 'city',
  'city': 'city',
  'website': 'website',
  'linkedin_url': 'linkedin_url',
  'linkedin': 'linkedin_url',
  'custom_intro': 'custom_intro',
  'custom intro': 'custom_intro',
};

// Only email and company are truly required; name can come from "name" or "first name"/"last name"
const REQUIRED_FIELDS = ['email', 'company'];

function parseCSVText(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const result = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        rows.push(current);
        current = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        rows.push(current);
        current = '';
        if (rows.length > 0 && rows.some((r) => r.trim() !== '')) {
          result.push(rows.slice());
        }
        rows.length = 0;
      } else {
        current += ch;
      }
    }
  }
  // Last field
  rows.push(current);
  if (rows.length > 0 && rows.some((r) => r.trim() !== '')) {
    result.push(rows.slice());
  }

  return result;
}

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSVText(text);

        if (parsed.length < 2) {
          reject(new Error('CSV is empty or has no data rows.'));
          return;
        }

        const rawHeaders = parsed[0].map((h) => h.trim().toLowerCase().replace(/[_\s]+/g, ' ').trim());
        const headers = rawHeaders.map((h) => COLUMN_ALIASES[h] || COLUMN_ALIASES[h.replace(/ /g, '_')] || h);

        // Check required fields
        for (const field of REQUIRED_FIELDS) {
          if (!headers.includes(field)) {
            reject(new Error(`Missing required column: "${field}". Found: ${rawHeaders.join(', ')}`));
            return;
          }
        }

        // Need either "name" or both "first_name" and "last_name"
        const hasName = headers.includes('name');
        const hasFirstLast = headers.includes('first_name') && headers.includes('last_name');
        if (!hasName && !hasFirstLast) {
          reject(new Error('Need either a "Name" column or both "First Name" and "Last Name" columns.'));
          return;
        }

        const seen = new Set();
        const leads = [];
        let dupeCount = 0;

        for (let i = 1; i < parsed.length; i++) {
          const row = parsed[i];
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = (row[idx] || '').trim();
          });

          // Split single "name" into first_name + last_name
          if (hasName && !hasFirstLast) {
            const parts = (obj.name || '').split(/\s+/);
            obj.first_name = parts[0] || '';
            obj.last_name = parts.slice(1).join(' ') || '';
          }

          const email = (obj.email || '').toLowerCase().trim();
          if (!email || seen.has(email)) {
            dupeCount++;
            continue;
          }
          seen.add(email);

          leads.push({
            first_name: obj.first_name || '',
            last_name: obj.last_name || '',
            email,
            company: obj.company || '',
            title: obj.title || null,
            linkedin_url: obj.linkedin_url || null,
            custom_intro: obj.custom_intro || null,
            website: obj.website || null,
            city: obj.city || null,
            tier: null,
            confidence: null,
            personal_hook: null,
            brand_research: null,
            person_research: null,
            subject: null,
            body: null,
            body_html: null,
            status: null,
          });
        }

        resolve({ leads, dupeCount });
      } catch (err) {
        reject(new Error(`CSV parse failed: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
