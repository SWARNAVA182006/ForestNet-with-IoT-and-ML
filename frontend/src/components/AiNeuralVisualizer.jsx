import React from 'react';
import { motion } from 'framer-motion';

export default function AiNeuralVisualizer({ theme }) {
  const isDark = theme === 'dark';

  const nodes = [
    { id: 'cam', label: 'Camera / Drone Feed', type: 'input', x: 10, y: 50 },
    { id: 'pre', label: 'Preprocessing (OpenCV)', type: 'process', x: 30, y: 50 },
    { id: 'rf', label: 'Roboflow Workflow Model', type: 'model', x: 55, y: 30 },
    { id: 'yolo', label: 'YOLO Threat Detector', type: 'model', x: 55, y: 70 },
    { id: 'poach', label: 'Poaching Alert', type: 'output', x: 85, y: 20, color: 'text-red-500 border-red-500' },
    { id: 'fire', label: 'Wildfire Signal', type: 'output', x: 85, y: 50, color: 'text-orange-500 border-orange-500' },
    { id: 'wild', label: 'Wildlife Tracking', type: 'output', x: 85, y: 80, color: 'text-purple-500 border-purple-500' }
  ];

  const sectionBg = isDark
    ? 'glass-panel p-6 border-emerald-500/30 bg-slate-950/70 text-slate-100'
    : 'p-6 border border-slate-200/90 bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl rounded-xl';

  return (
    <div className={`${sectionBg} relative overflow-hidden`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>AI Neural Architecture &amp; Data Pipeline</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 font-bold">
          FLOW: ACTIVE (LATENCY 12ms)
        </span>
      </div>

      {/* Holographic Canvas Node Map */}
      <div className={`relative w-full h-56 rounded-xl border p-4 overflow-hidden ${
        isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100 border-slate-300 shadow-inner'
      }`}>
        {/* SVG Connecting Pulse Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="15%" y1="50%" x2="30%" y2="50%" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
          <line x1="35%" y1="50%" x2="55%" y2="30%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="35%" y1="50%" x2="55%" y2="70%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="60%" y1="30%" x2="85%" y2="20%" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="60%" y1="30%" x2="85%" y2="50%" stroke="#f97316" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="60%" y1="70%" x2="85%" y2="80%" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            className={`absolute px-3 py-1.5 rounded-lg border text-[11px] font-mono font-bold tracking-wide shadow-lg cursor-pointer backdrop-blur-md transition-all hover:scale-110 ${
              node.type === 'input' 
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : node.type === 'process'
                ? 'bg-blue-950/90 text-blue-300 border-blue-500'
                : node.type === 'model'
                ? 'bg-purple-950/90 text-purple-300 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : isDark ? `bg-slate-900/90 ${node.color}` : `bg-white ${node.color} shadow-md`
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${node.type === 'input' ? 'bg-emerald-400 animate-ping' : 'bg-current'}`}></span>
              {node.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
