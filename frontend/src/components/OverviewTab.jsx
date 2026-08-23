import React from 'react';
import { motion } from 'framer-motion';

export default function OverviewTab({ setActiveTab, incidents, theme, telemetry, pinpointOnMap }) {
  const isDark = theme === 'dark';

  const cardBg = isDark 
    ? 'glass-panel p-5 relative overflow-hidden group border-slate-800/60 bg-slate-950/70 text-slate-100' 
    : 'p-5 relative overflow-hidden group border border-slate-200/90 bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl rounded-xl';

  const sectionBg = isDark
    ? 'glass-panel p-6 border-slate-800/60 bg-slate-950/70 text-slate-100'
    : 'p-6 border border-slate-200/90 bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl rounded-xl';

  const temp = telemetry ? telemetry.temperature : 30.4;
  const humidity = telemetry ? telemetry.humidity : 70.8;
  const smoke = telemetry ? telemetry.smoke : 231;
  const motionState = telemetry ? telemetry.motion : "NO MOTION";
  const lastUpdated = telemetry ? telemetry.last_updated : "Live";
  const lat = telemetry ? telemetry.lat : None;
  const lng = telemetry ? telemetry.lng : None;
  const gpsStatus = telemetry ? telemetry.gps_status : "UNAVAILABLE";

  const hasGpsLock = lat !== null && lng !== null && lat !== 0 && lng !== 0;

  const gpsDisplay = hasGpsLock 
    ? `Latitude: ${lat.toFixed(6)}° N | Longitude: ${lng.toFixed(6)}° E` 
    : "GPS: Waiting for satellite signal establishment...";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full max-w-full"
    >
      {/* Live ESP32 Hardware Banner */}
      <div className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
        isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-300 text-slate-800 shadow-sm'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${hasGpsLock ? 'bg-emerald-500 animate-ping' : 'bg-yellow-500 animate-pulse'}`}></span>
          <span className="font-bold text-emerald-500">ARDUINO ESP32 GPS TELEMETRY</span>
          <span className="hidden sm:inline text-slate-400">| <strong className={hasGpsLock ? 'text-emerald-400 font-bold' : 'text-yellow-400 font-bold'}>{gpsDisplay}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          {hasGpsLock ? (
            <button 
              onClick={() => pinpointOnMap && pinpointOnMap(lat, lng)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[10px] transition-all flex items-center gap-1"
            >
              📍 Pinpoint Live Node on Map
            </button>
          ) : (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded text-[10px] font-bold">
              📡 Searching GPS Satellites...
            </span>
          )}
          <span className="text-slate-400">PIR Motion: <strong className={motionState === 'DETECTED' ? 'text-red-500 font-extrabold' : 'text-emerald-500'}>{motionState}</strong></span>
        </div>
      </div>

      {/* 5 High-Tech Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 w-full">
        {/* Metric 1: Active Threats */}
        <div className={`${cardBg} border-red-500/40`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-all"></div>
          <div className="relative z-10 flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Recorded Incidents</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-extrabold text-red-500 mb-1">{incidents.length}</div>
            <div className="text-xs text-red-500 font-bold">Total Logs</div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-900/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-red-500 h-full w-full rounded-full"></div>
          </div>
        </div>

        {/* Metric 2: PIR Motion */}
        <div className={`${cardBg} ${motionState === 'DETECTED' ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/40'}`}>
          <div className="relative z-10 flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>PIR Motion</span>
            <svg className={`w-5 h-5 ${motionState === 'DETECTED' ? 'text-red-500 animate-bounce' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          </div>
          <div className="relative z-10">
            <div className={`text-2xl font-extrabold mb-1 ${motionState === 'DETECTED' ? 'text-red-500' : 'text-emerald-500'}`}>{motionState}</div>
            <div className="text-xs font-bold text-slate-400">HC-SR501 Sensor</div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-900/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className={`h-full rounded-full ${motionState === 'DETECTED' ? 'bg-red-500 w-full' : 'bg-emerald-500 w-[20%]'}`}></div>
          </div>
        </div>

        {/* Metric 3: Temperature */}
        <div className={`${cardBg} ${temp > 40 ? 'border-red-500/40 bg-red-500/5' : ''}`}>
          <div className="relative z-10 flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>DHT22 Temp</span>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          </div>
          <div className="relative z-10">
            <div className={`text-3xl font-extrabold mb-1 ${temp > 40 ? 'text-red-500' : isDark ? 'text-white' : 'text-slate-900'}`}>{temp}°C</div>
            <div className={`text-xs font-bold ${temp > 40 ? 'text-red-500' : 'text-emerald-500'}`}>{temp > 40 ? 'HIGH TEMP ALERT' : 'Normal Range'}</div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-900/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className={`h-full rounded-full ${temp > 40 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (temp / 60) * 100)}%` }}></div>
          </div>
        </div>

        {/* Metric 4: Humidity */}
        <div className={`${cardBg} border-cyan-500/40`}>
          <div className="relative z-10 flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>DHT22 Humidity</span>
            <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-extrabold text-cyan-500 mb-1">{humidity}%</div>
            <div className="text-xs text-cyan-500 font-bold">Relative Humidity</div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-900/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${humidity}%` }}></div>
          </div>
        </div>

        {/* Metric 5: MQ-2 Smoke */}
        <div className={`${cardBg} ${smoke > 500 ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/40'}`}>
          <div className="relative z-10 flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>MQ-2 Smoke</span>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1-4 4-6 1.236 1.648 1.488 3.515 1.055 5.055 1.5.5 3 2 3 4.5a4.5 4.5 0 01-1.398 3.102z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          </div>
          <div className="relative z-10">
            <div className={`text-3xl font-extrabold mb-1 ${smoke > 500 ? 'text-red-500' : isDark ? 'text-white' : 'text-slate-900'}`}>{smoke} <span className="text-sm font-normal text-slate-400">PPM</span></div>
            <div className={`text-xs font-bold ${smoke > 500 ? 'text-red-500' : 'text-emerald-500'}`}>{smoke > 500 ? 'SMOKE DETECTED' : 'Clean Air'}</div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-900/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className={`h-full rounded-full ${smoke > 500 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (smoke / 1024) * 100)}%` }}></div>
          </div>
        </div>
      </section>

      {/* Live Incidents Stream with Genuine GPS Geolocation */}
      <section className={sectionBg}>
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
            <h3 className="text-base font-extrabold tracking-wide">Real-Time Incident Stream &amp; Genuine GPS Geolocation</h3>
          </div>
          <button 
            onClick={() => setActiveTab('evidence')}
            className="text-xs font-mono text-emerald-400 hover:underline font-bold flex items-center gap-1"
          >
            View Evidence Vault &rarr;
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No incidents recorded. System monitoring in progress.
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => {
              const incHasGps = inc.lat !== null && inc.lng !== null && inc.lat !== 0 && inc.lng !== 0;
              return (
                <div 
                  key={inc.id} 
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isDark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm">{inc.id}</span>
                        <span className="text-xs font-mono text-slate-400">({inc.reason || inc.type})</span>
                        
                        {inc.status === 'CAPTURING_EVIDENCE' && (
                          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse">
                            📷 CAPTURING EVIDENCE...
                          </span>
                        )}
                        {inc.status === 'ANALYZING' && (
                          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                            🤖 AI ANALYZING BOTH PHOTOS...
                          </span>
                        )}
                        {inc.status === 'ANALYSIS_COMPLETE' && (
                          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ✅ DUAL-AI ANALYSIS COMPLETE
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-3 flex-wrap">
                        <span>Time: <strong className="text-slate-200">{inc.time}</strong></span>
                        <span>Location: <strong className={incHasGps ? 'text-emerald-400' : 'text-yellow-400'}>
                          {incHasGps ? `${inc.lat.toFixed(4)}° N, ${inc.lng.toFixed(4)}° E` : 'GPS Signal Unavailable (Waiting for Satellite Lock)'}
                        </strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                    {incHasGps ? (
                      <button
                        onClick={() => pinpointOnMap && pinpointOnMap(inc.lat, inc.lng)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-1.5"
                      >
                        📍 Pinpoint on Map
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">
                        GPS Searching...
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-mono font-extrabold rounded-lg border ${inc.badgeBg || 'bg-red-500/20 text-red-400 border-red-500/40'}`}>
                      {inc.severity || 'EVALUATING'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
