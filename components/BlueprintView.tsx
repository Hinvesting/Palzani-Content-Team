import React, { useState } from 'react';
import { ProductionBlueprint } from '../types';
import { FileText, Video, ImageIcon, Target, Globe, ChevronDown, ChevronUp, Maximize2, X, Image as ImgIcon, Download } from 'lucide-react';

interface BlueprintViewProps {
  blueprint: ProductionBlueprint;
  generatedImage?: string | null;
  uploadedImage?: string | null;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-midnight/50 rounded-lg border border-white/5 mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors rounded-lg focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-midnight-dark rounded text-gold shadow-sm shadow-gold/10">{icon}</div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-0 border-t border-white/5 mt-2">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// Lightbox Component
const Lightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-8 animate-fade-in" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white hover:text-gold transition-colors">
        <X className="w-8 h-8" />
      </button>
      <img src={src} alt="Fullscreen" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
    </div>
  );
};

const BlueprintView: React.FC<BlueprintViewProps> = ({ blueprint, generatedImage, uploadedImage }) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const hasAssets = generatedImage || uploadedImage;

  const handleDownload = () => {
    // Separate Voiceover from Scenes using Regex
    const voLines = blueprint.scriptContent.sceneBreakdown.map((scene, i) => {
        // Look for text inside {Voiceover: ...} or just {...}
        const match = scene.match(/\{(.*?)\}/);
        const text = match ? match[1].replace(/^Voiceover:\s*/i, '').trim() : "No dialogue.";
        return `SCENE ${i+1}: ${text}`;
    });

    // Create Visual Description + Prompt pairs
    const visualLines = blueprint.scriptContent.sceneBreakdown.map((scene, i) => {
         // Remove the VO part for the visual description
         const visualOnly = scene.replace(/\{.*?\}/, '').trim();
         const prompt = blueprint.visualPlan.imagePrompts[i] || "No specific prompt generated.";
         return `SCENE ${i+1}: ${visualOnly}\n   [GENERATED PROMPT]: ${prompt}`;
    });

    const lines = [
        `PROJECT: ${blueprint.seoData.selectedTitle || 'Untitled'}`,
        `VIDEO TYPE: ${blueprint.videoType}`,
        `===========================================`,
        ``,
        `[SEO & KEYWORDS]`,
        `${blueprint.seoData.keywords.join(', ')}`,
        ``,
        `[SCRIPT]`,
        `HOOK: ${blueprint.scriptContent.hook}`,
        ``,
        `BODY:`,
        `${blueprint.scriptContent.body}`,
        ``,
        `CTA: ${blueprint.scriptContent.cta}`,
        ``,
        `[VOICEOVER SCRIPT]`,
        ...voLines,
        ``,
        `[SCENE BREAKDOWN & VISUALS]`,
        ...visualLines,
        ``,
        `[THUMBNAIL PROMPT]`,
        `${blueprint.visualPlan.thumbnailPrompt || "Pending..."}`,
        ``,
        `[VIDEO B-ROLL IDEAS (VEO)]`,
        ...blueprint.visualPlan.videoPrompts.map(p => `- [VIDEO] ${p}`),
        ``,
        `[MARKETING]`,
        `Target URL: ${blueprint.marketingData.targetUrl}`,
        `Type: ${blueprint.marketingData.offerType}`,
        `Logic Check: ${blueprint.marketingData.validationStatus}`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Blueprint_Video_${blueprint.videoNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      
      {/* Lightbox Overlay */}
      {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">{blueprint.seoData.selectedTitle || "Untitled Project"}</h1>
            <div className="flex space-x-4 text-sm text-gray-400">
            <span className="bg-gold/10 text-gold px-2 py-1 rounded border border-gold/20">Video #{blueprint.videoNumber}</span>
            <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">{blueprint.videoType}</span>
            </div>
        </div>
        <button 
            onClick={handleDownload}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/5"
        >
            <Download className="w-4 h-4" />
            <span className="text-sm font-semibold">Download Package</span>
        </button>
      </div>

      <Section title="Strategic Research (Palzani-16)" icon={<Globe />}>
        <div className="space-y-4">
            <div>
                <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-2">Target Keywords</h4>
                <div className="flex flex-wrap gap-2">
                    {blueprint.seoData.keywords.map((kw, i) => (
                        <span key={i} className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-300">{kw}</span>
                    ))}
                    {blueprint.seoData.keywords.length === 0 && <p className="text-gray-500 italic">No keywords generated yet.</p>}
                </div>
            </div>
        </div>
      </Section>

      <Section title="Script & Narrative (Palzani-26)" icon={<FileText />}>
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded">
                    <h4 className="text-gold text-sm font-bold mb-2">THE HOOK</h4>
                    <p className="text-gray-300 italic">"{blueprint.scriptContent.hook || 'Pending...'}"</p>
                </div>
                <div className="bg-black/20 p-4 rounded">
                    <h4 className="text-gold text-sm font-bold mb-2">THE CTA</h4>
                    <p className="text-gray-300 italic">"{blueprint.scriptContent.cta || 'Pending...'}"</p>
                </div>
            </div>
            <div>
                <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-2">Scene Breakdown</h4>
                <div className="space-y-2">
                    {blueprint.scriptContent.sceneBreakdown.map((scene, i) => (
                         <div key={i} className="flex gap-4 p-3 bg-white/5 rounded border-l-2 border-gold/50">
                             <span className="text-gold font-mono text-xs opacity-50">SCENE {i+1}</span>
                             <p className="text-gray-300 text-sm">{scene}</p>
                         </div>
                    ))}
                     {blueprint.scriptContent.sceneBreakdown.length === 0 && <p className="text-gray-500 italic">Script not yet generated.</p>}
                </div>
            </div>
        </div>
      </Section>

      <Section title="Visual Assets (Palzani-23 & 14)" icon={<ImageIcon />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4"/> Image Prompts
                </h4>
                
                {/* Thumbnail Display */}
                {blueprint.visualPlan.thumbnailPrompt && (
                     <div className="mb-4 bg-gold/5 border border-gold/20 p-3 rounded">
                        <span className="text-xs font-bold text-gold uppercase block mb-1">Thumbnail Concept</span>
                        <p className="text-xs text-gray-300 italic">{blueprint.visualPlan.thumbnailPrompt}</p>
                     </div>
                )}

                <ul className="space-y-2">
                    {blueprint.visualPlan.imagePrompts.map((prompt, i) => (
                        <li key={i} className="text-xs bg-black/30 p-2 rounded text-gray-400 border border-white/5 flex gap-2">
                            <span className="text-gold/50 font-mono shrink-0">[{i+1}]</span>
                            <span>{prompt}</span>
                        </li>
                    ))}
                    {blueprint.visualPlan.imagePrompts.length === 0 && <span className="text-gray-500 text-sm italic">Pending...</span>}
                </ul>
            </div>
            <div>
                <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4"/> Video Prompts (Veo)
                </h4>
                <ul className="space-y-2">
                    {blueprint.visualPlan.videoPrompts.map((prompt, i) => (
                        <li key={i} className="text-xs bg-black/30 p-2 rounded text-gray-400 border border-white/5">
                            {prompt}
                        </li>
                    ))}
                     {blueprint.visualPlan.videoPrompts.length === 0 && <span className="text-gray-500 text-sm italic">Pending...</span>}
                </ul>
            </div>
        </div>
      </Section>
      
      {/* New Section for Generated Assets */}
      {hasAssets && (
        <Section title="Generated Assets" icon={<ImgIcon />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedImage && (
                    <div className="group relative rounded-lg overflow-hidden border border-white/10 aspect-square cursor-pointer" onClick={() => setLightboxImage(uploadedImage)}>
                        <img src={uploadedImage} alt="Reference" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-center text-gray-300">Reference</div>
                    </div>
                )}
                {generatedImage && (
                    <div className="group relative rounded-lg overflow-hidden border border-gold/30 aspect-square cursor-pointer" onClick={() => setLightboxImage(generatedImage)}>
                        <img src={generatedImage} alt="Generated" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-6 h-6 text-gold" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gold/90 p-2 text-xs text-center text-midnight font-bold">Latest Generation</div>
                    </div>
                )}
            </div>
        </Section>
      )}

       <Section title="Growth Marketing (Palzani-5)" icon={<Target />}>
         <div className="grid grid-cols-2 gap-4">
             <div>
                <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-1">Target URL</h4>
                <p className="text-blue-400 truncate">{blueprint.marketingData.targetUrl || "Pending..."}</p>
             </div>
             <div>
                <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-1">Offer Type</h4>
                <p className="text-gray-300">{blueprint.marketingData.offerType || "Pending..."}</p>
             </div>
         </div>
      </Section>

    </div>
  );
};

export default BlueprintView;