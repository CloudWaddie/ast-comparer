export function Header() {
  return (
    <header className="relative border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
      {/* Top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          {/* Logo mark */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-400 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
            &Delta;
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              AST <span className="text-gradient">Diff</span>
            </h1>
            <p className="text-xs text-zinc-500">
              Structural JavaScript comparison
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[11px] text-zinc-500">
            inspired by fiji-unwrap
          </span>
        </div>
      </div>
    </header>
  );
}
