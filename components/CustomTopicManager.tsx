import React, { useState } from 'react';
import { PenTool, Plus, Type } from 'lucide-react';

interface CustomTopicManagerProps {
  nextVideoNumber: number;
  onAddTopic: (title: string, type: string) => void;
}

const CustomTopicManager: React.FC<CustomTopicManagerProps> = ({ nextVideoNumber, onAddTopic }) => {
  const [title, setTitle] = useState('');
  const [videoType, setVideoType] = useState('Custom Strategy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTopic(title, videoType);
    setTitle('');
    // We keep the type as is for consecutive entries, or user can change it
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <div className="bg-midnight p-8 rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gold/10 rounded-lg border border-gold/20">
            <PenTool className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Custom Topic Manager</h2>
            <p className="text-gray-400 text-sm">Manually add a video topic to your production plan.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Number Preview */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 text-sm font-mono tracking-wider">ASSIGNED SLOT</span>
            <span className="text-gold font-bold font-mono text-xl">VIDEO #{nextVideoNumber}</span>
          </div>

          {/* Topic Title Input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Topic / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How AI is changing the Job Market"
              className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors"
            />
          </div>

          {/* Video Type Input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Video Format / Type</label>
            <div className="relative">
              <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={videoType}
                onChange={(e) => setVideoType(e.target.value)}
                placeholder="e.g. Tutorial, Vlog, Explainer"
                className="w-full bg-black/30 border border-white/10 rounded-lg p-4 pl-10 text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-4 bg-gold hover:bg-gold-hover text-midnight font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-gold/10"
          >
            <Plus className="w-5 h-5" />
            Add to Production Plan
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center bg-white/5 p-4 rounded-lg border border-white/5">
        <p className="text-gray-400 text-sm">
          Added topics will appear in the dropdown menu on the <button className="text-gold font-bold hover:underline">Blueprint</button> tab.
        </p>
      </div>
    </div>
  );
};

export default CustomTopicManager;