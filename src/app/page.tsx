"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { CodeInput } from "@/components/code-input";
import { DiffViewer } from "@/components/diff-viewer";
import { parseJS } from "@/lib/ast-parser";
import { cleanAST } from "@/lib/ast-cleanup";
import { diffASTs, applySmartFilter, DiffResult } from "@/lib/ast-differ";

export default function Home() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [beforeFile, setBeforeFile] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<string | null>(null);
  const [beforeError, setBeforeError] = useState<string | null>(null);
  const [afterError, setAfterError] = useState<string | null>(null);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [smartFilter, setSmartFilter] = useState(true);

  const displayResult = useMemo(() => {
    if (!result) return null;
    if (!smartFilter) return { filtered: result, stats: null };
    const { filtered, stats } = applySmartFilter(result);
    return { filtered, stats };
  }, [result, smartFilter]);

  function handleCompare() {
    setBeforeError(null);
    setAfterError(null);
    setResult(null);
    setComparing(true);

    const parsedBefore = parseJS(before);
    if (!parsedBefore.success) {
      setBeforeError(
        `Parse error${parsedBefore.line ? ` (line ${parsedBefore.line}, col ${parsedBefore.column})` : ""}: ${parsedBefore.error}`
      );
      setComparing(false);
      return;
    }

    const parsedAfter = parseJS(after);
    if (!parsedAfter.success) {
      setAfterError(
        `Parse error${parsedAfter.line ? ` (line ${parsedAfter.line}, col ${parsedAfter.column})` : ""}: ${parsedAfter.error}`
      );
      setComparing(false);
      return;
    }

    const cleanedBefore = cleanAST(parsedBefore.ast);
    const cleanedAfter = cleanAST(parsedAfter.ast);
    const diffResult = diffASTs(cleanedBefore, cleanedAfter, before, after);
    setResult(diffResult);
    setComparing(false);
  }

  const canCompare = before.trim() && after.trim() && !comparing;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
        {/* Editor panes */}
        <div className="flex gap-5" style={{ minHeight: 400 }}>
          <CodeInput
            label="Before"
            sublabel="Original version"
            value={before}
            onChange={setBefore}
            error={beforeError}
            fileName={beforeFile}
            onFileNameChange={setBeforeFile}
          />

          {/* Center divider with arrow */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-16 w-px bg-gradient-to-b from-transparent via-zinc-800 to-transparent" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div className="h-16 w-px bg-gradient-to-b from-transparent via-zinc-800 to-transparent" />
          </div>

          <CodeInput
            label="After"
            sublabel="Updated version"
            value={after}
            onChange={setAfter}
            error={afterError}
            fileName={afterFile}
            onFileNameChange={setAfterFile}
          />
        </div>

        {/* Compare button + smart filter toggle */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleCompare}
            disabled={!canCompare}
            className={`group relative rounded-xl px-10 py-3 text-sm font-medium transition-all duration-300 ${
              canCompare
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:brightness-110 active:scale-[0.98]"
                : "cursor-not-allowed bg-zinc-900 text-zinc-600"
            }`}
          >
            {comparing ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Comparing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Compare ASTs
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </button>

          {/* Smart filter toggle */}
          <button
            onClick={() => setSmartFilter(!smartFilter)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              smartFilter
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
            }`}
          >
            <div className={`relative h-4 w-7 rounded-full transition-colors ${smartFilter ? "bg-blue-500" : "bg-zinc-700"}`}>
              <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${smartFilter ? "left-3.5" : "left-0.5"}`} />
            </div>
            Smart filter
          </button>
        </div>

        {/* Results */}
        {displayResult && (
          <div className="border-t border-zinc-800/30 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-400">Results</h2>
              {displayResult.stats && displayResult.stats.hiddenNoise > 0 && (
                <span className="rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-[11px] text-blue-400">
                  {displayResult.stats.hiddenNoise} noisy change{displayResult.stats.hiddenNoise !== 1 ? "s" : ""} hidden
                </span>
              )}
            </div>
            <DiffViewer result={displayResult.filtered} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/30 py-4 text-center text-[11px] text-zinc-700">
        AST Diff — Structural JavaScript comparison tool
      </footer>
    </div>
  );
}
