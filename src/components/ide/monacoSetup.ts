import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker.js?worker';
import cssWorker from 'monaco-editor/language/css/css.worker.js?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker.js?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

monaco.editor.defineTheme('neural-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'a78bfa' },
    { token: 'string', foreground: '86efac' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'type', foreground: '7dd3fc' },
    { token: 'identifier', foreground: 'e4e4e7' },
    { token: 'delimiter', foreground: 'a1a1aa' },
    { token: 'tag', foreground: 'f472b6' },
  ],
  colors: {
    'editor.background': '#0c0c10',
    'editor.foreground': '#e4e4e7',
    'editor.lineHighlightBackground': '#141419',
    'editorLineNumber.foreground': '#3f3f46',
    'editorLineNumber.activeForeground': '#a1a1aa',
    'editorCursor.foreground': '#8b5cf6',
    'editor.selectionBackground': '#3b2f66',
    'editor.inactiveSelectionBackground': '#26263a',
    'editorIndentGuide.background1': '#1c1c22',
    'editorIndentGuide.activeBackground1': '#2c2c34',
    'editorWhitespace.foreground': '#24242c',
    'editorGutter.background': '#0c0c10',
    'scrollbarSlider.background': '#2c2c34',
    'scrollbarSlider.hoverBackground': '#3a3a44',
    'scrollbarSlider.activeBackground': '#4a4a56',
  },
});

monaco.editor.defineTheme('neural-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '8a8a94', fontStyle: 'italic' },
    { token: 'keyword', foreground: '7c3aed' },
    { token: 'string', foreground: '15803d' },
    { token: 'number', foreground: 'b45309' },
    { token: 'type', foreground: '0369a1' },
    { token: 'identifier', foreground: '18181b' },
    { token: 'delimiter', foreground: '52525b' },
    { token: 'tag', foreground: 'be185d' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#18181b',
    'editor.lineHighlightBackground': '#f4f4f5',
    'editorLineNumber.foreground': '#c4c4c9',
    'editorLineNumber.activeForeground': '#52525b',
    'editorCursor.foreground': '#7c3aed',
    'editor.selectionBackground': '#ddd6fe',
    'editor.inactiveSelectionBackground': '#eee9ff',
    'editorIndentGuide.background1': '#ececef',
    'editorIndentGuide.activeBackground1': '#d4d4d8',
    'editorWhitespace.foreground': '#e4e4e7',
    'editorGutter.background': '#ffffff',
    'scrollbarSlider.background': '#d4d4d8',
    'scrollbarSlider.hoverBackground': '#b8b8bf',
    'scrollbarSlider.activeBackground': '#a1a1aa',
  },
});

/** Apply the editor theme that matches the resolved app theme. */
export function applyEditorTheme(dark: boolean): void {
  monaco.editor.setTheme(dark ? 'neural-dark' : 'neural-light');
}

/** Resolve the initial editor theme from the pre-paint `.dark` class set in index.html. */
export function initialEditorDark(): boolean {
  try {
    return document.documentElement.classList.contains('dark');
  } catch {
    return true;
  }
}

applyEditorTheme(initialEditorDark());

export default monaco;
