import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function AlertsTab({ incidents, theme }) {
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIncidents = incidents.filter(item => {
    const matchesFilter = filter === 'ALL' || item.status === filter;
    const matchesSearch = item.type.toLowerCase().includes(searchTerm.toLowerCase()) || item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const sectionBg = isDark
    ? 'glass-panel p-6 border-slate-800 bg-slate-950/70 text-slate-100'
    : 'p-6 border border-slate-200/90 bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl rounded-xl';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full max-w-full"
    >
      <div className={sectionBg}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-700/40">
          <div>
            <h2 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              Live Threat Alerts &amp; Incident Dispatch Matrix
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Real-time log of active alerts, poaching risks, wildfires, and ML model classifications.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Category Filter Pills */}
            <div className={`flex p-1 rounded-xl border text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
              {['ALL', 'CRITICAL', 'PROCESSED'].map((f) => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)} 
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    filter === f ? 'bg-emerald-600 text-white shadow' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <input 
              type="text" 
              placeholder="Search alerts..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className={`border rounded-xl px-3 py-1.5 text-xs focus:outline-none ${
                isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 shadow-sm'
              }`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className={isDark ? 'bg-slate-950 text-slate-400 border-b border-slate-800' : 'bg-slate-100 text-slate-700 border-b border-slate-300'}>
              <tr>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider">Incident Type / Timestamp</th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider">GPS Coordinates</th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider">Severity Score</th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-right">Dispatch Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
              {filteredIncidents.map((item) => (
                <tr key={item.id} className={isDark ? 'hover:bg-slate-900/60 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                  <td className="py-4 px-4">
                    <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item.type}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{item.time}</div>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-slate-500">{item.location}</td>
                  <td className="py-4 px-4"><span className="text-red-500 font-bold">{item.severity}</span></td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${item.badgeBg}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
