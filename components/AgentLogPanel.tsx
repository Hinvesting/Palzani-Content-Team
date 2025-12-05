import React, { useEffect, useRef } from 'react';
import { AgentLog } from '../types';
import { Terminal, CheckCircle2, AlertCircle, Info, ChevronRight } from 'lucide-react';

interface AgentLogPanelProps {
  logs: AgentLog[];
  onToggle: () => void;
}

const AgentLogPanel: React.FC<AgentLogPanelProps> = ({ logs, onToggle }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-midnight-dark border-l border-white/10 w-80 flex flex-col h-full absolute right-0 top-0 bottom-0 z-10 shadow-2xl">
      <button 
        onClick={onToggle}
        className="p-4 border-b border-white/10 flex items-center justify-between bg-midnight hover:bg-white/5 transition-colors w-full text-left focus:outline-none group"
      >
        <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-gold" />
            <h3 className="font-semibold text-gray-200">System Logs</h3>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
      </button>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {logs.length === 0 && (
            <p className="text-gray-500 text-sm italic">System ready. Waiting for initialization...</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 text-sm animate-fade-in">
            <div className="mt-0.5">
              {log.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
              {log.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {log.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
            <div>
              <p className="font-mono text-xs text-gold mb-0.5">{log.agentName}</p>
              <p className="text-gray-300 leading-relaxed">{log.message}</p>
              <span className="text-[10px] text-gray-600 block mt-1">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default AgentLogPanel;