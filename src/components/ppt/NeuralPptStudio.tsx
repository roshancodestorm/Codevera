import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Maximize2, 
  Settings, 
  Download, 
  Play, 
  Edit3, 
  Layout, 
  Layers, 
  Palette,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Save,
  Undo,
  Redo,
  Sparkles,
  Type,
  Image as ImageIcon,
  Square,
  Smile,
  Search,
  Grid,
  MoreHorizontal,
  Trash2,
  Copy,
  Plus,
  Zap,
  Star,
  ExternalLink
} from 'lucide-react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import Reveal from 'reveal.js';
import type { PptData, PptSlide } from '../../types/ppt';

interface NeuralPptStudioProps {
  data: PptData;
  onClose: () => void;
  onExport: (data: PptData) => void;
}

const NeuralPptStudio: React.FC<NeuralPptStudioProps> = ({ data, onClose, onExport }) => {
  const [currentMode, setCurrentMode] = useState<'preview' | 'edit'>('edit');
  const [activeTab, setActiveTab] = useState<'templates' | 'text' | 'photos' | 'icons' | 'shapes'>('templates');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [photoSearch, setPhotoSearch] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const revealRef = useRef<HTMLDivElement>(null);
  const grapesRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const revealInstance = useRef<any>(null);

  // 📸 Live Photo Search (Simulation with Unsplash Keywords)
  useEffect(() => {
    const fetchPhotos = async () => {
      setIsSearching(true);
      await new Promise(r => setTimeout(r, 800));
      const query = photoSearch || 'minimalist architecture';
      const newPhotos = [
        `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80`,
        `https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80`,
        `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80`,
        `https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80`,
        `https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=80`,
        `https://images.unsplash.com/photo-1433086566608-5732f1682c85?auto=format&fit=crop&w=400&q=80`,
        `https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=400&q=80`,
        `https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80`,
      ];
      setPhotos(newPhotos);
      setIsSearching(false);
    };

    const timer = setTimeout(fetchPhotos, 500);
    return () => clearTimeout(timer);
  }, [photoSearch]);

  // 🌍 Dynamic Stylesheet Injection
  useEffect(() => {
    const links = [
      { id: 'reveal-core', href: 'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.0/reveal.min.css' },
      { id: 'reveal-theme', href: 'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.0/theme/black.min.css' }
    ];

    links.forEach(linkData => {
      if (!document.getElementById(linkData.id)) {
        const link = document.createElement('link');
        link.id = linkData.id;
        link.rel = 'stylesheet';
        link.href = linkData.href;
        document.head.appendChild(link);
      }
    });
  }, []);

  // 🎥 Initialize Reveal.js for Preview Mode
  useEffect(() => {
    if (currentMode === 'preview' && revealRef.current) {
      if (revealInstance.current) {
        revealInstance.current.destroy();
      }
      revealInstance.current = new Reveal(revealRef.current, {
        embedded: true,
        hash: false,
        respondToHashChanges: false,
        history: false,
        keyboard: true,
        touch: true,
        center: true,
        controls: true,
        progress: true,
        transition: 'convex',
      });
      revealInstance.current.initialize();
      
      revealInstance.current.on('slidechanged', (event: any) => {
        setCurrentSlideIndex(event.indexh);
      });
    }
  }, [currentMode, data]);

  // 🎨 Initialize GrapesJS for Edit Mode
  useEffect(() => {
    if (currentMode === 'edit' && grapesRef.current && !editorRef.current) {
      editorRef.current = grapesjs.init({
        container: grapesRef.current,
        fromElement: false,
        height: '100%',
        width: '100%',
        storageManager: false,
        panels: { defaults: [] },
        blockManager: {
          blocks: [
            { id: 'text', label: 'Text', content: '<div style="padding: 10px;">Insert Text</div>' },
            { id: 'image', label: 'Image', content: { type: 'image' } },
          ]
        },
      });

      const doc = editorRef.current.Canvas.getDocument();
      if (doc) {
        const style = doc.createElement('style');
        style.innerHTML = `
          body { 
            background: #111; 
            color: #fff; 
            font-family: 'Outfit', sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0;
            overflow: hidden; 
          }
          .slide-workspace { 
            width: 800px; 
            height: 450px; 
            background: #000; 
            position: relative; 
            box-shadow: 0 40px 100px rgba(0,0,0,0.8);
            border: 1px solid #333;
          }
        `;
        doc.head.appendChild(style);
      }
    }
  }, [currentMode]);

  const SidebarButton = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full py-4 flex flex-col items-center justify-center space-y-1 transition-all relative ${activeTab === id ? 'text-ink-muted bg-accent/5' : 'text-ink-muted hover:text-ink'}`}
    >
      {activeTab === id && <motion.div layoutId="sidebar-active" className="absolute right-0 top-0 bottom-0 w-1 bg-accent" />}
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-canvas flex flex-col overflow-hidden font-sans text-ink">
      {/* ── Top Bar (Polotno Style) ────────────────────────────────────────── */}
      <div className="h-14 bg-elevated border-b border-line px-4 flex items-center justify-between shadow-2xl z-20">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-elevated rounded-xl flex items-center justify-center ">
              <Zap className="w-5 h-5 text-ink" />
            </div>
            <div>
              <span className="text-xs font-black tracking-[0.2em] uppercase text-ink">Neural Studio</span>
              <div className="flex items-center space-x-1">
                 <Star className="w-2 h-2 text-amber-500 fill-amber-500" />
                 <span className="text-[8px] font-bold text-ink-muted uppercase">Pro Engine Active</span>
              </div>
            </div>
          </div>
          <div className="h-4 w-[1px] bg-hover" />
          <div className="flex items-center space-x-2 text-[10px] font-bold text-ink-muted group">
            <span className="group-hover:text-ink transition-colors">{data.slides[0]?.title || 'Untitled Presentation'}</span>
            <Edit3 className="w-3 h-3 cursor-pointer hover:text-ink-muted" />
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-surface p-1.5 rounded-xl border border-line">
          <button 
            onClick={() => setCurrentMode('edit')}
            className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentMode === 'edit' ? 'bg-elevated text-ink shadow-xl' : 'text-ink-muted hover:text-ink'}`}
          >
            Design
          </button>
          <button 
            onClick={() => setCurrentMode('preview')}
            className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentMode === 'preview' ? 'bg-elevated text-ink shadow-xl' : 'text-ink-muted hover:text-ink'}`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
             <button className="p-2 text-ink-muted hover:text-ink transition-colors hover:bg-hover rounded-lg"><Undo className="w-4 h-4" /></button>
             <button className="p-2 text-ink-muted hover:text-ink transition-colors hover:bg-hover rounded-lg"><Redo className="w-4 h-4" /></button>
          </div>
          <button 
            onClick={() => onExport(data)}
            className="px-5 py-2 bg-elevated text-accent-fg rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 "
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
          <button onClick={onClose} className="p-2 hover:bg-red-500/10 rounded-xl group transition-all">
            <X className="w-5 h-5 text-ink-muted group-hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* ── Main Workspace ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leftmost Icon Sidebar */}
        <div className="w-16 bg-elevated border-r border-line flex flex-col pt-2 shadow-xl z-10">
          <SidebarButton id="templates" icon={Grid} label="Layouts" />
          <SidebarButton id="photos" icon={ImageIcon} label="Photos" />
          <SidebarButton id="text" icon={Type} label="Text" />
          <SidebarButton id="shapes" icon={Square} label="Shapes" />
          <SidebarButton id="icons" icon={Smile} label="Icons" />
          <div className="mt-auto pb-4">
            <SidebarButton id="more" icon={MoreHorizontal} label="More" />
          </div>
        </div>

        {/* Secondary Content Panel */}
        <AnimatePresence mode="wait">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            key={activeTab}
            className="w-72 bg-elevated border-r border-line flex flex-col z-0"
          >
            <div className="p-4 border-b border-line">
               <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-4">{activeTab}</h3>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                 <input 
                  type="text" 
                  value={photoSearch}
                  onChange={(e) => setPhotoSearch(e.target.value)}
                  placeholder={`Search ${activeTab}...`} 
                  className="w-full bg-surface border-none rounded-lg py-2.5 pl-10 pr-4 text-xs text-ink placeholder:text-ink-muted focus:ring-1 focus:ring-line-strong outline-none transition-all"
                 />
                 {isSearching && (
                   <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 border-2 border-line-strong border-t-ink rounded-full animate-spin" />
                   </div>
                 )}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'templates' && (
                <div className="grid grid-cols-1 gap-4">
                  {data.slides.map((slide, idx) => (
                    <div 
                      key={slide.id}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${currentSlideIndex === idx ? 'border-line-strong ' : 'border-transparent hover:border-line'}`}
                    >
                      <div className="aspect-video bg-canvas flex flex-col p-3">
                        <div className="flex items-center justify-between mb-2">
                           <div className="text-[8px] font-black text-ink-muted uppercase tracking-widest">Slide {idx + 1}</div>
                           <div className="px-1.5 py-0.5 bg-hover rounded text-[7px] font-bold text-ink-subtle uppercase">{slide.type}</div>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="text-[9px] text-ink font-black uppercase line-clamp-1 mb-1">{slide.title}</div>
                          <div className="w-4 h-[1px] bg-accent" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-surface opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                         <button className="p-2 bg-surface text-accent-fg rounded-lg hover:scale-110 transition-transform shadow-xl"><Copy className="w-3 h-3" /></button>
                         <button className="p-2 bg-red-500 text-ink rounded-lg hover:scale-110 transition-transform shadow-xl"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-6 border-2 border-dashed border-line rounded-xl text-ink-muted hover:text-ink-subtle hover:border-line transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center space-y-2 group">
                     <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     <span>Add Page</span>
                  </button>
                </div>
              )}
              {activeTab === 'photos' && (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((src, i) => (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      key={src + i} 
                      className="aspect-square bg-elevated rounded-lg overflow-hidden cursor-pointer group relative"
                    >
                      <img src={src} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="stock" />
                      <div className="absolute inset-0 bg-elevated group-hover:bg-elevated transition-all flex items-center justify-center">
                         <Plus className="w-6 h-6 text-ink opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {activeTab === 'text' && (
                <div className="space-y-3">
                   <div className="p-6 bg-hover border border-line rounded-xl flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-hover transition-all">
                      <Type className="w-8 h-8 text-ink mb-3" />
                      <span className="text-xs font-black text-ink uppercase tracking-widest">Add a heading</span>
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                      <div className="p-3 bg-hover rounded-lg text-ink-subtle text-[10px] font-bold uppercase tracking-widest hover:text-ink cursor-pointer border border-transparent hover:border-line transition-all">Add a subheading</div>
                      <div className="p-3 bg-hover rounded-lg text-ink-muted text-[9px] font-bold uppercase tracking-widest hover:text-ink cursor-pointer border border-transparent hover:border-line transition-all">Add body text</div>
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Central Editing Canvas Area */}
        <div className="flex-1 bg-canvas relative flex flex-col">
          {/* Contextual Toolbar */}
          <div className="h-12 bg-surface border-b border-line px-6 flex items-center justify-between">
             <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3 bg-surface px-3 py-1.5 rounded-lg border border-line">
                   <span className="text-[10px] text-ink-muted font-black uppercase tracking-widest">Font</span>
                   <select className="bg-transparent border-none text-[10px] text-ink font-bold outline-none cursor-pointer">
                      <option>Outfit Bold</option>
                      <option>Inter ExtraBold</option>
                   </select>
                </div>
                <div className="flex items-center space-x-3 bg-surface px-3 py-1.5 rounded-lg border border-line">
                   <span className="text-[10px] text-ink-muted font-black uppercase tracking-widest">Size</span>
                   <input type="number" defaultValue={64} className="bg-transparent border-none text-[10px] text-ink font-bold outline-none w-8 text-center" />
                </div>
                <div className="flex items-center space-x-2">
                   <div className="w-5 h-5 bg-accent rounded-lg cursor-pointer border-2 border-line shadow-lg" />
                   <div className="w-5 h-5 bg-elevated rounded-lg cursor-pointer border-2 border-line" />
                </div>
             </div>
             <div className="flex items-center space-x-4 text-[9px] text-ink-muted font-black uppercase tracking-[0.2em]">
                <button className="px-3 py-1.5 hover:text-ink transition-colors border border-transparent hover:border-line rounded-lg">Animate</button>
                <button className="px-3 py-1.5 hover:text-ink transition-colors border border-transparent hover:border-line rounded-lg">Position</button>
                <button className="px-3 py-1.5 bg-elevated text-ink-muted border border-line-strong rounded-lg">Effects</button>
             </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center p-16 overflow-auto custom-scrollbar bg-[radial-gradient(circle_at_center,#1c1c1f_0%,#121214_100%)]">
             {/* Slide Canvas Wrapper */}
             <div className="relative group">
                <div className="relative shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-line overflow-hidden rounded-sm transition-all duration-500">
                   <div className="w-[854px] h-[480px] bg-canvas relative">
                     {currentMode === 'edit' ? (
                       <div className="w-full h-full" ref={grapesRef} />
                     ) : (
                       <motion.div 
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full p-20 flex flex-col justify-center"
                       >
                          {data.slides[currentSlideIndex]?.type === 'title' ? (
                            <div className="text-center relative">
                               <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                 <h1 className="text-7xl font-black text-ink uppercase tracking-tighter mb-6 leading-none">
                                   {data.slides[currentSlideIndex].title}
                                 </h1>
                                 <div className="flex items-center justify-center space-x-4">
                                    <div className="h-0.5 w-12 bg-accent" />
                                    <p className="text-2xl text-ink-muted font-bold uppercase tracking-[0.4em]">
                                      {data.slides[currentSlideIndex].subtitle}
                                    </p>
                                    <div className="h-0.5 w-12 bg-accent" />
                                 </div>
                               </motion.div>
                            </div>
                          ) : (
                            <div className="flex flex-col h-full">
                               <h2 className="text-4xl font-black text-ink mb-12 border-l-8 border-line-strong pl-6 uppercase tracking-wider">
                                  {data.slides[currentSlideIndex]?.title}
                               </h2>
                               <div className="grid grid-cols-2 gap-16 flex-1">
                                  <ul className="space-y-6">
                                     {data.slides[currentSlideIndex]?.content?.map((p, i) => (
                                       <motion.li 
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 + (i * 0.1) }}
                                        key={i} 
                                        className="flex items-start space-x-4 text-xl text-ink font-medium"
                                       >
                                         <div className="w-3 h-3 bg-accent rounded-full mt-2 " />
                                         <span>{p}</span>
                                       </motion.li>
                                     ))}
                                  </ul>
                                  {data.slides[currentSlideIndex]?.imageQuery && (
                                    <div className="relative rounded-2xl overflow-hidden border border-line shadow-2xl">
                                       <img 
                                        src={`https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80`} 
                                        className="w-full h-full object-cover"
                                        alt="slide"
                                       />
                                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    </div>
                                  )}
                               </div>
                            </div>
                          )}
                       </motion.div>
                     )}
                   </div>
                </div>
                
                {/* Visual Scale Indicator */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-4 opacity-40 hover:opacity-100 transition-opacity">
                  <div className="text-[10px] text-ink-muted font-mono tracking-widest uppercase">HD 1920x1080 | Layer: Canvas</div>
                  <ExternalLink className="w-3 h-3 text-ink-muted" />
                </div>
             </div>
          </div>

          {/* Bottom Zoom & Slide Control */}
          <div className="h-12 bg-elevated border-t border-line px-8 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
             <div className="flex items-center space-x-6">
                <button className="p-1.5 text-ink-muted hover:text-ink transition-colors"><Maximize2 className="w-4 h-4" /></button>
                <div className="flex items-center space-x-3">
                   <span className="text-[10px] text-ink-muted font-mono">-</span>
                   <div className="w-40 h-1 bg-hover rounded-full overflow-hidden cursor-pointer group">
                      <div className="w-1/2 h-full bg-accent group-hover:bg-accent transition-colors " />
                   </div>
                   <span className="text-[10px] text-ink-muted font-mono">+</span>
                   <span className="text-[10px] text-ink-subtle font-mono ml-2 font-bold">50%</span>
                </div>
             </div>
             
             <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2 bg-surface px-4 py-1.5 rounded-lg border border-line">
                   <Monitor className="w-3 h-3 text-ink-muted" />
                   <span className="text-[10px] text-ink-muted font-black uppercase tracking-widest">Widescreen 16:9</span>
                </div>
                <div className="flex items-center space-x-4">
                   <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                        className="p-1.5 text-ink-muted hover:text-ink hover:bg-hover rounded-lg transition-all disabled:opacity-20"
                        disabled={currentSlideIndex === 0}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="px-3 py-1 bg-hover rounded-md border border-line">
                        <span className="text-[10px] text-ink font-black uppercase tabular-nums">{currentSlideIndex + 1} / {data.slides.length}</span>
                      </div>
                      <button 
                        onClick={() => setCurrentSlideIndex(Math.min(data.slides.length - 1, currentSlideIndex + 1))}
                        className="p-1.5 text-ink-muted hover:text-ink hover:bg-hover rounded-lg transition-all disabled:opacity-20"
                        disabled={currentSlideIndex === data.slides.length - 1}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralPptStudio;
