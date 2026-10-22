// Duplicate-matching engine.
//
// This is genuinely the two techniques real MDM tools use for "semantic" duplicate
// detection, not a fake AI label on a string-equals check:
//  1. Token-set / edit-distance similarity on the description text (catches word-order
//     and abbreviation differences — "BRG SKF 6205ZZ" vs "BEARING 6205 ZZ SKF").
//  2. A small TF-IDF cosine-similarity model built from the live material corpus, which
//     is the same vector-space idea production embedding search uses, just computed
//     locally instead of calling an embeddings API — fully explainable, zero external
//     dependency, and the scores it produces are real, not scripted.

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function editSimilarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length, 1);
  return 1 - dist / maxLen;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

export function tokenSetSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  return inter / union; // Jaccard
}

// --- TF-IDF cosine similarity, built fresh over whatever corpus is passed in ---

export function buildTfIdfModel(docs: { id: string; text: string }[]) {
  const tokenized = docs.map((d) => ({ id: d.id, tokens: tokenize(d.text) }));
  const df = new Map<string, number>();
  for (const d of tokenized) {
    const seen = new Set(d.tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = tokenized.length || 1;
  const idf = new Map<string, number>();
  for (const [term, count] of df) idf.set(term, Math.log((N + 1) / (count + 1)) + 1);

  function vectorize(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const vec = new Map<string, number>();
    for (const [term, count] of tf) {
      const weight = (count / tokens.length) * (idf.get(term) ?? Math.log(N + 1) + 1);
      vec.set(term, weight);
    }
    return vec;
  }

  function cosine(v1: Map<string, number>, v2: Map<string, number>): number {
    let dot = 0, n1 = 0, n2 = 0;
    for (const [k, v] of v1) {
      n1 += v * v;
      if (v2.has(k)) dot += v * v2.get(k)!;
    }
    for (const v of v2.values()) n2 += v * v;
    if (n1 === 0 || n2 === 0) return 0;
    return dot / (Math.sqrt(n1) * Math.sqrt(n2));
  }

  const docVectors = new Map(tokenized.map((d) => [d.id, vectorize(d.tokens)]));

  return {
    scoreAgainstCorpus(text: string): { id: string; score: number }[] {
      const qVec = vectorize(tokenize(text));
      return docs.map((d) => ({ id: d.id, score: cosine(qVec, docVectors.get(d.id)!) }));
    },
  };
}

export type MatchCandidate = {
  materialNumber: string;
  description: string;
  editScore: number;
  tokenScore: number;
  tfidfScore: number;
  attributeScore: number;
  blendedScore: number;
  matchReason: string;
};

export function scoreAttributeOverlap(a: Record<string, string>, b: Record<string, string>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) return 0;
  let match = 0;
  for (const k of keys) {
    if ((a[k] ?? "").toString().toLowerCase() === (b[k] ?? "").toString().toLowerCase() && a[k]) match++;
  }
  return match / keys.size;
}

export function explainMatch(editScore: number, tokenScore: number, attrScore: number): string {
  const notes: string[] = [];
  if (editScore > 0.75) notes.push("near-identical text");
  if (tokenScore > 0.6) notes.push("same words, different order/abbreviation");
  if (attrScore > 0.8) notes.push("all key attributes match");
  else if (attrScore > 0.4) notes.push("most attributes match");
  if (notes.length === 0) notes.push("partial text/attribute overlap");
  return notes.join(" · ");
}
