import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronRight, Zap, Code, Bot, Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from '../utils/i18nMock';
import { useTheme, type ThemeMode } from '../utils/theme';

interface JarvisHomeProps {
  onStart: () => void;
}

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

const JarvisHome: React.FC<JarvisHomeProps> = ({ onStart }) => {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useTheme();

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const features = [
    { icon: Code, title: 'AI Code Generator', desc: 'Generate complete modules, components, and clean node backends inside isolated sandboxes.' },
    { icon: Zap, title: 'Node Automation', desc: 'Deploy workflow pipelines for messaging, triggers, and routing hooks in real time.' },
    { icon: Bot, title: 'Multi-Core Compute', desc: 'Failsafe stream switching across multiple AI providers with rotation backups.' },
  ];

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      {/* Top navigation */}
      <header className="sticky top-0 z-20 h-14 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 border border-line overflow-hidden">
              <img src="/favicon.svg" alt="Codevora AI" className="h-4.5 w-4.5 object-contain" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Codevora AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {[
              { label: 'Features', id: 'features' },
              { label: 'Pricing', id: 'pricing' },
              { label: 'Docs', id: 'docs' },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <select
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              value={i18n.language}
              aria-label="Language"
              className="hidden rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink-muted outline-none transition-colors hover:text-ink focus:border-line-strong sm:block"
            >
              <option value="en">EN</option>
              <option value="hi">हिन्दी</option>
              <option value="hinglish">Hinglish</option>
            </select>
            <button
              onClick={cycleTheme}
              aria-label={`Theme: ${theme}`}
              title={`Theme: ${theme}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onStart}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-hover"
            >
              {t('login')}
            </button>
            <button
              onClick={onStart}
              className="hidden rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition-opacity duration-150 hover:opacity-90 sm:block"
            >
              {t('get_started')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="mx-auto max-w-3xl py-20 text-center md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              AI workspace for building and shipping
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Build software with an AI workspace that stays out of your way.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg">
              Codevora AI brings a coding assistant, a full IDE, automation workflows, and a build
              toolkit together in one calm, focused workspace.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={onStart}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-fg transition-opacity duration-150 hover:opacity-90 sm:w-auto"
              >
                {t('get_started')}
                <ChevronRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => scrollTo('features')}
                className="inline-flex w-full items-center justify-center rounded-xl border border-line px-5 py-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-hover sm:w-auto"
              >
                Explore features
              </button>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-line py-16 md:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Everything in one workspace</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              The tools you need to generate, automate, and run AI-assisted development.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {features.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-canvas">
                  <item.icon className="h-4 w-4 text-ink" />
                </div>
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-line py-16 md:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Subscription tiers</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Access specialized workspace capabilities without hardware boundaries.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-line bg-surface p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink">Standard Node</h3>
                <span className="text-2xl font-semibold tracking-tight text-ink">$0</span>
              </div>
              <p className="mt-1 text-xs text-ink-subtle">Tier 1</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-muted">
                <li className="flex items-start gap-2"><Check /> Gemini 2.5 Flash stream queries</li>
                <li className="flex items-start gap-2"><Check /> Shared compute instance buffers</li>
                <li className="flex items-start gap-2"><Check /> Dashboard core UI access</li>
              </ul>
              <button
                onClick={onStart}
                className="mt-6 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-hover"
              >
                Start Standard
              </button>
            </div>

            <div className="relative flex flex-col rounded-xl border border-line-strong bg-surface p-6">
              <span className="absolute right-4 top-4 rounded-full border border-line bg-canvas px-2 py-0.5 text-[10px] font-medium tracking-wide text-ink-muted">
                Popular
              </span>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink">Advanced AI (Pro)</h3>
                <span className="text-2xl font-semibold tracking-tight text-ink">
                  $29<span className="ml-1 text-xs font-normal text-ink-subtle">/ mo</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-subtle">Pro</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-muted">
                <li className="flex items-start gap-2"><Check /> API direct cycles for Grok &amp; DeepSeek</li>
                <li className="flex items-start gap-2"><Check /> Dedicated buffer bandwidth streams</li>
                <li className="flex items-start gap-2"><Check /> Full automation control workspaces</li>
                <li className="flex items-start gap-2"><Check /> Failsafe priority stream rotations</li>
              </ul>
              <button
                onClick={onStart}
                className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity duration-150 hover:opacity-90"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </section>

        {/* Docs */}
        <section id="docs" className="scroll-mt-20 border-t border-line py-16 md:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Documentation</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Learn how to initialize your first Node instance and connect to the Codevora network.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: 'Getting Started', desc: 'Learn how to initialize your first Node instance and connect to the Codevora network architecture.', items: ['Quickstart Guide', 'Architecture Overview', 'Environment Setup'] },
              { title: 'API Reference', desc: 'Explore our comprehensive API documentation for integrating Gemini, Grok, and custom neural tools.', items: ['Request/Response Schemas', 'Authentication Hooks', 'Stream Rotation Logic'] },
            ].map((doc) => (
              <div key={doc.title} className="rounded-xl border border-line bg-surface p-6 transition-colors duration-150 hover:border-line-strong">
                <h3 className="text-sm font-semibold text-ink">{doc.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{doc.desc}</p>
                <ul className="mt-5 space-y-2 text-sm text-ink-muted">
                  {doc.items.map((it) => (
                    <li key={it} className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-ink-subtle sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 border border-line overflow-hidden">
              <img src="/favicon.svg" alt="Codevora AI" className="h-3.5 w-3.5 object-contain" />
            </div>
            <span>Codevora AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => scrollTo('features')} className="transition-colors hover:text-ink">Features</button>
            <button onClick={() => scrollTo('pricing')} className="transition-colors hover:text-ink">Pricing</button>
            <button onClick={() => scrollTo('docs')} className="transition-colors hover:text-ink">Docs</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

function Check() {
  return <Shield className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-subtle" aria-hidden="true" />;
}

export default JarvisHome;
