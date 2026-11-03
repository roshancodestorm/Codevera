export const AGENT_META: Record<string, { title: string; icon: string; color: string }> = {
  planner: { title: 'Planner', icon: '🧭', color: '#a78bfa' },
  architect: { title: 'Architect', icon: '🏛️', color: '#60a5fa' },
  coder: { title: 'Coder', icon: '👨‍💻', color: '#34d399' },
  executor: { title: 'Executor', icon: '🛠️', color: '#34d399' },
  debugger: { title: 'Debugger', icon: '🐞', color: '#fbbf24' },
  tester: { title: 'Tester', icon: '🧪', color: '#f472b6' },
  reviewer: { title: 'Reviewer', icon: '🔍', color: '#fb7185' },
  fixer: { title: 'Fixer', icon: '🔧', color: '#fbbf24' },
  docs: { title: 'Documentation', icon: '📚', color: '#38bdf8' },
  pipeline: { title: 'Pipeline', icon: '⚙️', color: '#94a3b8' },
};

export const SUGGESTED_TASKS = [
  'Build a simple calculator app with HTML/CSS/JS',
  'Create a todo app with localStorage persistence',
  'Make a landing page with a hero, features and pricing sections',
  'Build a weather app UI that fetches from an API',
  'Create a pixel-art editor with canvas',
  'Build a typing speed test game',
  'Make a chat interface prototype with mock data',
  'Create a digital clock with theme toggle',
];

export const ITERATION_TASKS = [
  'Make it look more premium — polish the spacing, colors and typography',
  'Add smooth animations and transitions to the UI',
  'Make the layout fully responsive for mobile',
  'Add dark/light theme toggle and persist it',
  'Improve accessibility: focus states, contrast, semantic HTML',
  'Add a settings section with toggles',
  'Fix any visual glitches and polish the details',
];
