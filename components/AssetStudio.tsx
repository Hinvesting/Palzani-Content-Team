import React, { useState, useRef } from 'react';
import { ProductionBlueprint, AspectRatio, ImageSize, ModelTier } from '../types';
import { generateImage, editImage } from '../services/geminiService';
import { Wand2, Loader2, Download, Image as ImageIcon, Sparkles, Sliders, Upload, Trash2, RotateCcw, Zap } from 'lucide-react';

interface AssetStudioProps {
  blueprint: ProductionBlueprint;
  generatedImage: string | null;
  setGeneratedImage: (image: string | null) => void;
  uploadedImage: string | null;
  setUploadedImage: (image: string | null) => void;
  modelTier: ModelTier;
}

const AssetStudio: React.FC<AssetStudioProps> = ({ 
  blueprint, 
  generatedImage, 
  setGeneratedImage, 
  uploadedImage, 
  setUploadedImage,
  modelTier
}) => {
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.RATIO_1_1);
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setMode('edit'); // Auto-switch to edit mode when uploading
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (promptOverride?: string) => {
    // Allow passing prompt directly to bypass state update lag
    const promptToUse = typeof promptOverride === 'string' ? promptOverride : (customPrompt || selectedPrompt);
    
    if (!promptToUse) return;

    setIsGenerating(true);
    try {
      if (mode === 'generate') {
        const result = await generateImage(promptToUse, aspectRatio, size, modelTier);
        if (result) setGeneratedImage(result);
      } else if (mode === 'edit') {
        // Prioritize generated image for iteration, otherwise use uploaded reference
        const sourceImage = generatedImage || uploadedImage;
        if (sourceImage) {
            const result = await editImage(sourceImage, promptToUse, modelTier);
            if (result) setGeneratedImage(result);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to process image. Check console.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Determine what to display in the main canvas
  const displayImage = generatedImage || uploadedImage;

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row gap-6 p-6">
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-1/3 space-y-6">
        
        {/* Tier Indicator (Mini) */}
        <div className="flex items-center justify-between text-xs text-gray-400 px-2">
           <span>Current Engine:</span>
           <div className={`flex items-center gap-1 font-bold ${modelTier === 'pro' ? 'text-purple-400' : 'text-gold'}`}>
             {modelTier === 'pro' ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
             {modelTier.toUpperCase()}
           </div>
        </div>

        {/* Mode Selector */}
        <div className="bg-midnight p-4 rounded-lg border border-white/10">
          <h3 className="text-gold font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Mode
          </h3>
          <div className="flex gap-2 p-1 bg-black/40 rounded-lg">
            <button 
              onClick={() => setMode('generate')}
              className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'generate' ? 'bg-gold text-midnight font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Generate
            </button>
            <button 
               onClick={() => setMode('edit')}
               disabled={!displayImage}
               className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'edit' ? 'bg-gold text-midnight font-bold' : 'text-gray-400 hover:text-white disabled:opacity-30'}`}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Reference Image Upload */}
        <div className="bg-midnight p-4 rounded-lg border border-white/10">
           <h3 className="text-gray-200 font-semibold mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Reference Image
          </h3>
          
          {!uploadedImage ? (
            <div 
                className="border border-dashed border-white/20 rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer relative group"
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-gold/20 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-gold" />
                </div>
                <p className="text-xs text-gray-400 group-hover:text-gray-200">Click to upload reference</p>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-white/20 group">
                <img src={uploadedImage} alt="Ref" className="w-full h-32 object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <p className="text-xs text-white font-medium">Reference Loaded</p>
                </div>
                <button 
                    onClick={() => { setUploadedImage(null); if(!generatedImage) setMode('generate'); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors z-10"
                    title="Remove reference"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
          )}
        </div>

        {/* Script Scenes (Formerly Blueprint Prompts) */}
        {mode === 'generate' && (
          <div className="bg-midnight p-4 rounded-lg border border-white/10">
            <h3 className="text-gray-200 font-semibold mb-3 flex items-center justify-between">
              <span>Script Scenes</span>
              <span className="text-xs font-normal text-gray-500">Auto-Generates</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scroll">
              
              {/* Thumbnail Prompt Button */}
              {blueprint.visualPlan.thumbnailPrompt && (
                  <button
                    onClick={() => {
                        const p = blueprint.visualPlan.thumbnailPrompt;
                        setSelectedPrompt(p);
                        setCustomPrompt(p);
                        handleGenerate(p);
                    }}
                    disabled={isGenerating}
                    className="w-full text-left text-xs p-3 rounded bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 mb-3 transition-colors flex items-center gap-2 font-bold"
                  >
                      <ImageIcon className="w-3 h-3" />
                      Generate Thumbnail
                  </button>
              )}

              {blueprint.scriptContent.sceneBreakdown.length > 0 ? (
                blueprint.scriptContent.sceneBreakdown.map((scene, i) => {
                  // Helper to strip timestamp [15s] and clean up for display
                  const cleanSceneDisplay = scene.replace(/^\[.*?\]\s*/, '').trim();
                  
                  // Use the OPTIMIZED PROMPT from the Visual Agent if available (matching index), otherwise use raw scene
                  const optimizedPrompt = blueprint.visualPlan.imagePrompts[i] || cleanSceneDisplay;

                  return (
                    <button
                      key={i}
                      onClick={() => { 
                        setSelectedPrompt(optimizedPrompt); 
                        setCustomPrompt(optimizedPrompt);
                        handleGenerate(optimizedPrompt); // Auto-trigger with the optimized prompt
                      }}
                      disabled={isGenerating}
                      className="w-full text-left text-xs p-2 rounded bg-white/5 hover:bg-white/10 text-gray-300 truncate transition-colors border border-transparent hover:border-gold/30 disabled:opacity-50"
                      title={optimizedPrompt}
                    >
                      <span className="text-gold font-mono mr-2">[{i+1}]</span>
                      {cleanSceneDisplay}
                    </button>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm italic">Run blueprint generation first.</p>
              )}
            </div>
          </div>
        )}

        {/* Configuration */}
        {mode === 'generate' && (
          <div className="bg-midnight p-4 rounded-lg border border-white/10">
            <h3 className="text-gray-200 font-semibold mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Settings
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-4 gap-2">
                        {Object.values(AspectRatio).map((r) => (
                            <button 
                                key={r}
                                onClick={() => setAspectRatio(r)}
                                className={`text-xs py-1.5 rounded border ${aspectRatio === r ? 'border-gold text-gold bg-gold/10' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold block mb-2">
                        Resolution {modelTier === 'flash' && <span className="text-red-400 font-normal ml-1">(Pro Only)</span>}
                    </label>
                    <div className="flex gap-2">
                        {Object.values(ImageSize).map((s) => (
                            <button 
                                key={s}
                                onClick={() => setSize(s)}
                                disabled={modelTier === 'flash'}
                                className={`flex-1 text-xs py-1.5 rounded border ${size === s ? 'border-gold text-gold bg-gold/10' : 'border-white/10 text-gray-400 hover:bg-white/5'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                title={modelTier === 'flash' ? "Resolution selection requires Pro Tier" : ""}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-midnight p-4 rounded-lg border border-white/10">
            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">
                {mode === 'generate' ? 'Prompt' : 'Edit Instruction'}
            </label>
            <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={mode === 'generate' ? "Describe the image..." : "e.g., Add a retro filter, remove the background..."}
                className="w-full bg-black/30 border border-white/10 rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-gold h-32 resize-none"
            />
            <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !customPrompt}
                className="w-full mt-4 bg-gold hover:bg-gold-hover text-midnight font-bold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                {mode === 'generate' ? 'Generate Asset' : 'Apply Edit'}
            </button>
        </div>
      </div>

      {/* Main Canvas / Preview */}
      <div className="flex-1 bg-black/40 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden group">
        {displayImage ? (
            <>
                <img src={displayImage} alt="Active Asset" className="max-w-full max-h-full object-contain shadow-2xl" />
                
                {/* Canvas Actions */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {generatedImage && (
                        <button 
                            onClick={() => setGeneratedImage(null)}
                            className="bg-midnight text-white p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors block shadow-lg"
                            title="Reset to Reference/Empty"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    )}
                    <a href={displayImage} download={`quillnexus-asset-${Date.now()}.png`} className="bg-midnight text-white p-2 rounded-full hover:bg-gold hover:text-midnight transition-colors block shadow-lg">
                        <Download className="w-5 h-5" />
                    </a>
                </div>

                {/* Status Indicator */}
                <div className="absolute bottom-4 left-4">
                     <span className="bg-black/60 backdrop-blur text-xs text-white px-3 py-1 rounded-full border border-white/10">
                        {generatedImage ? 'Generated Output' : 'Reference Image'}
                     </span>
                </div>
            </>
        ) : (
            <div className="text-center text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Select a prompt or describe an image to begin.</p>
                <p className="text-xs mt-2 opacity-50 flex items-center justify-center gap-2">
                    {modelTier === 'pro' ? 'Powered by Gemini 3 Pro' : 'Powered by Gemini 2.5 Flash'}
                </p>
            </div>
        )}
      </div>

    </div>
  );
};

export default AssetStudio;