function escapeCSVField(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportCSV(leads) {
  const columns = [
    'first_name', 'last_name', 'email', 'company', 'title', 'city', 'website', 'tier',
    'confidence', 'personal_hook', 'brand_hook_line', 'key_properties',
    'activation_gap', 'subject', 'body', 'body_html', 'linkedin_url', 'status',
  ];

  const rows = leads.map((l) => {
    const row = {
      first_name: l.first_name,
      last_name: l.last_name,
      email: l.email,
      company: l.company,
      title: l.title || '',
      city: l.city || '',
      website: l.website || '',
      tier: l.tier,
      confidence: l.confidence || '',
      personal_hook: l.personal_hook || '',
      brand_hook_line: l.brand_research?.brand_hook_line || '',
      key_properties:
        typeof l.brand_research?.key_properties === 'string'
          ? l.brand_research.key_properties
          : JSON.stringify(l.brand_research?.key_properties || ''),
      activation_gap: l.brand_research?.activation_gap || '',
      subject: l.subject || '',
      body: l.body || '',
      body_html: l.body_html || '',
      linkedin_url: l.linkedin_url || '',
      status: l.status || '',
    };
    return columns.map((col) => escapeCSVField(row[col])).join(',');
  });

  const csv = columns.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.href = url;
  link.download = `enriched_${timestamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
