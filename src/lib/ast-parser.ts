import * as acorn from "acorn";

export interface ParseResult {
  success: true;
  ast: acorn.Node;
}

export interface ParseError {
  success: false;
  error: string;
  line?: number;
  column?: number;
}

export type ParseOutcome = ParseResult | ParseError;

export function parseJS(code: string): ParseOutcome {
  // Try module first, fall back to script
  for (const sourceType of ["module", "script"] as const) {
    try {
      const ast = acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType,
        locations: true,
      });
      return { success: true, ast };
    } catch {
      // Try next sourceType
    }
  }

  // Both failed — return the module parse error for better diagnostics
  try {
    acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", locations: true });
    // Shouldn't reach here
    return { success: false, error: "Unknown parse error" };
  } catch (e: unknown) {
    const err = e as { message?: string; loc?: { line: number; column: number } };
    return {
      success: false,
      error: err.message ?? "Parse error",
      line: err.loc?.line,
      column: err.loc?.column,
    };
  }
}
