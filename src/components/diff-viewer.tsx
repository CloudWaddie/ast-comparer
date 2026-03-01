"use client";

import { useState } from "react";
import type { DiffResult, GroupedChange, ChangeKind, SubChange } from "@/lib/ast-differ";

interface DiffViewerProps {
  result: DiffResult;
}

const kindConfig: Record<ChangeKind, {
  label: string;
  icon: string;
  border: string;
  bg: string;
  text: string;
  badge: string;
  glow: string;
  statBorder: string;
  statBg: string;
}> = {
  added: {
    label: "Added",
    icon: "+",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.03]",
    text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    glow: "glow-green",
    statBorder: "border-emerald-500/20",
    statBg: "bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02]",
  },
  removed: {
    label: "Removed",
    icon: "\u2212",
    border: "border-red-500/20",
    bg: "bg-red-500/[0.03]",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-400 border-red-500/20",
    glow: "glow-red",
    statBorder: "border-red-500/20",
    statBg: "bg-gradient-to-br from-red-500/10 to-red-500/[0.02]",
  },
  modified: {
    label: "Modified",
    icon: "~",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.03]",
    text: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    glow: "glow-yellow",
    statBorder: "border-amber-500/20",
    statBg: "bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02]",
  },
};

function nodeTypeIcon(nodeType: string): string {
  const map: Record<string, string> = {
    FunctionDeclaration: "fn",
    VariableDeclaration: "let",
    ClassDeclaration: "cls",
    ImportDeclaration: "imp",
    ExportNamedDeclaration: "exp",
    ExportDefaultDeclaration: "def",
    ExpressionStatement: "( )",
  };
  return map[nodeType] ?? "{ }";
}

function StatCard({ kind, count }: { kind: ChangeKind; count: number }) {
  const c = kindConfig[kind];
  return (
    <div className={`rounded-xl border ${c.statBorder} ${c.statBg} px-5 py-4 transition-all hover:scale-[1.02] ${count > 0 ? c.glow : "opacity-40"}`}>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold tabular-nums ${c.text}`}>{count}</span>
        <span className={`text-xs font-medium uppercase tracking-wider ${c.text} opacity-60`}>
          {c.label}
        </span>
      </div>
    </div>
  );
}

function SubChangeRow({ sub }: { sub: SubChange }) {
  const c = kindConfig[sub.kind];
  return (
    <div className="flex items-start gap-2 py-1">
      <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[9px] font-bold ${c.badge}`}>
        {sub.kind === "added" ? "+" : sub.kind === "removed" ? "\u2212" : "\u2248"}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-xs text-zinc-300">{sub.description}</span>
        {(sub.before || sub.after) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            {sub.before && (
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-300 line-through decoration-red-500/40">
                {sub.before}
              </span>
            )}
            {sub.before && sub.after && (
              <span className="text-zinc-600">&rarr;</span>
            )}
            {sub.after && (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                {sub.after}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="flex-shrink-0 font-mono text-[10px] text-zinc-700">{sub.path}</span>
    </div>
  );
}

function CodeBlock({ code, label, variant }: { code: string; label: string; variant: "before" | "after" }) {
  const borderColor = variant === "before" ? "border-red-500/15" : "border-emerald-500/15";
  const labelColor = variant === "before" ? "text-red-400/60" : "text-emerald-400/60";
  const bgColor = variant === "before" ? "bg-red-500/[0.02]" : "bg-emerald-500/[0.02]";

  return (
    <div className={`flex-1 overflow-hidden rounded-lg border ${borderColor} ${bgColor}`}>
      <div className={`border-b ${borderColor} px-3 py-1.5`}>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${labelColor}`}>{label}</span>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap p-3 font-mono text-[12px] leading-relaxed text-zinc-400">
        {code}
      </pre>
    </div>
  );
}

function ChangeRow({ change, index }: { change: GroupedChange; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const c = kindConfig[change.kind];

  return (
    <div
      className={`animate-fade-in overflow-hidden rounded-xl border ${c.border} ${c.bg} transition-all`}
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "backwards" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.01]"
      >
        {/* Kind badge */}
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${c.badge}`}>
          {c.icon}
        </span>
        {/* Node type tag */}
        <span className="flex-shrink-0 rounded bg-zinc-800/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
          {nodeTypeIcon(change.nodeType)}
        </span>
        {/* Summary */}
        <span className="flex-1 text-sm text-zinc-300">{change.summary}</span>
        {/* Sub-change count for modified */}
        {change.kind === "modified" && change.subChanges.length > 0 && (
          <span className="rounded-full bg-zinc-800/50 px-2 py-0.5 text-[10px] tabular-nums text-zinc-500">
            {change.subChanges.length} change{change.subChanges.length !== 1 ? "s" : ""}
          </span>
        )}
        {/* Expand icon */}
        <svg
          className={`h-4 w-4 flex-shrink-0 text-zinc-600 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="animate-fade-in border-t border-zinc-800/20">
          {/* Source code comparison */}
          {(change.beforeSource || change.afterSource) && (
            <div className="flex gap-3 p-4">
              {change.beforeSource && (
                <CodeBlock code={change.beforeSource} label="Before" variant="before" />
              )}
              {change.afterSource && (
                <CodeBlock code={change.afterSource} label="After" variant="after" />
              )}
            </div>
          )}

          {/* Sub-changes for modified nodes */}
          {change.subChanges.length > 0 && (
            <div className="border-t border-zinc-800/20 px-4 py-3">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Changes
              </div>
              <div className="divide-y divide-zinc-800/20">
                {change.subChanges.slice(0, 20).map((sub, i) => (
                  <SubChangeRow key={i} sub={sub} />
                ))}
                {change.subChanges.length > 20 && (
                  <div className="py-2 text-center text-xs text-zinc-600">
                    +{change.subChanges.length - 20} more changes
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DiffViewer({ result }: DiffViewerProps) {
  const [filter, setFilter] = useState<ChangeKind | "all">("all");

  if (result.changes.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center rounded-2xl border border-zinc-800/30 bg-zinc-900/20 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-300">No structural changes detected</p>
        <p className="mt-1 text-xs text-zinc-600">The ASTs are structurally identical</p>
      </div>
    );
  }

  const filtered = filter === "all" ? result.changes : result.changes.filter((c) => c.kind === filter);

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard kind="added" count={result.added} />
        <StatCard kind="removed" count={result.removed} />
        <StatCard kind="modified" count={result.modified} />
      </div>

      {/* Summary line */}
      <p className="text-center text-xs text-zinc-600">
        {result.changes.length} top-level change{result.changes.length !== 1 ? "s" : ""}
        {result.totalSubChanges > 0 && ` across ${result.totalSubChanges} individual modifications`}
      </p>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-zinc-900/40 p-1">
        {(["all", "added", "removed", "modified"] as const).map((f) => {
          const active = filter === f;
          const count = f === "all" ? result.changes.length : result[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-zinc-800 text-zinc-200 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}{" "}
              <span className={active ? "text-zinc-400" : "text-zinc-600"}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Changes list */}
      <div className="flex flex-col gap-2">
        {filtered.map((change, i) => (
          <ChangeRow key={`${change.kind}-${change.name}-${i}`} change={change} index={i} />
        ))}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-zinc-600">
            No {filter} changes
          </div>
        )}
      </div>
    </div>
  );
}
