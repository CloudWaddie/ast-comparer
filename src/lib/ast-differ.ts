import { diff } from "deep-diff";

export type ChangeKind = "added" | "removed" | "modified";

export interface GroupedChange {
  kind: ChangeKind;
  summary: string;
  nodeType: string;
  name: string | null;
  /** The before source code for this top-level node (null if added) */
  beforeSource: string | null;
  /** The after source code for this top-level node (null if removed) */
  afterSource: string | null;
  /** Human-readable sub-changes within this node */
  subChanges: SubChange[];
}

export interface SubChange {
  path: string;
  kind: ChangeKind;
  description: string;
  before?: string;
  after?: string;
}

export interface DiffResult {
  changes: GroupedChange[];
  added: number;
  removed: number;
  modified: number;
  totalSubChanges: number;
}

type ASTNode = Record<string, unknown>;

// --- Helpers to extract names/info from AST nodes ---

function getNodeName(node: ASTNode): string | null {
  // FunctionDeclaration / ClassDeclaration
  const id = node.id as ASTNode | undefined;
  if (id && typeof id.name === "string") return id.name;

  // VariableDeclaration — get first declarator name
  const declarations = node.declarations as ASTNode[] | undefined;
  if (declarations?.[0]) {
    const declId = declarations[0].id as ASTNode | undefined;
    if (declId && typeof declId.name === "string") return declId.name;
  }

  // ImportDeclaration — get the source
  const source = node.source as ASTNode | undefined;
  if (node.type === "ImportDeclaration" && source && typeof source.value === "string") {
    return source.value;
  }

  // ExportNamedDeclaration — try the declaration inside
  const declaration = node.declaration as ASTNode | undefined;
  if (declaration) {
    const inner = getNodeName(declaration);
    if (inner) return inner;
  }

  // ExportDefaultDeclaration
  if (node.type === "ExportDefaultDeclaration" && declaration) {
    return getNodeName(declaration) ?? "default";
  }

  if (typeof node.name === "string") return node.name;
  return null;
}

function nodeTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FunctionDeclaration: "Function",
    VariableDeclaration: "Variable",
    ClassDeclaration: "Class",
    ImportDeclaration: "Import",
    ExportNamedDeclaration: "Named Export",
    ExportDefaultDeclaration: "Default Export",
    ExpressionStatement: "Expression",
    IfStatement: "If Statement",
    ForStatement: "For Loop",
    WhileStatement: "While Loop",
    SwitchStatement: "Switch",
    TryStatement: "Try/Catch",
    ReturnStatement: "Return",
    ThrowStatement: "Throw",
  };
  return map[type] ?? type;
}

function makeSummary(kind: ChangeKind, type: string, name: string | null): string {
  const label = nodeTypeLabel(type);
  const nameStr = name ? ` \`${name}\`` : "";
  switch (kind) {
    case "added": return `New ${label.toLowerCase()}${nameStr} added`;
    case "removed": return `${label}${nameStr} removed`;
    case "modified": return `${label}${nameStr} modified`;
  }
}

// --- Reconstruct readable source from AST nodes ---

function astToSource(node: unknown, indent: number = 0): string {
  if (node === null || node === undefined) return "null";
  if (typeof node !== "object") return JSON.stringify(node);
  if (Array.isArray(node)) {
    if (node.length === 0) return "[]";
    return node.map((n) => astToSource(n, indent)).join("\n");
  }

  const n = node as ASTNode;
  const type = n.type as string | undefined;
  if (!type) return JSON.stringify(node, null, 2).slice(0, 500);

  const pad = "  ".repeat(indent);
  const name = getNodeName(n);

  switch (type) {
    case "FunctionDeclaration": {
      const async = n.async ? "async " : "";
      const gen = n.generator ? "*" : "";
      const params = (n.params as ASTNode[])?.map((p) => paramToStr(p)).join(", ") ?? "";
      const body = astToSource(n.body, indent);
      return `${pad}${async}function${gen} ${name ?? ""}(${params}) ${body}`;
    }
    case "VariableDeclaration": {
      const kind = n.kind as string;
      const decls = (n.declarations as ASTNode[])
        ?.map((d) => {
          const id = paramToStr(d.id as ASTNode);
          const init = d.init ? ` = ${exprToStr(d.init as ASTNode)}` : "";
          return `${id}${init}`;
        })
        .join(", ") ?? "";
      return `${pad}${kind} ${decls};`;
    }
    case "ClassDeclaration": {
      const superClass = n.superClass ? ` extends ${exprToStr(n.superClass as ASTNode)}` : "";
      const body = n.body as ASTNode;
      const methods = (body?.body as ASTNode[])?.length ?? 0;
      return `${pad}class ${name ?? ""}${superClass} { /* ${methods} method${methods !== 1 ? "s" : ""} */ }`;
    }
    case "ImportDeclaration": {
      const specifiers = (n.specifiers as ASTNode[]) ?? [];
      const src = ((n.source as ASTNode)?.value as string) ?? "?";
      if (specifiers.length === 0) return `${pad}import "${src}";`;
      const specs = specifiers.map((s) => {
        if (s.type === "ImportDefaultSpecifier") return (s.local as ASTNode)?.name as string;
        if (s.type === "ImportNamespaceSpecifier") return `* as ${(s.local as ASTNode)?.name}`;
        const imported = (s.imported as ASTNode)?.name as string;
        const local = (s.local as ASTNode)?.name as string;
        return imported === local ? imported : `${imported} as ${local}`;
      });
      const hasDefault = specifiers[0]?.type === "ImportDefaultSpecifier";
      const named = specs.filter((_, i) => !hasDefault || i > 0);
      const parts: string[] = [];
      if (hasDefault) parts.push(specs[0]);
      if (named.length > 0) parts.push(`{ ${named.join(", ")} }`);
      return `${pad}import ${parts.join(", ")} from "${src}";`;
    }
    case "ExportNamedDeclaration": {
      const decl = n.declaration as ASTNode | null;
      if (decl) return `${pad}export ${astToSource(decl, 0).trimStart()}`;
      const specs = (n.specifiers as ASTNode[]) ?? [];
      const specStr = specs.map((s) => {
        const local = (s.local as ASTNode)?.name as string;
        const exported = (s.exported as ASTNode)?.name as string;
        return local === exported ? local : `${local} as ${exported}`;
      }).join(", ");
      return `${pad}export { ${specStr} };`;
    }
    case "ExportDefaultDeclaration": {
      const decl = n.declaration as ASTNode;
      return `${pad}export default ${astToSource(decl, 0).trimStart()}`;
    }
    case "ExpressionStatement":
      return `${pad}${exprToStr(n.expression as ASTNode)};`;
    case "BlockStatement": {
      const stmts = (n.body as ASTNode[]) ?? [];
      if (stmts.length === 0) return "{}";
      const inner = stmts.map((s) => astToSource(s, indent + 1)).join("\n");
      return `{\n${inner}\n${pad}}`;
    }
    case "ReturnStatement":
      return `${pad}return ${n.argument ? exprToStr(n.argument as ASTNode) : ""};`;
    case "IfStatement": {
      const test = exprToStr(n.test as ASTNode);
      return `${pad}if (${test}) { ... }`;
    }
    default:
      return `${pad}${type} ${name ? `\`${name}\`` : ""}`.trimEnd();
  }
}

function paramToStr(node: ASTNode): string {
  if (!node) return "?";
  if (node.type === "Identifier") return node.name as string;
  if (node.type === "AssignmentPattern") {
    return `${paramToStr(node.left as ASTNode)} = ${exprToStr(node.right as ASTNode)}`;
  }
  if (node.type === "RestElement") return `...${paramToStr(node.argument as ASTNode)}`;
  if (node.type === "ObjectPattern") {
    const props = (node.properties as ASTNode[]) ?? [];
    return `{ ${props.map((p) => paramToStr(p.value as ASTNode ?? p)).join(", ")} }`;
  }
  if (node.type === "ArrayPattern") {
    const elems = (node.elements as (ASTNode | null)[]) ?? [];
    return `[${elems.map((e) => e ? paramToStr(e) : "").join(", ")}]`;
  }
  return "...";
}

function exprToStr(node: ASTNode, depth: number = 0): string {
  if (!node) return "?";
  if (depth > 4) return "...";
  const d = depth + 1;
  switch (node.type) {
    case "Identifier": return node.name as string;
    case "Literal": return JSON.stringify(node.value);
    case "TemplateLiteral": return "`...`";
    case "CallExpression":
    case "NewExpression": {
      const callee = exprToStr(node.callee as ASTNode, d);
      const args = ((node.arguments as ASTNode[]) ?? []).map((a) => exprToStr(a, d)).join(", ");
      const prefix = node.type === "NewExpression" ? "new " : "";
      return `${prefix}${callee}(${args})`;
    }
    case "MemberExpression": {
      const obj = exprToStr(node.object as ASTNode, d);
      const prop = node.computed
        ? `[${exprToStr(node.property as ASTNode, d)}]`
        : `.${(node.property as ASTNode)?.name ?? "?"}`;
      return `${obj}${prop}`;
    }
    case "ArrowFunctionExpression": {
      const params = ((node.params as ASTNode[]) ?? []).map((p) => paramToStr(p)).join(", ");
      const async = node.async ? "async " : "";
      return `${async}(${params}) => { ... }`;
    }
    case "FunctionExpression": {
      const name = node.id ? (node.id as ASTNode).name as string : "";
      return `function ${name}() { ... }`;
    }
    case "ObjectExpression": {
      const props = (node.properties as ASTNode[]) ?? [];
      if (props.length === 0) return "{}";
      if (props.length <= 3) {
        const inner = props.map((p) => {
          const key = (p.key as ASTNode);
          const kStr = key?.type === "Identifier" ? key.name as string : exprToStr(key, d);
          return `${kStr}: ${exprToStr(p.value as ASTNode, d)}`;
        }).join(", ");
        return `{ ${inner} }`;
      }
      return `{ /* ${props.length} properties */ }`;
    }
    case "ArrayExpression": {
      const elems = (node.elements as ASTNode[]) ?? [];
      if (elems.length <= 3) return `[${elems.map((e) => exprToStr(e, d)).join(", ")}]`;
      return `[/* ${elems.length} elements */]`;
    }
    case "BinaryExpression":
    case "LogicalExpression":
      return `${exprToStr(node.left as ASTNode, d)} ${node.operator} ${exprToStr(node.right as ASTNode, d)}`;
    case "UnaryExpression":
      return `${node.operator}${exprToStr(node.argument as ASTNode, d)}`;
    case "ConditionalExpression":
      return `${exprToStr(node.test as ASTNode, d)} ? ... : ...`;
    case "AssignmentExpression":
      return `${exprToStr(node.left as ASTNode, d)} ${node.operator} ${exprToStr(node.right as ASTNode, d)}`;
    case "AwaitExpression":
      return `await ${exprToStr(node.argument as ASTNode, d)}`;
    case "SpreadElement":
      return `...${exprToStr(node.argument as ASTNode, d)}`;
    case "ThisExpression":
      return "this";
    default:
      return node.type as string;
  }
}

// --- Describe sub-changes in human terms ---

function describeSubChange(
  rawPath: (string | number)[],
  dKind: string,
  lhs: unknown,
  rhs: unknown,
): SubChange | null {
  // Skip top-level keys like "type", "sourceType"
  if (rawPath.length === 0) return null;

  const path = rawPath.map(String);
  const last = path[path.length - 1];
  const pathStr = path.join(".");

  let kind: ChangeKind;
  if (dKind === "N") kind = "added";
  else if (dKind === "D") kind = "removed";
  else kind = "modified";

  // Generate better descriptions based on what changed
  if (last === "name" && path.includes("id")) {
    return { path: pathStr, kind, description: `Renamed from \`${lhs}\` to \`${rhs}\``, before: String(lhs), after: String(rhs) };
  }
  if (last === "operator") {
    return { path: pathStr, kind, description: `Operator changed from \`${lhs}\` to \`${rhs}\``, before: String(lhs), after: String(rhs) };
  }
  if (last === "value" && typeof lhs !== "object") {
    const bStr = JSON.stringify(lhs);
    const aStr = JSON.stringify(rhs);
    return { path: pathStr, kind, description: `Value changed from ${bStr} to ${aStr}`, before: bStr, after: aStr };
  }
  if (last === "name" && typeof lhs === "string") {
    return { path: pathStr, kind, description: `\`${lhs}\` → \`${rhs}\``, before: String(lhs), after: String(rhs) };
  }
  if (last === "type") {
    return { path: pathStr, kind, description: `Node type changed from ${String(lhs)} to ${String(rhs)}`, before: String(lhs), after: String(rhs) };
  }
  if (last === "kind") {
    return { path: pathStr, kind, description: `Declaration kind changed from \`${lhs}\` to \`${rhs}\``, before: String(lhs), after: String(rhs) };
  }
  if (last === "async") {
    return { path: pathStr, kind, description: rhs ? "Made async" : "Made synchronous" };
  }
  if (last === "generator") {
    return { path: pathStr, kind, description: rhs ? "Made generator" : "Removed generator" };
  }
  if (last === "computed") {
    return { path: pathStr, kind, description: rhs ? "Changed to computed property" : "Changed to static property" };
  }

  // Generic
  if (kind === "added") return { path: pathStr, kind, description: `Added \`${last}\`` };
  if (kind === "removed") return { path: pathStr, kind, description: `Removed \`${last}\`` };
  return {
    path: pathStr,
    kind,
    description: `Changed \`${last}\``,
    before: typeof lhs === "object" ? undefined : String(lhs),
    after: typeof rhs === "object" ? undefined : String(rhs),
  };
}

// --- Main diffing: group by top-level statement ---

export function diffASTs(
  before: unknown,
  after: unknown,
  beforeCode?: string,
  afterCode?: string,
): DiffResult {
  const beforeBody = ((before as ASTNode).body as ASTNode[]) ?? [];
  const afterBody = ((after as ASTNode).body as ASTNode[]) ?? [];

  // Build index of before nodes by signature (type + name) for matching
  type Sig = { type: string; name: string | null; index: number; node: ASTNode };
  const sigOf = (node: ASTNode, index: number): Sig => ({
    type: node.type as string,
    name: getNodeName(node),
    index,
    node,
  });

  const beforeSigs = beforeBody.map(sigOf);
  const afterSigs = afterBody.map(sigOf);
  const matchedBefore = new Set<number>();
  const matchedAfter = new Set<number>();
  const changes: GroupedChange[] = [];

  // Match by type+name
  for (const aSig of afterSigs) {
    const match = beforeSigs.find(
      (b) => !matchedBefore.has(b.index) && b.type === aSig.type && b.name === aSig.name && b.name !== null
    );
    if (match) {
      matchedBefore.add(match.index);
      matchedAfter.add(aSig.index);

      // Diff these two nodes
      const diffs = diff(match.node, aSig.node);
      if (diffs && diffs.length > 0) {
        const subChanges: SubChange[] = [];
        for (const d of diffs) {
          const sub = describeSubChange(
            d.path ?? [],
            d.kind,
            d.kind === "E" ? d.lhs : undefined,
            d.kind === "E" ? d.rhs : d.kind === "N" ? (d as { rhs?: unknown }).rhs : undefined,
          );
          if (sub) subChanges.push(sub);
        }
        if (subChanges.length > 0) {
          changes.push({
            kind: "modified",
            summary: makeSummary("modified", aSig.type, aSig.name),
            nodeType: aSig.type,
            name: aSig.name,
            beforeSource: astToSource(match.node),
            afterSource: astToSource(aSig.node),
            subChanges,
          });
        }
      }
    }
  }

  // Match remaining by type + position
  for (const aSig of afterSigs) {
    if (matchedAfter.has(aSig.index)) continue;
    const match = beforeSigs.find(
      (b) => !matchedBefore.has(b.index) && b.type === aSig.type && b.name === null && aSig.name === null
    );
    if (match) {
      matchedBefore.add(match.index);
      matchedAfter.add(aSig.index);
      const diffs = diff(match.node, aSig.node);
      if (diffs && diffs.length > 0) {
        const subChanges: SubChange[] = [];
        for (const d of diffs) {
          const sub = describeSubChange(
            d.path ?? [],
            d.kind,
            d.kind === "E" ? d.lhs : undefined,
            d.kind === "E" ? d.rhs : d.kind === "N" ? (d as { rhs?: unknown }).rhs : undefined,
          );
          if (sub) subChanges.push(sub);
        }
        if (subChanges.length > 0) {
          changes.push({
            kind: "modified",
            summary: makeSummary("modified", aSig.type, aSig.name),
            nodeType: aSig.type,
            name: aSig.name,
            beforeSource: astToSource(match.node),
            afterSource: astToSource(aSig.node),
            subChanges,
          });
        }
      }
    }
  }

  // Unmatched before = removed
  for (const bSig of beforeSigs) {
    if (matchedBefore.has(bSig.index)) continue;
    changes.push({
      kind: "removed",
      summary: makeSummary("removed", bSig.type, bSig.name),
      nodeType: bSig.type,
      name: bSig.name,
      beforeSource: astToSource(bSig.node),
      afterSource: null,
      subChanges: [],
    });
  }

  // Unmatched after = added
  for (const aSig of afterSigs) {
    if (matchedAfter.has(aSig.index)) continue;
    changes.push({
      kind: "added",
      summary: makeSummary("added", aSig.type, aSig.name),
      nodeType: aSig.type,
      name: aSig.name,
      beforeSource: null,
      afterSource: astToSource(aSig.node),
      subChanges: [],
    });
  }

  // Sort: added first, then modified, then removed
  const order: Record<ChangeKind, number> = { added: 0, modified: 1, removed: 2 };
  changes.sort((a, b) => order[a.kind] - order[b.kind]);

  const added = changes.filter((c) => c.kind === "added").length;
  const removed = changes.filter((c) => c.kind === "removed").length;
  const modified = changes.filter((c) => c.kind === "modified").length;
  const totalSubChanges = changes.reduce((sum, c) => sum + c.subChanges.length, 0);

  return { changes, added, removed, modified, totalSubChanges };
}
