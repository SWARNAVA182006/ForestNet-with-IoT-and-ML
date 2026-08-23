import React from 'react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  activeIncidentsCount, 
  evidenceCount = 0,
  isCollapsed, 
  setIsCollapsed,
  theme,
  toggleTheme 
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'Command Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    },
    {
      id: 'evidence',
      label: 'Evidence Vault',
      badgeCount: evidenceCount,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    },
    {
      id: 'map',
      label: 'Live Geospatial Map',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    },
    {
      id: 'ai-insights',
      label: 'AI Threat Detector',
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    },
    {
      id: 'alerts',
      label: 'Threat Matrix Log',
      badgeCount: activeIncidentsCount,
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    }
  ];

  const isDark = theme === 'dark';

  return (
    <aside className={`h-screen flex flex-col border-r transition-all duration-300 shrink-0 z-30 shadow-2xl relative ${
      isCollapsed ? 'w-20' : 'w-64'
    } ${
      isDark 
        ? 'border-slate-800/80 bg-slate-950/90 text-slate-100 backdrop-blur-2xl' 
        : 'border-slate-300/80 bg-white/90 text-slate-800 backdrop-blur-2xl'
    }`}>
      {/* Collapse / Expand Slider Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        className={`absolute -right-3.5 top-7 w-7 h-7 rounded-full border flex items-center justify-center transition-all z-40 shadow-md ${
          isDark 
            ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800' 
            : 'bg-white border-slate-300 text-emerald-600 hover:bg-slate-100'
        }`}
      >
        <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
        </svg>
      </button>

      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <img 
            src="/logo.png" 
            alt="ForestNet Logo" 
            className="w-10 h-10 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] object-cover border border-emerald-500/40 shrink-0"
          />
          {!isCollapsed && (
            <div className="truncate">
              <div className="text-base font-extrabold tracking-wider flex items-center gap-0.5">
                FOREST<span className="text-emerald-500 font-black">NET</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-mono tracking-widest block font-bold uppercase">AI DEFENSE OS</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ''}
              className={`w-full nav-btn flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive 
                  ? 'active text-emerald-500 bg-emerald-500/15 border-l-4 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border-l-4 border-transparent' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </div>
              {!isCollapsed && item.badgeCount > 0 && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border animate-pulse ${item.badgeColor || 'bg-red-500/20 text-red-400 border-red-500/40'}`}>
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme Switcher & Footer */}
      <div className="p-3 m-3 rounded-xl border space-y-3 shrink-0 backdrop-blur-md transition-colors" style={{
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(241, 245, 249, 0.9)',
        borderColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(203, 213, 225, 0.8)'
      }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all ${
            isDark 
              ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700' 
              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2">
            {isDark ? (
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            ) : (
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            )}
            {!isCollapsed && <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>}
          </div>
        </button>

        {!isCollapsed && (
          <div className="flex items-center gap-2.5 pt-1 border-t border-slate-700/40">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            </div>
            <div>
              <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Forest Dispatch</div>
              <div className="text-[10px] text-slate-400">System Admin</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
