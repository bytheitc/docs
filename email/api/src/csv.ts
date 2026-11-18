// A small, dependency-free CSV parser — RFC 4180 enough for a recipient-list upload: quoted
// fields, commas and newlines inside quotes, and "" as an escaped quote. Nothing fancier.

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  // Normalize line endings so \r\n and \r alone both behave like \n inside unquoted text.
  const s = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { pushField(); continue; }
    if (c === "\n" || c === "\r") { pushRow(); continue; }
    field += c;
  }
  if (field.length || row.length) pushRow();
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

export interface ParsedCsv {
  /** Column names other than "email", in file order. */
  fieldNames: string[];
  rows: { email: string; fields: Record<string, string> }[];
  /** Rows skipped because the email column was empty or not a plausible address. */
  skipped: number;
}

const ADDRESS = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

/** The first column named exactly "email" (case-insensitive) is the address; every other column
 *  becomes a merge-tag field, keyed by its header lowercased with spaces turned to underscores. */
export function parseContactsCsv(text: string): ParsedCsv {
  const rows = parseRows(text);
  if (!rows.length) return { fieldNames: [], rows: [], skipped: 0 };

  const header = rows[0].map((h) => h.trim());
  const emailIdx = header.findIndex((h) => h.toLowerCase() === "email");
  if (emailIdx === -1) throw new Error('The CSV needs a column named "email".');

  const fieldKeys = header.map((h, i) => (i === emailIdx ? null : h.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")));
  const fieldNames = fieldKeys.filter((k): k is string => Boolean(k));

  const out: { email: string; fields: Record<string, string> }[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const email = (r[emailIdx] ?? "").trim().toLowerCase();
    if (!ADDRESS.test(email)) { skipped++; continue; }
    const fields: Record<string, string> = {};
    header.forEach((_h, i) => {
      const key = fieldKeys[i];
      if (key) fields[key] = (r[i] ?? "").trim();
    });
    out.push({ email, fields });
  }
  return { fieldNames, rows: out, skipped };
}
