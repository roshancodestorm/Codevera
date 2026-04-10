/**
 * Codevora AI - Intelligent Agent Router
 * 
 * Analyzes incoming user queries to map to a specialized 
 * sub-agent node context (Coding, Automation, Data, Chat).
 */

export interface RouterOutput {
  agent: 'Coding Agent' | 'Automation Agent' | 'Data Agent' | 'Chat Agent';
  reason: string;
  task: string;
}

export const detectIntent = (input: string): RouterOutput => {
  const query = input.toLowerCase();

  // 📂 1. Data Agent Matches
  const dataKeywords = ['analyze', 'csv', 'dataset', 'dataframe', 'table', 'metrics', 'chart'];
  if (dataKeywords.some(key => query.includes(key))) {
    return {
      agent: 'Data Agent',
      reason: 'User mentioned analytical commands or dataset references (CSV/Dataframes).',
      task: 'Load variables, parse columns on nodes, and output aggregate summary insights.'
    };
  }

  // 🤖 2. Automation Agent Matches
  const autoKeywords = ['automate', 'workflow', 'trigger', 'whatsapp', 'telegram', 'cron', 'pipeline'];
  if (autoKeywords.some(key => query.includes(key))) {
    return {
      agent: 'Automation Agent',
      reason: 'User mentioned triggering pipelines or communicating with messaging automation stream handles.',
      task: 'Initialize workflow trigger controllers and wire node-red triggers setup.'
    };
  }

  // 💻 3. Coding Agent Matches
  const codeKeywords = ['code', 'write a', 'function', 'class', 'bug', 'debug', 'component', 'script', 'refactor'];
  if (codeKeywords.some(key => query.includes(key))) {
    return {
      agent: 'Coding Agent',
      reason: 'User is requesting logic generation, debugging fixes, or structured code refactoring presets.',
      task: 'Generate isolated modules containing setup headers, standard docstrings, and verified file loops.'
    };
  }

  // 💬 4. Default -> Chat Agent
  return {
    agent: 'Chat Agent',
    reason: 'Prompt contains generic questions describing summaries or concepts without active builder directives.',
    task: 'Formulate friendly markdown-rich guidance addressing system preamble responses.'
  };
};

/**
 * Example Usage inside JarvisChat:
 * 
 * const { agent, task } = detectIntent(input);
 * console.log(`[ROUTER] Routing task to ${agent}...`);
 * setCurrentAgent(agent);
 */
