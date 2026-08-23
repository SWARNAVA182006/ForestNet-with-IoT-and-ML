import React, { useState, useEffect } from 'react';

export default function Header({ activeTab, setActiveTab, theme, toggleTheme }) {
  const [timeStr, setTimeStr] = useState('');
  const isDark = theme === 'dark';

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Executive Command Dashboard';
      case 'map': return 'Geospatial Radar & Lat/Lng Pinpointer';
      case 'ai-insights': return 'Roboflow AI Neural Threat Analyzer';
      case 'alerts': return 'Incident Defense Log & Threat Matrix';
      default: return 'Command Dashboard';
    }
  };

  return (
    <header className={`h-16 w-full border-b backdrop-blur-2xl flex items-center justify-between px-6 shrink-0 z-20 shadow-md transition-colors duration-300 ${
      isDark 
        ? 'border-slate-800/80 bg-slate-950/80 text-white' 
        : 'border-slate-300/80 bg-white/80 text-slate-900'
    }`}>
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-wide">{getTabTitle()}</h1>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs text-emerald-500 font-mono font-bold">REALTIME INFERENCE ONLINE</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Switcher Button */}
        <button 
          onClick={toggleTheme} 
          title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all shadow-sm ${
            isDark 
              ? 'bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800' 
              : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
          }`}
        >
          {isDark ? (
            <>
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Real-time Clock */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-xs font-mono transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800 shadow-sm'
        }`}>
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          <span className="font-semibold">{timeStr || '17:42:31 IST'}</span>
        </div>

        {/* Quick Action */}
        <button 
          onClick={() => setActiveTab('ai-insights')} 
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          Run AI Inference
        </button>
      </div>
    </header>
  );
}
