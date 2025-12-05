import React, { useState, useCallback, useEffect } from 'react';
import { 
  Play, 
  Layers, 
  Image as ImageIcon, 
  Settings, 
  Menu,
  X,
  Sparkles,
  Terminal,
  Lock,
  Key,
  Trash2,
  Download,
  LogOut,
  PenTool
} from 'lucide-react';
import { 
  ProductionBlueprint, 
  AgentLog, 
  AgentStatus 
} from './types';
import { 
  INITIAL_BLUEPRINT, 
  VIDEO_TYPES 
} from './constants';
import {
  runResearchAgent,
  runScriptAgent,
  runVisualAgent,
  runMarketingAgent,
  runLogicAgent,
  runStrategyAgent
} from './services/geminiService';

import AgentLogPanel from './components/AgentLogPanel';
import BlueprintView from './components/BlueprintView';
import AssetStudio from './components/AssetStudio';
import CustomTopicManager from './components/CustomTopicManager';

const STORAGE_KEY_VIDEOS = 'quillnexus_video_types';
const STORAGE_KEY_COMPLETED = 'quillnexus_completed_videos';
const STORAGE_KEY_API_KEY = 'quillnexus_api_key';

const App: React.FC = () => {
  // State
  const [blueprint, setBlueprint] = useState<ProductionBlueprint>(INITIAL_BLUEPRINT);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'blueprint' | 'studio' | 'custom'>('blueprint');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  
  // Phase Management State (with Persistence)
  const [videoTypes, setVideoTypes] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VIDEOS);
    return saved ? JSON.parse(saved) : VIDEO_TYPES;
  });

  const [completedVideos, setCompletedVideos] = useState<Set<number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COMPLETED);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Shared Asset State (Lifted from AssetStudio)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(videoTypes));
  }, [videoTypes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(Array.from(completedVideos)));
  }, [completedVideos]);

  // Dynamic Phase Logic
  const totalVideosAvailable = Object.keys(videoTypes).length;
  // Check if every video in the current list has been completed
  const isCurrentPhaseComplete = totalVideosAvailable > 0 && 
    Array.from({length: totalVideosAvailable}, (_, i) => i + 1).every(n => completedVideos.has(n));

  const currentPhase = Math.ceil(totalVideosAvailable / 5);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      // Check localStorage first
      const storedKey = localStorage.getItem(STORAGE_KEY_API_KEY);
      if (storedKey) {
        setHasApiKey(true);
        return;
      }

      // Fallback to Window check for IDX/dev environment
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
            setHasApiKey(true);
            return;
        }
      }
      
      // If we are in a dev environment with pre-injected keys (e.g. process.env.API_KEY is handled by build tool not runtime)
      // This is risky if env var is empty, but for some setups it's needed.
      // However, for this feature request, we enforce manual entry if not found.
      setHasApiKey(false);
    };
    checkKey();
  }, []);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim().length > 10) { // Basic validation
        localStorage.setItem(STORAGE_KEY_API_KEY, apiKeyInput.trim());
        setHasApiKey(true);
        setApiKeyInput('');
    } else {
        alert("Please enter a valid API key.");
    }
  };

  const handleDisconnectKey = () => {
    if (confirm("Are you sure you want to disconnect your API Key?")) {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
        setHasApiKey(false);
        window.location.reload();
    }
  };

  const handleConnectKeyHelper = async () => {
    // Helper for AI Studio environment
    if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
    }
  };

  const handleResetProgress = () => {
    if (confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
        setVideoTypes(VIDEO_TYPES);
        setCompletedVideos(new Set());
        localStorage.removeItem(STORAGE_KEY_VIDEOS);
        localStorage.removeItem(STORAGE_KEY_COMPLETED);
        setBlueprint(INITIAL_BLUEPRINT);
        window.location.reload();
    }
  };

  const handleDownloadScript = () => {
    if (!blueprint.scriptContent.body && !blueprint.scriptContent.hook) return;

    const lines = [
        `PROJECT: ${blueprint.seoData.selectedTitle || 'Untitled'}`,
        `VIDEO TYPE: ${blueprint.videoType}`,
        `===========================================`,
        ``,
        `[SCRIPT]`,
        `HOOK: ${blueprint.scriptContent.hook}`,
        ``,
        `BODY:`,
        `${blueprint.scriptContent.body}`,
        ``,
        `CTA: ${blueprint.scriptContent.cta}`,
        ``,
        `[SCENE BREAKDOWN & VOICEOVER]`,
        ...blueprint.scriptContent.sceneBreakdown,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Script_Video_${blueprint.videoNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to add logs
  const addLog = useCallback((agentName: string, message: string, type: AgentLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      agentName,
      message,
      timestamp: Date.now(),
      type
    }]);
  }, []);

  const handleAddCustomTopic = (title: string, type: string) => {
    const nextNum = totalVideosAvailable + 1;
    const entry = `${type} / ${title}`;
    
    setVideoTypes(prev => ({
      ...prev,
      [nextNum]: entry
    }));
    
    addLog('System', `Custom Topic Added: Video #${nextNum} - ${title}`, 'success');
  };

  // Workflow Orchestrator
  const startProtocol = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setLogs([]); // Clear previous run
    
    try {
      addLog('HazeOrchestrator', `Initializing Protocol V3 for Video #${blueprint.videoNumber}...`, 'info');
      
      // 1. Research
      addLog('Palzani-16 (Researcher)', 'Scanning for high-volume keywords...', 'info');
      const researchData = await runResearchAgent(videoTypes[blueprint.videoNumber]);
      setBlueprint(prev => ({
        ...prev,
        seoData: {
          keywords: researchData.keywords || [],
          selectedTitle: researchData.selectedTitle || "Untitled"
        }
      }));
      addLog('Palzani-16 (Researcher)', `Title locked: ${researchData.selectedTitle}`, 'success');

      // 2. Scripting
      addLog('Palzani-26 (Director)', 'Drafting narrative arc (Hook -> Solution -> Blueprint)...', 'info');
      const scriptData = await runScriptAgent(
        researchData.selectedTitle, 
        blueprint.videoType, 
        researchData.keywords
      );
      setBlueprint(prev => ({
        ...prev,
        scriptContent: {
            hook: scriptData.hook,
            body: scriptData.body,
            cta: scriptData.cta,
            sceneBreakdown: scriptData.sceneBreakdown || []
        }
      }));
      addLog('Palzani-26 (Director)', 'Script generated and validated.', 'success');

      // 3. Visuals
      addLog('Palzani-23 (Design)', 'Generating kinetic imagery prompts...', 'info');
      const visualData = await runVisualAgent(scriptData.body || "");
      setBlueprint(prev => ({
        ...prev,
        visualPlan: {
            imagePrompts: visualData.imagePrompts || [],
            videoPrompts: visualData.videoPrompts || []
        }
      }));
      addLog('Palzani-23 (Design)', `Created ${visualData.imagePrompts?.length || 0} image prompts.`, 'success');

      // 4. Marketing
      addLog('Palzani-5 (Growth)', 'Calculating optimal funnel strategy...', 'info');
      const marketingData = await runMarketingAgent(blueprint.videoNumber);
      setBlueprint(prev => ({
        ...prev,
        marketingData: {
            targetUrl: marketingData.targetUrl || "https://haze.ai/offer",
            offerType: marketingData.offerType || "Lead Magnet",
            validationStatus: 'pending'
        }
      }));
      addLog('Palzani-5 (Growth)', 'Funnel logic calculated.', 'success');

      // 5. Logic Validation
      addLog('Palzani-O (Logic)', 'Validating router logic and URL destination...', 'info');
      const logicData = await runLogicAgent(marketingData.targetUrl || "https://haze.ai", blueprint.videoNumber);
      setBlueprint(prev => ({
        ...prev,
        marketingData: {
            ...prev.marketingData,
            validationStatus: logicData.isValid ? 'valid' : 'invalid',
            logicReport: logicData.report
        }
      }));
      if (logicData.isValid) {
        addLog('Palzani-O (Logic)', 'Logic Verified: ' + logicData.report, 'success');
      } else {
        addLog('Palzani-O (Logic)', 'Logic Error: ' + logicData.report, 'error');
      }

      addLog('HazeOrchestrator', 'Protocol V3 Complete. Blueprint ready.', 'success');
      
      // Mark as complete for phase tracking
      setCompletedVideos(prev => {
        const next = new Set(prev);
        next.add(blueprint.videoNumber);
        return next;
      });

    } catch (error) {
      addLog('System', 'Orchestration failed. Check console for details.', 'error');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateNextPhase = async () => {
     if (isProcessing) return;
     setIsProcessing(true);
     setLogs([]);
     
     try {
       addLog('Palzani-Strat', `Researching trends for Phase ${currentPhase + 1} (Videos ${totalVideosAvailable + 1}-${totalVideosAvailable + 5})...`, 'info');
       
       const newTopics = await runStrategyAgent(totalVideosAvailable);
       
       setVideoTypes(prev => ({
         ...prev,
         ...newTopics
       }));
       
       addLog('Palzani-Strat', `Phase ${currentPhase + 1} Unlocked: 5 New Topics Added.`, 'success');
     } catch (e) {
        addLog('System', 'Strategy generation failed.', 'error');
        console.error(e);
     } finally {
       setIsProcessing(false);
     }
  };

  // API Key Blocking Modal
  if (!hasApiKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-midnight-dark font-sans p-6">
         <div className="bg-midnight p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md text-center space-y-6 w-full">
            <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto shadow-lg shadow-gold/20">
                <Key className="w-8 h-8 text-midnight" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
                <p className="text-gray-400 text-sm">
                    Enter your Gemini API Key to access QuillNexus Pro. Your key is saved locally in your browser.
                </p>
            </div>
            
            <div className="space-y-4 text-left">
                <div>
                    <label className="text-xs text-gold uppercase font-bold ml-1 mb-1 block">Gemini API Key</label>
                    <input 
                        type="password" 
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white focus:border-gold focus:outline-none transition-colors"
                    />
                </div>

                <button 
                    onClick={handleSaveApiKey}
                    disabled={apiKeyInput.length < 10}
                    className="w-full py-3 bg-gold hover:bg-gold-hover text-midnight font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Key className="w-5 h-5" />
                    Save & Continue
                </button>

                {window.aistudio && (
                    <button 
                        onClick={handleConnectKeyHelper}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-lg transition-colors text-sm"
                    >
                        Use AI Studio Helper
                    </button>
                )}
            </div>

            <p className="text-xs text-gray-500">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-gold">
                    Get an API Key
                </a>
            </p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-midnight-dark text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <div className="w-16 md:w-20 bg-midnight border-r border-white/10 flex flex-col items-center py-6 z-20 shrink-0">
        <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center mb-8 shadow-lg shadow-gold/20">
          <span className="text-midnight font-bold text-xl">Q</span>
        </div>
        
        <nav className="flex-1 space-y-4">
          <button 
            onClick={() => setCurrentView('blueprint')}
            className={`p-3 rounded-xl transition-all ${currentView === 'blueprint' ? 'bg-white/10 text-gold' : 'text-gray-400 hover:text-white'}`}
            title="Production Blueprint"
          >
            <Layers className="w-6 h-6" />
          </button>
          
          <button 
             onClick={() => setCurrentView('studio')}
             className={`p-3 rounded-xl transition-all ${currentView === 'studio' ? 'bg-white/10 text-gold' : 'text-gray-400 hover:text-white'}`}
             title="Asset Studio"
          >
            <ImageIcon className="w-6 h-6" />
          </button>

          <button 
             onClick={() => setCurrentView('custom')}
             className={`p-3 rounded-xl transition-all ${currentView === 'custom' ? 'bg-white/10 text-gold' : 'text-gray-400 hover:text-white'}`}
             title="Custom Strategy"
          >
            <PenTool className="w-6 h-6" />
          </button>

          <button 
             onClick={handleDisconnectKey}
             className={`p-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/10 transition-all mt-auto`}
             title="Disconnect API Key"
          >
            <LogOut className="w-6 h-6" />
          </button>

          <button 
             onClick={handleResetProgress}
             className={`p-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white/10 transition-all`}
             title="Reset Progress"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </nav>

        <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-3 rounded-xl text-gray-400 hover:text-white mb-4`}
            title="Toggle Logs"
        >
            <Terminal className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${sidebarOpen ? 'mr-80' : ''}`}>
        
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-midnight/50 flex items-center justify-between px-6 backdrop-blur-sm shrink-0">
            <h1 className="text-lg font-semibold tracking-wide flex items-center gap-2">
                <span className="text-gold">QUILLNEXUS</span> PRO
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-400">V3.0 ORCHESTRATOR</span>
            </h1>

            {/* Quick Actions (Only visible in Blueprint view) */}
            {currentView === 'blueprint' && (
                <div className="flex items-center gap-4">
                    
                    {/* Phase Unlock Button (Visible when all current videos are done) */}
                    {isCurrentPhaseComplete && (
                       <button
                          onClick={generateNextPhase}
                          disabled={isProcessing}
                          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg animate-fade-in"
                       >
                          <Sparkles className="w-4 h-4" />
                          {isProcessing ? 'RESEARCHING...' : `UNLOCK PHASE ${currentPhase + 1}`}
                       </button>
                    )}

                    {/* Progress Indicator (if not complete) */}
                    {!isCurrentPhaseComplete && (
                       <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 px-3 py-1 border border-white/5 rounded-full">
                           <Lock className="w-3 h-3" />
                           <span>Complete Phase {currentPhase} to unlock next</span>
                       </div>
                    )}

                    {/* Download Script Button */}
                    <button 
                        onClick={handleDownloadScript}
                        disabled={!blueprint.scriptContent.body}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Download Script"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    <select 
                        className="bg-black/30 border border-white/10 text-sm rounded px-3 py-1.5 focus:border-gold outline-none max-w-[200px]"
                        value={blueprint.videoNumber}
                        onChange={(e) => setBlueprint(prev => ({...prev, videoNumber: Number(e.target.value), videoType: videoTypes[Number(e.target.value)]}))}
                        disabled={isProcessing}
                    >
                        {Object.entries(videoTypes).map(([num, label]) => (
                            <option key={num} value={num}>
                                Video #{num}: {(label as string).split('/')[0]} 
                                {completedVideos.has(Number(num)) ? ' ✓' : ''}
                            </option>
                        ))}
                    </select>

                    <button 
                        onClick={startProtocol}
                        disabled={isProcessing}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold transition-all ${isProcessing ? 'bg-gray-600 cursor-not-allowed' : 'bg-gold hover:bg-gold-hover text-midnight shadow-[0_0_15px_rgba(241,196,15,0.3)]'}`}
                    >
                        <Play className="w-4 h-4 fill-current" />
                        {isProcessing ? 'EXECUTING...' : 'INITIATE PROTOCOL'}
                    </button>
                    
                    {!sidebarOpen && (
                         <button onClick={() => setSidebarOpen(true)} className="ml-2 text-gray-400 hover:text-white">
                            <Terminal className="w-5 h-5" />
                         </button>
                    )}
                </div>
            )}
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-midnight-dark to-[#151f28] p-6 relative">
             {currentView === 'blueprint' && (
                 <BlueprintView 
                    blueprint={blueprint} 
                    generatedImage={generatedImage} 
                    uploadedImage={uploadedImage}
                 />
             )}
             {currentView === 'studio' && (
                 <AssetStudio 
                    blueprint={blueprint} 
                    generatedImage={generatedImage}
                    setGeneratedImage={setGeneratedImage}
                    uploadedImage={uploadedImage}
                    setUploadedImage={setUploadedImage}
                 />
             )}
             {currentView === 'custom' && (
                <CustomTopicManager 
                  nextVideoNumber={totalVideosAvailable + 1} 
                  onAddTopic={handleAddCustomTopic} 
                />
             )}
        </main>

      </div>

      {/* Right Sidebar (Logs) */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-midnight-dark z-50 shadow-2xl border-l border-white/10 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <AgentLogPanel logs={logs} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

    </div>
  );
};

export default App;
