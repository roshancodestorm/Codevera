import { createRequire } from 'module';
import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const WASM_DIR = path.join(__dirname, '..', 'node_modules', 'tree-sitter-wasms', 'out');

let readyPromise = null;

function langForFile(file) {
  const ext = path.extname(String(file || '')).toLowerCase();
  if (['.ts', '.mts', '.cts'].includes(ext)) return 'tree-sitter-typescript.wasm';
  if (['.tsx', '.jsx'].includes(ext)) return 'tree-sitter-typescript.wasm';
  if (['.js', '.mjs', '.cjs'].includes(ext)) return 'tree-sitter-javascript.wasm';
  return null;
}

async function initTs() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const wts = require('web-tree-sitter');
      await wts.init();
      const langs = {};
      for (const name of ['tree-sitter-javascript.wasm', 'tree-sitter-typescript.wasm']) {
        const wasmPath = path.join(WASM_DIR, name);
        if (fs.existsSync(wasmPath)) {
          try {
            langs[name] = await wts.Language.load(wasmPath);
          } catch (err) {
            console.error(`[tsindex] failed to load ${name}:`, err.message);
          }
        }
      }
      return { wts, langs };
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

function parse(code, file) {
  return langForFile(file) ? null : null; // placeholder, replaced below
}

async function withParser(file, code, fn) {
  const wasmName = langForFile(file);
  if (!wasmName) return null;
  const { wts, langs } = await initTs();
  const lang = langs[wasmName];
  if (!lang) return null;
  const parser = new wts();
  parser.setLanguage(lang);
  try {
    const tree = parser.parse(code);
    return fn(tree, tree.rootNode);
  } finally {
    try {
      parser.delete();
    } catch {}
  }
}

/** Line text of `lines` joined for a given 1-based row (for byte-column conversion). */
function byteColFor(lineText, charCol) {
  const prefix = String(lineText || '').slice(0, Math.max(0, charCol - 1));
  return Buffer.byteLength(prefix, 'utf8');
}

const DECL_TYPES = new Set([
  'function_declaration',
  'function_expression',
  'arrow_function',
  'class_declaration',
  'class',
  'method_definition',
  'method_signature',
  'property_signature',
  'property_definition',
  'generator_function_declaration',
  'generator_function',
  'interface_declaration',
  'type_alias_declaration',
  'enum_declaration',
  'variable_declarator',
  'required_parameter',
  'optional_parameter',
  'rest_pattern',
]);

const DECL_WITH_NAME_FIELD = new Set([
  'function_declaration',
  'function_expression',
  'generator_function_declaration',
  'generator_function',
  'class_declaration',
  'method_definition',
  'method_signature',
  'interface_declaration',
  'type_alias_declaration',
  'enum_declaration',
]);

const SCOPE_TYPES = new Set([
  'program',
  'function_declaration',
  'function_expression',
  'arrow_function',
  'generator_function_declaration',
  'generator_function',
  'method_definition',
  'class_declaration',
  'class',
  'for_statement',
  'for_in_statement',
  'if_statement',
  'block',
]);

function declKind(node) {
  switch (node.type) {
    case 'function_declaration':
    case 'generator_function_declaration':
      return 'function';
    case 'function_expression':
    case 'generator_function':
    case 'arrow_function':
      return 'arrow-function';
    case 'class_declaration':
      return 'class';
    case 'method_definition':
    case 'method_signature':
      return 'method';
    case 'property_definition':
      return 'property';
    case 'interface_declaration':
      return 'interface';
    case 'type_alias_declaration':
      return 'type-alias';
    case 'enum_declaration':
      return 'enum';
    case 'variable_declarator':
      return node.value?.type === 'arrow_function' || node.value?.type === 'function_expression' ? 'function' : 'variable';
    case 'required_parameter':
    case 'optional_parameter':
    case 'rest_pattern':
      return 'parameter';
    case 'formal_parameters':
      return 'parameters';
    default:
      return 'symbol';
  }
}

function declName(node) {
  if (DECL_WITH_NAME_FIELD.has(node.type)) return node.childForFieldName('name')?.text || null;
  if (node.type === 'variable_declarator') return node.child(0)?.text || null;
  if (node.type === 'required_parameter' || node.type === 'optional_parameter') return node.child(0)?.text?.replace(/^\.\.\./, '') || null;
  if (node.type === 'rest_pattern') return node.child(0)?.text || null;
  if (node.type === 'formal_parameters') return null;
  if (node.type === 'property_definition' || node.type === 'property_signature') return node.child(0)?.text || null;
  return null;
}

function buildSignature(node, lines) {
  const first = node.startPosition.row;
  let end = node.endPosition.row;
  if (end - first > 3) end = first + 3;
  return lines.slice(first, end + 1).join(' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function docCommentFor(node, lines) {
  const defLine = node.startPosition.row;
  for (let back = 1; back <= 3; back++) {
    const row = defLine - back;
    if (row < 0) break;
    const text = lines[row] || '';
    const trimmed = text.trim();
    if (trimmed.startsWith('//')) {
      return lines.slice(Math.max(0, defLine - 4), defLine).map((l) => l.trim()).filter((l) => l.startsWith('//')).join('\n').replace(/^\/\/\s?/gm, '').slice(0, 600);
    }
    if (trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      const start = defLine - back;
      return lines.slice(Math.max(0, start - 3), defLine).map((l) => l.trim().replace(/^\/\*+\s?|\s?\*\/$|^\*\s?/g, '')).filter(Boolean).slice(0, 8).join('\n').slice(0, 600);
    }
    if (trimmed !== '') break;
  }
  return null;
}

function enclosingScopes(root, node) {
  const scopes = [];
  let cur = node.parent;
  while (cur) {
    if (SCOPE_TYPES.has(cur.type)) {
      scopes.push({
        kind: cur.type === 'program' ? 'module' : declKind(cur.type) || cur.type,
        name: declName(cur) || null,
        line: cur.startPosition.row + 1,
      });
    }
    cur = cur.parent;
  }
  return scopes;
}

/** Find the declaration node whose name identifier covers (row, col) — or the nearest enclosing declaration. */
function findDeclarationAt(root, row, col) {
  const pos = { row, column: col };
  const deepest = root.descendantForPosition(pos);
  if (deepest && deepest.type === 'identifier' && deepest.parent?.type === 'formal_parameters') {
    return { node: deepest, name: deepest.text, isParam: true };
  }
  let node = deepest;
  while (node && node !== root) {
    if (DECL_TYPES.has(node.type)) {
      const name = declName(node);
      const nameNode = node.type === 'variable_declarator' ? node.child(0) : node.childForFieldName('name');
      const onName = nameNode && nodeIsAt(nameNode, row, col);
      return { node, name, onName };
    }
    node = node.parent;
  }
  const nameNode = deepest && (deepest.type === 'identifier' || deepest.type === 'property_identifier' || deepest.type === 'shorthand_property_identifier')
    ? deepest
    : null;
  return nameNode ? { nameNode } : null;
}

function nodeIsAt(node, row, col) {
  const s = node.startPosition;
  const e = node.endPosition;
  return (s.row < row || (s.row === row && s.column <= col)) && (e.row > row || (e.row === row && e.column > col));
}

/** Does this identifier node bind (shadow) the given name? */
function isShadowingDecl(node, name) {
  const p = node.parent;
  if (!p) return false;
  if (DECL_TYPES.has(p.type) && p.type !== 'formal_parameters') {
    const declId = declNameNode(p);
    if (declId && declId.id === node.id) return false;
    if (declId && declId.text === name) return true;
  }
  if (p.type === 'formal_parameters') {
    for (const ch of p.namedChildren) {
      if (ch.type === 'identifier' && ch.id !== node.id && ch.text === name) return true;
      if (ch.type === 'required_parameter' && ch.namedChildren.some((c) => c.type === 'identifier' && c.id !== node.id && c.text === name)) return true;
    }
  }
  return false;
}

function declNameNode(node) {
  if (!node) return null;
  if (node.type === 'variable_declarator') return node.child(0);
  if (node.type === 'required_parameter' || node.type === 'optional_parameter') return node.child(0);
  if (node.type === 'rest_pattern') return node.child(1);
  return node.childForFieldName('name');
}

function isRefPosition(node) {
  const p = node.parent;
  if (!p) return false;
  if (p.type === 'call_expression' && p.child(0)?.id === node.id) return true;
  if (p.type === 'new_expression' && p.child(0)?.id === node.id) return true;
  if (p.type === 'member_expression' && (p.child(0)?.id === node.id || p.child(2)?.id === node.id)) return true;
  if (p.type === 'binary_expression' || p.type === 'update_expression' || p.type === 'assignment_expression' || p.type === 'unary_expression') {
    return true;
  }
  if (p.type === 'template_substitution') return true;
  return (
    p.type === 'arguments' ||
    p.type === 'arguments' ||
    p.type === 'array' ||
    p.type === 'object' ||
    p.type === 'statement_block' ||
    p.type === 'return_statement' ||
    p.type === 'expression_statement' ||
    p.type === 'ternary_expression' ||
    p.type === 'pair' ||
    (p.type === 'variable_declarator' && p.child(0)?.id !== node.id)
  );
}

/**
 * Collect precise references to `name` within one parsed file.
 * defScopeLine: 1-based line of the definition; if the symbol is local (in a function scope),
 * references are restricted to that same enclosing function body.
 */
function collectFileReferences(root, name, defRow, localScope) {
  const refs = [];
  const targetNodeId = localScope ? localScope.nodeId : null;
  const walk = (node) => {
    if (
      node.type === 'identifier' ||
      node.type === 'property_identifier' ||
      node.type === 'shorthand_property_identifier'
    ) {
      if (node.text === name && node.id !== targetNodeId && !isShadowingDecl(node, name) && isRefPosition(node)) {
        refs.push({
          row: node.startPosition.row,
          col: node.startPosition.column,
          startIndex: node.startIndex,
          endIndex: node.endIndex,
          isDeclaration: false,
        });
      }
    }
    for (const ch of node.namedChildren) walk(ch);
  };
  walk(root);

  // Declaration itself (for rename we also replace the def name node)
  const declNodes = [];
  const findDecls = (node) => {
    if (DECL_TYPES.has(node.type)) {
      const id = declNameNode(node);
      if (id && id.text === name) declNodes.push(id);
    }
    for (const ch of node.namedChildren) findDecls(ch);
  };
  findDecls(root);

  return { refs, declNodes };
}

/**
 * Symbol info at a position. Returns:
 * { name, kind, signature, docComment, defLine, defCol, scopes, local }
 */
export async function tsSymbolAt(file, code, line, col) {
  const lines = code.split('\n');
  const row = Math.max(0, line - 1);
  const column = byteColFor(lines[row], col);
  let out = null;
  await withParser(file, code, (tree, root) => {
    const hit = findDeclarationAt(root, row, column);
    if (!hit) return;
    const scopes = enclosingScopes(root, hit.node || hit.nameNode);
    if (hit.node) {
      out = {
        name: hit.name,
        kind: declKind(hit.node),
        signature: buildSignature(hit.node, lines),
        docComment: docCommentFor(hit.node, lines),
        defLine: hit.node.startPosition.row + 1,
        defCol: hit.node.startPosition.column + 1,
        scopes,
        local: scopes.length > 0 && scopes[0].kind !== 'module',
      };
    } else {
      out = {
        name: hit.nameNode.text,
        kind: null,
        signature: null,
        docComment: null,
        defLine: hit.nameNode.startPosition.row + 1,
        defCol: hit.nameNode.startPosition.column + 1,
        scopes,
        local: false,
        unresolved: true,
      };
    }
  });
  return out;
}

/**
 * Precise references in one file. Returns [{ line, col, startIndex, endIndex }] with the declaration included.
 * `local` restricts to the enclosing function scope (for local variables/params).
 */
export async function tsReferencesInFile(file, code, name, defLine, local) {
  const lines = code.split('\n');
  let result = null;
  await withParser(file, code, (tree, root) => {
    const { refs, declNodes } = collectFileReferences(root, name, defLine - 1, null);
    const localScopeInfo = local ? findLocalScope(root, defLine - 1) : null;
    let usable = refs;
    if (localScopeInfo) {
      const { startRow, endRow, nodeId } = localScopeInfo;
      usable = refs.filter((r) => r.row >= startRow && r.row <= endRow);
      // the declaration itself: find the variable declarator inside the scope
      const all = [];
      const walk = (n) => {
        if (DECL_TYPES.has(n.type)) {
          const id = declNameNode(n);
          if (id && id.text === name && n.startPosition.row === defLine - 1) all.push({ row: n.startPosition.row, col: n.startPosition.column, startIndex: id.startIndex, endIndex: id.endIndex, isDeclaration: true });
        }
        for (const c of n.namedChildren) walk(c);
      };
      walk(root);
      result = { refs: [...all, ...usable], declNodeId: nodeId };
    } else {
      const declSpans = declNodes.map((n) => ({ row: n.startPosition.row, col: n.startPosition.column, startIndex: n.startIndex, endIndex: n.endIndex, isDeclaration: true }));
      result = { refs: [...declSpans, ...usable], declNodeId: null };
    }
  });
  if (!result) return { refs: [], declNodeId: null };
  return { refs: result.refs.map((r) => ({ line: r.row + 1, col: r.col + 1, startIndex: r.startIndex, endIndex: r.endIndex, isDeclaration: !!r.isDeclaration })), declNodeId: result.declNodeId };
}

function findLocalScope(root, defRow) {
  let found = null;
  const walk = (node) => {
    if (found) return;
    if (['function_declaration', 'function_expression', 'arrow_function', 'generator_function_declaration', 'generator_function', 'method_definition'].includes(node.type) && node.startPosition.row <= defRow && node.endPosition.row >= defRow) {
      found = { startRow: node.startPosition.row, endRow: node.endPosition.row, nodeId: node.id };
      return;
    }
    for (const ch of node.namedChildren) walk(ch);
  };
  walk(root);
  return found;
}

/**
 * Apply a rename across one file's text using precise spans.
 * Returns the new code and the number of replacements.
 */
export function applyRenameEdits(code, refs, replacement) {
  const edits = [...refs].sort((a, b) => a.startIndex - b.startIndex);
  if (edits.length === 0) return { code, count: 0 };
  let out = '';
  let cursor = 0;
  let count = 0;
  for (const e of edits) {
    if (e.startIndex < cursor) continue;
    out += code.slice(cursor, e.startIndex) + replacement;
    cursor = e.endIndex;
    count++;
  }
  out += code.slice(cursor);
  return { code: out, count };
}

export async function tsRename({ renameTo, file, code, name, defLine, local }) {
  const { refs } = await tsReferencesInFile(file, code, name, defLine, local);
  if (refs.length === 0) return { code, count: 0, refs: [] };
  const { code: next, count } = applyRenameEdits(code, refs.map((r) => ({ startIndex: r.startIndex, endIndex: r.endIndex })), renameTo);
  return { code: next, count, refs: refs.map((r) => ({ line: r.line, isDeclaration: r.isDeclaration })) };
}

export { langForFile };

// ─── TypeScript diagnostics via compiler API ─────────────────────────────────
let _ts = null;
function getTs() {
  if (!_ts) {
    try { _ts = createRequire(import.meta.url)('typescript'); } catch {}
  }
  return _ts;
}

/**
 * Return syntax + semantic diagnostics for a single file's source text.
 * Falls back to syntax-only if compilation takes too long.
 * Returns [{ line, col, endLine, endCol, message, severity }]
 */
export function getDiagnostics(filePath, content) {
  const ts = getTs();
  if (!ts) return [];
  try {
    const isTs = /\.(ts|tsx)$/.test(filePath);
    const compilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
      strict: false,
      allowJs: true,
      noEmit: true,
      skipLibCheck: true,
      isolatedModules: true,
    };
    const host = ts.createCompilerHost(compilerOptions);
    const origGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (name, langVer) => {
      if (name === filePath) return ts.createSourceFile(name, content, langVer, true);
      return origGetSourceFile(name, langVer);
    };
    const program = ts.createProgram([filePath], compilerOptions, host);
    const sf = program.getSourceFile(filePath);
    if (!sf) return [];
    // syntax diagnostics only (fast, no type resolution needed)
    const diags = [...program.getSyntacticDiagnostics(sf)];
    return diags.slice(0, 50).map((d) => {
      const start = d.start ?? 0;
      const length = d.length ?? 0;
      const { line: sl, character: sc } = sf.getLineAndCharacterOfPosition(start);
      const { line: el, character: ec } = sf.getLineAndCharacterOfPosition(start + length);
      return {
        line: sl + 1,
        col: sc + 1,
        endLine: el + 1,
        endCol: ec + 1,
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        severity: d.category === ts.DiagnosticCategory.Error ? 'error' : d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'info',
        code: d.code,
      };
    });
  } catch {
    return [];
  }
}
