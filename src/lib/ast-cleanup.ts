const STRIP_KEYS = new Set(["start", "end", "loc", "range", "raw"]);

export function cleanAST(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(cleanAST);
  }
  if (node !== null && typeof node === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (!STRIP_KEYS.has(key)) {
        cleaned[key] = cleanAST(value);
      }
    }
    return cleaned;
  }
  return node;
}
