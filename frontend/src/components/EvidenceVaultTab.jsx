import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function EvidenceVaultTab({ theme, pinpointOnMap }) {
  const isDark = theme === 'dark';
  const [evidenceList, setEvidenceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [aiResultModal, setAiResultModal] = useState(null);
  const [activeAiPhotoTab, setActiveAiPhotoTab] = useState('photo1'); // 'photo1' or 'photo2'

  const cardBg = isDark 
    ? 'glass-panel p-6 border-slate-800/80 bg-slate-950/80 text-slate-100' 
    : 'p-6 border border-slate-200/90 bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl rounded-2xl';

  // Helper to ensure media URLs point directly to backend API (Port 5000)
  const resolveMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `http://127.0.0.1:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fetchEvidence = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/evidence');
      if (res.ok) {
        const data = await res.json();
        setEvidenceList(data);
      }
    } catch (err) {
      console.warn("Could not fetch evidence list", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
    const interval = setInterval(fetchEvidence, 3000);
    return () => clearInterval(interval);
  }, []);

  const triggerAiAnalysis = async (tsKey) => {
    setAnalyzingId(tsKey);
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/analyze_incident/${tsKey}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiResultModal({
          tsKey,
          photo1_ai: data.photo1_ai,
          photo1_result: data.photo1_result || {},
          photo2_ai: data.photo2_ai,
          photo2_result: data.photo2_result || {}
        });
        setActiveAiPhotoTab('photo1');
      }
    } catch (err) {
      console.error("Dual-Photo AI Analysis failed", err);
    } finally {
      setAnalyzingId(null);
      fetchEvidence();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full max-w-full"
    >
      {/* Evidence Vault Header */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-950/80 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-900 shadow-md'
      }`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/40">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            </div>
            <h2 className="text-xl font-extrabold tracking-wide">Captured Evidence Vault &amp; Dual-Photo AI Pipeline</h2>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              {evidenceList.length} Captured Incident{evidenceList.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Auto-synced proof folder: <span className="text-emerald-400 font-semibold">C:\Users\SWARNAVA\OneDrive\Desktop\proof</span>
          </p>
        </div>

        <button 
          onClick={fetchEvidence}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2 self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          Sync Evidence Directory
        </button>
      </div>

      {/* Lightbox / Zoom Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedMedia(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl p-4 border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute top-3 right-3 text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10"
            >✕</button>
            {selectedMedia.type === 'video' ? (
              <video controls autoPlay src={resolveMediaUrl(selectedMedia.url)} className="w-full max-h-[75vh] rounded-xl object-contain" />
            ) : (
              <img src={resolveMediaUrl(selectedMedia.url)} alt="Captured Evidence" className="w-full max-h-[75vh] rounded-xl object-contain" />
            )}
            <div className="mt-3 text-xs text-slate-300 font-mono flex justify-between items-center">
              <span>{selectedMedia.title}</span>
              <a href={resolveMediaUrl(selectedMedia.url)} download target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Download File</a>
            </div>
          </div>
        </div>
      )}

      {/* Dual-Photo AI Threat Result Modal */}
      {aiResultModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setAiResultModal(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-2xl p-6 border border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setAiResultModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10"
            >✕</button>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40 text-lg">🤖</span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Roboflow Dual-Photo AI Threat Analysis</h3>
                  <p className="text-xs text-purple-400 font-mono">Incident #{aiResultModal.tsKey} - Analyzed Photo 1 &amp; Photo 2</p>
                </div>
              </div>

              {/* Photo 1 vs Photo 2 Tab Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveAiPhotoTab('photo1')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeAiPhotoTab === 'photo1' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  📸 Photo 1 AI
                </button>
                <button
                  onClick={() => setActiveAiPhotoTab('photo2')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeAiPhotoTab === 'photo2' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  📸 Photo 2 (+2s) AI
                </button>
              </div>
            </div>

            {/* Display Active Photo AI Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-400">
                  {activeAiPhotoTab === 'photo1' ? 'Annotated Photo 1 Threat Frame:' : 'Annotated Photo 2 Threat Frame (+2s):'}
                </div>
                {activeAiPhotoTab === 'photo1' ? (
                  aiResultModal.photo1_ai ? (
                    <img src={aiResultModal.photo1_ai} alt="Photo 1 AI" className="w-full h-64 object-contain rounded-xl border border-slate-800 bg-black" />
                  ) : <div className="h-64 rounded-xl bg-slate-900 flex items-center justify-center text-xs text-slate-500 font-mono">Photo 1 AI Analysis Processing...</div>
                ) : (
                  aiResultModal.photo2_ai ? (
                    <img src={aiResultModal.photo2_ai} alt="Photo 2 AI" className="w-full h-64 object-contain rounded-xl border border-slate-800 bg-black" />
                  ) : <div className="h-64 rounded-xl bg-slate-900 flex items-center justify-center text-xs text-slate-500 font-mono">Photo 2 AI Analysis Processing...</div>
                )}
              </div>

              {/* Model Output Breakdown */}
              <div className="space-y-3 font-mono text-xs">
                <div className="text-slate-400">
                  {activeAiPhotoTab === 'photo1' ? 'Photo 1 Classification Signals:' : 'Photo 2 Classification Signals:'}
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  {(() => {
                    const resObj = activeAiPhotoTab === 'photo1' ? aiResultModal.photo1_result : aiResultModal.photo2_result;
                    return (
                      <>
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                          <span className="text-slate-400">Poaching Risk:</span>
                          <strong className={resObj.suspected_poaching ? 'text-red-400' : 'text-emerald-400'}>
                            {resObj.suspected_poaching ? 'HIGH RISK DETECTED 🚨' : 'CLEAR ✅'}
                          </strong>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                          <span className="text-slate-400">Fire / Smoke:</span>
                          <strong className={resObj.fire_or_smoke_alert ? 'text-red-400' : 'text-emerald-400'}>
                            {resObj.fire_or_smoke_alert ? 'FIRE ALERT 🚨' : 'NORMAL ✅'}
                          </strong>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                          <span className="text-slate-400">Moving Humans:</span>
                          <strong className={resObj.moving_humans ? 'text-yellow-400' : 'text-slate-400'}>
                            {resObj.moving_humans ? 'DETECTED' : 'NONE'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Wildlife Detected:</span>
                          <strong className={resObj.moving_animals ? 'text-emerald-400' : 'text-slate-400'}>
                            {resObj.moving_animals ? 'DETECTED' : 'NONE'}
                          </strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Items Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          Scanning Proof Directory &amp; Dual-Photo AI Pipeline...
        </div>
      ) : evidenceList.length === 0 ? (
        <div className={`${cardBg} py-16 text-center text-slate-400 font-mono text-sm space-y-3`}>
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 001.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          </div>
          <div className="text-base font-bold text-slate-200">No Evidence Records Found Yet</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When sensor thresholds trigger, Photo 1 and Photo 2 are captured and BOTH automatically sent to Roboflow AI for threat detection!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {evidenceList.map((item, idx) => (
            <motion.div 
              key={item.id || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`${cardBg} relative border-emerald-500/30 overflow-hidden space-y-4`}
            >
              {/* Card Header & AI Trigger Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800/60 gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-extrabold tracking-wide">Incident #{evidenceList.length - idx}</span>
                      <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40">
                        {item.reason || 'ALERT TRIGGERED'}
                      </span>
                      {item.ai_labels && item.ai_labels.map((lbl, lIdx) => (
                        <span key={lIdx} className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          🤖 Dual-AI: {lbl}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      Captured: <strong className="text-slate-200">{item.timestamp || 'Live'}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
                  {(item.lat !== null && item.lng !== null && item.lat !== 0 && item.lng !== 0) ? (
                    <button
                      onClick={() => pinpointOnMap && pinpointOnMap(item.lat, item.lng)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-1.5"
                    >
                      📍 Pinpoint Coords on Map
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 font-mono text-xs font-bold border border-slate-700">
                      GPS Signal Unavailable
                    </span>
                  )}
                  <button
                    onClick={() => triggerAiAnalysis(item.id)}
                    disabled={analyzingId === item.id}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {analyzingId === item.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing Both Photos...
                      </>
                    ) : (
                      <>
                        ⚡ Send BOTH Photos to AI Detector
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid: Photo 1, Photo 2, and 6-Second Evidence Video */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Photo 1 Card */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-300">📸 Photo 1 (AI Analyzed)</span>
                    <span className="text-[10px] text-purple-400 font-bold">ROBOFLOW AI</span>
                  </div>
                  {item.ai_photo1_url || item.photo1_url ? (
                    <div 
                      onClick={() => setSelectedMedia({ type: 'image', url: item.ai_photo1_url || item.photo1_url, title: `${item.photo1_name} (AI Analyzed)` })}
                      className="relative h-48 rounded-xl overflow-hidden border border-purple-500/50 group cursor-pointer bg-slate-900 shadow-md"
                    >
                      <img src={resolveMediaUrl(item.ai_photo1_url || item.photo1_url)} alt="Photo 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-2 left-2 bg-purple-900/90 text-purple-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        AI Bounding Boxes
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                        Click to Expand 🔍
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-xs text-slate-500 font-mono">
                      Photo 1 Capturing...
                    </div>
                  )}
                </div>

                {/* Photo 2 Card */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-300">📸 Photo 2 (+2s Delay AI)</span>
                    <span className="text-[10px] text-purple-400 font-bold">ROBOFLOW AI</span>
                  </div>
                  {item.ai_photo2_url || item.photo2_url ? (
                    <div 
                      onClick={() => setSelectedMedia({ type: 'image', url: item.ai_photo2_url || item.photo2_url, title: `${item.photo2_name} (AI Analyzed)` })}
                      className="relative h-48 rounded-xl overflow-hidden border border-purple-500/50 group cursor-pointer bg-slate-900 shadow-md"
                    >
                      <img src={resolveMediaUrl(item.ai_photo2_url || item.photo2_url)} alt="Photo 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-2 left-2 bg-purple-900/90 text-purple-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        AI Bounding Boxes
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                        Click to Expand 🔍
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-xs text-slate-500 font-mono">
                      Photo 2 Capturing...
                    </div>
                  )}
                </div>

                {/* 6-Second Evidence Video Player */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-300">🎥 6-Second Evidence Video</span>
                    <span className="text-[10px] text-red-400 font-bold">RECORDED</span>
                  </div>
                  {item.video_url ? (
                    <div className="relative h-48 rounded-xl overflow-hidden border border-slate-700/80 bg-black shadow-md">
                      <video controls preload="metadata" src={resolveMediaUrl(item.video_url)} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-48 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-xs text-slate-500 font-mono">
                      Video Recording...
                    </div>
                  )}
                </div>
              </div>

              {/* Data Log File Preview Card */}
              {item.log_content && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-300">📄 Incident Data Log File ({item.log_name || 'DataLog.txt'})</span>
                    <a href={resolveMediaUrl(item.log_url)} download target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Download Data Log</a>
                  </div>
                  <pre className={`p-4 rounded-xl font-mono text-xs overflow-x-auto border leading-relaxed ${
                    isDark ? 'bg-slate-900/90 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-emerald-400'
                  }`}>
                    {item.log_content}
                  </pre>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
