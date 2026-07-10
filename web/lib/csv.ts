export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  total: number;
}

/**
 * Parseia o texto retornado pelo relatório de discador (campo "dados"),
 * que vem no formato: cabeçalho na primeira linha, campos separados por ';'.
 */
export function parseSemicolonCsv(raw: string): ParsedCsv {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], total: 0 };
  }

  const headers = lines[0].split(";").map((h) => h.trim());
  const rows = lines.slice(1).map((l) => l.split(";").map((c) => c.trim()));

  return { headers, rows, total: rows.length };
}
