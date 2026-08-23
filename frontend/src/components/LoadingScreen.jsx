import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing ForestNet AI Kernel...');

  useEffect(() => {
    const statuses = [
      'Initializing ForestNet AI Kernel...',
      'Connecting to Roboflow Neural Workflow Engine...',
      'Loading Geospatial Satellite Radar Mapping...',
      'Synchronizing Sensor Telemetry Feeds...',
      'Establishing Secure Defense Encryption...',
      'System Ready. Launching Command Dashboard...'
    ];

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onFinish();
          }, 400);
          return 100;
        }

        const next = prev + Math.floor(Math.random() * 8) + 4;
        const currentStatusIdx = Math.min(
          Math.floor((next / 100) * statuses.length),
          statuses.length - 1
        );
        setStatusText(statuses[currentStatusIdx]);
        return next > 100 ? 100 : next;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-50 bg-[#05070c] flex flex-col items-center justify-center p-6 overflow-hidden select-none"
    >
      {/* Dynamic Animated Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Cyber Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSIjMTEyMjMzIiBzdHJva2Utd2lkdGg9IjAuNSIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTAgNjBoNjBNMCAwdjYwIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-8">
        
        {/* Holographic Glowing Logo Loader */}
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl bg-slate-900/90 border border-emerald-500/40 p-4 shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center justify-center backdrop-blur-xl relative z-10">
            <img 
              src="/logo.png" 
              alt="ForestNet Logo" 
              className="w-full h-full object-cover rounded-2xl glow-pulse"
            />
          </div>

          {/* Rotating 3D Outer Cyber Rings */}
          <div className="w-36 h-36 rounded-full border border-emerald-500/30 border-t-emerald-400 absolute -top-4 -left-4 animate-spin" style={{ animationDuration: '4s' }}></div>
          <div className="w-44 h-44 rounded-full border border-cyan-500/20 border-b-cyan-400 absolute -top-8 -left-8 animate-spin" style={{ animationDuration: '7s', animationDirection: 'reverse' }}></div>
        </div>

        {/* Brand Text */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-widest text-white flex items-center justify-center gap-1">
            FOREST<span className="text-emerald-400">NET</span>
          </h1>
          <p className="text-xs text-emerald-400 font-mono tracking-widest uppercase font-bold mt-1">
            AI INCIDENT COMMAND SYSTEM
          </p>
        </div>

        {/* Status Text & Percentage */}
        <div className="w-full space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 truncate max-w-[280px]">{statusText}</span>
            <span className="text-emerald-400 font-bold text-sm">{progress}%</span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full bg-slate-900 border border-slate-800 h-3 rounded-full p-0.5 overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Security Indicator */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 pt-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>ROBOFLOW CLOUD ML ENGINE 2026</span>
        </div>

      </div>
    </motion.div>
  );
}
