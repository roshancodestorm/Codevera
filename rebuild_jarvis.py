import re

file_path = r'e:\Codestrom\src\components\JarvisChat.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activeModule state
if 'const [activeModule, setActiveModule]' not in content:
    content = content.replace(
        "const [activeChatId, setActiveChatId] = useState<string>(chats[0].id);",
        "const [activeChatId, setActiveChatId] = useState<string>(chats[0].id);\n  const [activeModule, setActiveModule] = useState<string>('AI Coding Assistant');"
    )

# 2. Update Sidebar Modules
modules_old = """              {[
                { name: 'AI Coding Assistant', icon: Cpu },
                { name: 'Automation Control', icon: Zap },
                { name: 'WhatsApp Manager', icon: MessageSquare },
                { name: 'Telegram Bot', icon: Send },
                { name: 'App Builder', icon: Settings },
              ].map((item) => (
                <button key={item.name} className="flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-cyan-500/70 hover:bg-cyan-950/30 hover:text-cyan-300 transition-all text-xs">
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400/80" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}"""

modules_new = """              {[
                { name: 'AI Coding Assistant', icon: Cpu },
                { name: 'Automation Control', icon: Zap },
                { name: 'WhatsApp Manager', icon: MessageSquare },
                { name: 'Telegram Bot', icon: Send },
                { name: 'App Builder', icon: Settings },
                { name: 'Models & API', icon: Activity },
                { name: 'Admin Dashboard', icon: Shield },
              ].map((item) => (
                <button 
                  key={item.name} 
                  onClick={() => setActiveModule(item.name)}
                  className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs transition-all ${
                    activeModule === item.name 
                      ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-800/60 shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
                      : 'text-cyan-500/70 hover:bg-cyan-950/30 hover:text-cyan-300'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400/80" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}"""

content = content.replace(modules_old, modules_new)

# 3. Update the Top Bar left section to show activeModule
header_old = """            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}"""
header_new = """            <div className="flex items-center space-x-2">
              <span className="text-cyan-200 text-sm font-semibold uppercase tracking-wider">{activeModule}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}"""
if '<span className="text-cyan-200 text-sm font-semibold uppercase tracking-wider">' not in content:
    content = content.replace(header_old, header_new)

# 4. Wrap the AI Coding Assistant and add other modules
# Find the start of the chat column: `<div className="flex-1 flex flex-col min-w-[320px] relative z-10 bg-black/40">`
# And wrap it.

chat_start = '<div className="flex-1 flex flex-col min-w-[320px] relative z-10 bg-black/40">'
chat_start_new = '{activeModule === \'AI Coding Assistant\' && (\n          <>\n            ' + chat_start

if "activeModule === 'AI Coding Assistant'" not in content:
    content = content.replace(chat_start, chat_start_new)

    # Now find the end of the AI Coding Assistant block
    # It ends with `</AnimatePresence>\n    </div>\n  );\n};\n\nexport default JarvisChat;`
    end_pattern = '        )}\n      </AnimatePresence>\n    </div>\n  );\n};\n\nexport default JarvisChat;'
    
    other_modules = """        )}
      </AnimatePresence>
      </>
      )}

      {/* ─────────── TELEGRAM BOT ─────────── */}
      {activeModule === 'Telegram Bot' && (
        <div className="flex-1 p-8 overflow-y-auto bg-black relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 border-b border-cyan-900/40 pb-4">
              <Send className="w-8 h-8 text-cyan-400" />
              <div>
                <h2 className="text-2xl font-semibold text-cyan-100">Telegram Bot Manager</h2>
                <p className="text-cyan-600 text-sm">Configure and monitor your OpenClaw Telegram integrations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-cyan-950/20 border border-cyan-900/50 p-6 rounded-xl">
                <h3 className="text-lg font-medium text-cyan-300 mb-4">Bot Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-cyan-600 uppercase tracking-wider mb-1">Bot Token</label>
                    <input type="password" placeholder="Enter Telegram Bot Token..." className="w-full bg-black/50 border border-cyan-900/50 rounded-lg px-3 py-2 text-cyan-200 outline-none focus:border-cyan-500/50" />
                  </div>
                  <button className="px-4 py-2 bg-cyan-900/50 border border-cyan-700/50 rounded-lg text-cyan-200 hover:bg-cyan-800/50 transition-colors">Save Token</button>
                </div>
              </div>
              <div className="bg-cyan-950/20 border border-cyan-900/50 p-6 rounded-xl">
                <h3 className="text-lg font-medium text-cyan-300 mb-4">Status & Logs</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-sm text-yellow-500">Awaiting Configuration</span>
                </div>
                <div className="h-32 bg-black/60 border border-cyan-900/30 rounded-lg p-3 font-mono text-xs text-cyan-700 overflow-y-auto">
                  [13:00:00] Initializing Telegram bridge...<br/>
                  [13:00:01] Waiting for bot token...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── WHATSAPP MANAGER ─────────── */}
      {activeModule === 'WhatsApp Manager' && (
        <div className="flex-1 p-8 overflow-y-auto bg-black relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 border-b border-green-900/40 pb-4">
              <MessageSquare className="w-8 h-8 text-green-400" />
              <div>
                <h2 className="text-2xl font-semibold text-green-100">WhatsApp AI Manager</h2>
                <p className="text-green-600 text-sm">Chandan Persona / Neuro1 Integration</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-green-950/20 border border-green-900/50 p-6 rounded-xl">
                <h3 className="text-lg font-medium text-green-300 mb-4">Persona Configuration</h3>
                <p className="text-sm text-green-500/70 mb-4">Strictly enforcing natural, casual, and street-smart Hinglish tone.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-green-600 uppercase tracking-wider mb-1">Session ID / Number</label>
                    <input type="text" placeholder="Enter target number or session ID..." className="w-full bg-black/50 border border-green-900/50 rounded-lg px-3 py-2 text-green-200 outline-none focus:border-green-500/50" />
                  </div>
                  <button className="px-4 py-2 bg-green-900/50 border border-green-700/50 rounded-lg text-green-200 hover:bg-green-800/50 transition-colors">Start Session</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── APP BUILDER ─────────── */}
      {activeModule === 'App Builder' && (
        <div className="flex-1 p-8 overflow-y-auto bg-black relative z-10">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-indigo-900/40 pb-4">
              <div className="flex items-center space-x-4">
                <Settings className="w-8 h-8 text-indigo-400" />
                <div>
                  <h2 className="text-2xl font-semibold text-indigo-100">App Builder Sandbox</h2>
                  <p className="text-indigo-600 text-sm">Test and preview generated components</p>
                </div>
              </div>
              <button className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                Deploy App
              </button>
            </div>
            <div className="h-[600px] bg-white rounded-xl overflow-hidden border border-indigo-900/50 shadow-2xl relative">
                <iframe 
                  src="http://localhost:5178" 
                  className="w-full h-full border-none"
                  title="App Builder Preview"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 backdrop-blur text-indigo-400 text-xs font-mono rounded border border-indigo-500/30">
                  Live Preview (Port 5178)
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── MODELS & API ─────────── */}
      {activeModule === 'Models & API' && (
        <div className="flex-1 p-8 overflow-y-auto bg-black relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 border-b border-purple-900/40 pb-4">
              <Activity className="w-8 h-8 text-purple-400" />
              <div>
                <h2 className="text-2xl font-semibold text-purple-100">AI Model Compatibility</h2>
                <p className="text-purple-600 text-sm">Manage API Keys and Local Ollama Models</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-950/20 border border-purple-900/50 p-6 rounded-xl">
                <h3 className="text-lg font-medium text-purple-300 mb-4">Cloud Providers</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border border-purple-900/30 bg-black/40 rounded-lg">
                    <span className="text-sm text-purple-200">Gemini 2.5 Flash</span>
                    <span className={`text-xs px-2 py-1 rounded ${hasApiKey ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-red-900/40 text-red-400 border border-red-800/50'}`}>{hasApiKey ? 'Connected' : 'Missing Key'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-purple-900/30 bg-black/40 rounded-lg">
                    <span className="text-sm text-purple-200">Blackbox AI (DeepSeek)</span>
                    <span className={`text-xs px-2 py-1 rounded ${BLACKBOX_API_KEY && BLACKBOX_API_KEY !== 'YOUR_BLACKBOX_API_KEY_HERE' ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-red-900/40 text-red-400 border border-red-800/50'}`}>{BLACKBOX_API_KEY && BLACKBOX_API_KEY !== 'YOUR_BLACKBOX_API_KEY_HERE' ? 'Connected' : 'Missing Key'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-purple-900/30 bg-black/40 rounded-lg">
                    <span className="text-sm text-purple-200">Grok 2 (xAI)</span>
                    <span className={`text-xs px-2 py-1 rounded ${GROK_API_KEY && GROK_API_KEY !== 'YOUR_GROK_API_KEY_HERE' ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-red-900/40 text-red-400 border border-red-800/50'}`}>{GROK_API_KEY && GROK_API_KEY !== 'YOUR_GROK_API_KEY_HERE' ? 'Connected' : 'Missing Key'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-purple-950/20 border border-purple-900/50 p-6 rounded-xl">
                <h3 className="text-lg font-medium text-purple-300 mb-4">Local Models (Ollama)</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-red-500">Service Offline (Port 11434)</span>
                </div>
                <p className="text-xs text-purple-500/70">Start the local Ollama service to use local models for coding and chat.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── AUTOMATION CONTROL ─────────── */}
      {activeModule === 'Automation Control' && (
        <div className="flex-1 p-8 overflow-y-auto bg-black relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 border-b border-orange-900/40 pb-4">
              <Zap className="w-8 h-8 text-orange-400" />
              <div>
                <h2 className="text-2xl font-semibold text-orange-100">Automation Control Center</h2>
                <p className="text-orange-600 text-sm">OpenClaw CLI & Email Draft Integrations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-orange-950/20 border border-orange-900/50 p-6 rounded-xl cursor-pointer hover:bg-orange-900/30 transition-all">
                  <h3 className="text-lg font-medium text-orange-300 mb-2">Email Drafter</h3>
                  <p className="text-sm text-orange-500/70 mb-4">Generate professional emails using AI.</p>
                  <button className="w-full py-2 bg-orange-900/50 border border-orange-700/50 text-orange-200 rounded text-sm hover:bg-orange-800/50">Open Email Generator</button>
              </div>
              <div className="bg-orange-950/20 border border-orange-900/50 p-6 rounded-xl cursor-pointer hover:bg-orange-900/30 transition-all">
                  <h3 className="text-lg font-medium text-orange-300 mb-2">Social Media Poster</h3>
                  <p className="text-sm text-orange-500/70 mb-4">Automate LinkedIn & Twitter posts.</p>
                  <button className="w-full py-2 bg-orange-900/50 border border-orange-700/50 text-orange-200 rounded text-sm hover:bg-orange-800/50">Configure Poster</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ─────────── ADMIN DASHBOARD ─────────── */}
      {activeModule === 'Admin Dashboard' && (
        <div className="flex-1 p-8 overflow-y-auto bg-black relative z-10 flex items-center justify-center">
           <div className="text-center">
             <Shield className="w-16 h-16 text-cyan-900 mx-auto mb-4" />
             <h2 className="text-xl text-cyan-500 font-semibold">Admin Area Protected</h2>
           </div>
        </div>
      )}

    </div>
  );
};

export default JarvisChat;"""
    content = content.replace(end_pattern, other_modules)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: JarvisChat.tsx reconstructed.")
