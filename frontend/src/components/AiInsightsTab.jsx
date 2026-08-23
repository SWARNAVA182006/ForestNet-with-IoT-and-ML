import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const BACKEND_URL = "http://127.0.0.1:5000/detect";

export default function AiInsightsTab({ onInferenceSuccess, theme }) {
  const isDark = theme === 'dark';
  const [selectedFile, setSelectedFile] = useState(null);
  const [origMediaUrl, setOrigMediaUrl] = useState('');
  const [isVid, setIsVid] = useState(false);
  const [predImgUrl, setPredImgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Awaiting Media or Live Stream');
  const [inferenceResult, setInferenceResult] = useState(null);

  // Live Webcam Streaming State
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStatus, setWebcamStatus] = useState('Webcam Offline');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const webcamIntervalRef = useRef(null);

  const startWebcamStream = async () => {
    try {
      setWebcamStatus('Initializing Webcam...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsWebcamActive(true);
      setWebcamStatus('Live Stream Active (Auto AI Predicting...)');

      // Capture frame every 2 seconds for Roboflow AI Inference
      webcamIntervalRef.current = setInterval(captureAndPredictWebcamFrame, 2200);
    } catch (err) {
      console.error("Webcam access error:", err);
      setWebcamStatus('Webcam Access Denied or Unavailable');
      alert("Could not access webcam: " + err.message);
    }
  };

  const stopWebcamStream = () => {
    if (webcamIntervalRef.current) {
      clearInterval(webcamIntervalRef.current);
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsWebcamActive(false);
    setWebcamStatus('Webcam Offline');
  };

  useEffect(() => {
    return () => {
      stopWebcamStream();
    };
  }, []);

  const captureAndPredictWebcamFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('image', blob, 'webcam_frame.jpg');

      try {
        setLoading(true);
        setStatusText('Analyzing Live Webcam Frame...');
        const resp = await fetch(BACKEND_URL, { method: 'POST', body: formData });
        const data = await resp.json();
        setLoading(false);

        if (resp.ok && data.success) {
          setStatusText('Live Stream Predicted');
          setPredImgUrl(data.annotated_image);
          const resObj = Array.isArray(data.result) ? data.result[0] : (data.result || {});
          setInferenceResult(resObj);
        }
      } catch (err) {
        setLoading(false);
        console.warn("Live webcam prediction frame error:", err);
      }
    }, 'image/jpeg', 0.85);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (isWebcamActive) {
      stopWebcamStream();
    }

    setSelectedFile(file);
    const mediaUrl = URL.createObjectURL(file);
    setOrigMediaUrl(mediaUrl);
    setIsVid(file.type.startsWith('video/'));

    setLoading(true);
    setStatusText('Processing Roboflow AI Workflow...');
    setPredImgUrl('');
    setInferenceResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const resp = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData
      });

      const data = await resp.json();
      setLoading(false);

      if (resp.ok && data.success) {
        setStatusText('Inference Complete');
        setPredImgUrl(data.annotated_image);

        const resObj = Array.isArray(data.result) ? data.result[0] : (data.result || {});
        setInferenceResult(resObj);

        if (onInferenceSuccess) {
          onInferenceSuccess(file.name, data.annotated_image, resObj);
        }
      } else {
        setStatusText('Prediction Error');
        alert("ML Backend Error: " + (data.error || 'Failed to analyze file'));
      }
    } catch (err) {
      setLoading(false);
      setStatusText('Backend Connection Error');
      alert("Could not connect to Python backend at " + BACKEND_URL);
      console.error(err);
    }
  };

  const getAlertBadges = () => {
    if (!inferenceResult) return [];
    const alerts = [];
    if (inferenceResult.suspected_poaching) alerts.push({ text: '🚨 Suspected Poaching Alert', bg: 'bg-red-500/20 text-red-500 border-red-500/40' });
    if (inferenceResult.tree_harm_risk) alerts.push({ text: '🌲 Tree Harm Risk Detected', bg: 'bg-orange-500/20 text-orange-600 border-orange-500/40' });
    if (inferenceResult.fire_or_smoke_alert) alerts.push({ text: '🔥 Fire or Smoke Alert', bg: 'bg-red-600/20 text-red-600 border-red-600/40' });
    if (inferenceResult.moving_humans) alerts.push({ text: '👤 Humans Detected', bg: 'bg-blue-500/20 text-blue-600 border-blue-500/40' });
    if (inferenceResult.moving_animals) alerts.push({ text: '🐾 Wildlife Detected', bg: 'bg-purple-500/20 text-purple-600 border-purple-500/40' });

    if (alerts.length === 0) {
      alerts.push({ text: '✅ Status: Clear (No threat alerts triggered)', bg: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40' });
    }
    return alerts;
  };

  const getDetectionRows = () => {
    if (!inferenceResult) return [];
    const threatPreds = (inferenceResult.threat_predictions || {}).predictions || [];
    const trackedPreds = (inferenceResult.tracked_entities || {}).predictions || [];

    const rows = [];
    threatPreds.forEach(p => rows.push({ cat: 'Threat Object', cls: p.class || p.label || 'Object', conf: p.confidence || 0, x: p.x || 0, y: p.y || 0, color: 'text-red-500' }));
    trackedPreds.forEach(p => rows.push({ cat: 'Tracked Entity', cls: p.class || p.label || 'Entity', conf: p.confidence || 0, x: p.x || 0, y: p.y || 0, color: 'text-blue-500' }));
    return rows;
  };

  const sectionBg = isDark
    ? 'glass-panel p-6 border-emerald-500/40 bg-slate-950/70 text-slate-100'
    : 'p-6 border border-slate-200/90 bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl rounded-xl';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full max-w-full"
    >
      {/* Hidden Canvas for Live Webcam Frame Capturing */}
      <canvas ref={canvasRef} className="hidden" />

      <section className={sectionBg}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-700/40 pb-4">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              AI Threat Detection Console
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Upload images/video OR launch live webcam AI prediction stream for real-time Roboflow threat detection.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Webcam Toggle Button */}
            {!isWebcamActive ? (
              <button
                onClick={startWebcamStream}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                📹 Start Live Webcam AI Stream
              </button>
            ) : (
              <button
                onClick={stopWebcamStream}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-red-400/30"
              >
                🛑 Stop Live Stream
              </button>
            )}

            <label htmlFor="tab-file-input" className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              Upload File &amp; Predict
            </label>
            <input type="file" id="tab-file-input" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
          </div>
        </div>

        {/* Status Bar */}
        {isWebcamActive && (
          <div className="p-3 mb-6 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-300 font-mono text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></span>
              <strong className="font-bold">WEBCAM LIVE STREAM ACTIVE</strong>
            </div>
            <span>Auto-predicting every 2s</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500 mb-2"></div>
            <p className="text-xs text-emerald-400 font-mono font-bold">{statusText}</p>
          </div>
        )}

        {/* Dual-Screen Console */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Media / Live Webcam Feed */}
          <div className={`p-4 rounded-xl border flex flex-col ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                1. {isWebcamActive ? 'Live Webcam Camera Stream' : 'Original Input Media'}
              </span>
              <span className="text-xs font-mono text-slate-500">{isWebcamActive ? 'Live Stream' : (selectedFile ? selectedFile.name : 'No File Loaded')}</span>
            </div>
            <div className="flex-1 bg-black rounded-lg border border-slate-800 flex items-center justify-center min-h-[320px] overflow-hidden relative">
              {isWebcamActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="max-h-[360px] w-full object-cover" />
              ) : origMediaUrl ? (
                isVid ? (
                  <video src={origMediaUrl} controls className="max-h-[360px] object-contain" />
                ) : (
                  <img src={origMediaUrl} alt="Original" className="max-h-[360px] object-contain" />
                )
              ) : (
                <span className="text-xs text-slate-500 font-mono">Camera or Media Standby</span>
              )}
            </div>
          </div>

          {/* ML Prediction Screen */}
          <div className={`p-4 rounded-xl border border-emerald-500/40 flex flex-col ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                2. Live Roboflow Bounding Box Prediction
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold">{statusText}</span>
            </div>
            <div className="flex-1 bg-black rounded-lg border border-slate-800 flex items-center justify-center min-h-[320px] overflow-hidden relative">
              {predImgUrl ? (
                <img src={predImgUrl} alt="Prediction Output" className="max-h-[360px] object-contain" />
              ) : (
                <span className="text-xs text-slate-500 font-mono">Live AI Bounding Boxes &amp; Threat Alerts Render Here</span>
              )}
            </div>
          </div>
        </div>

        {/* Results Details */}
        {inferenceResult && (
          <div className={`mt-6 p-5 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Triggered Alert Signals &amp; Object Classifications</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {getAlertBadges().map((b, idx) => (
                <span key={idx} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${b.bg}`}>{b.text}</span>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={isDark ? 'bg-slate-900 text-slate-400 border-b border-slate-800' : 'bg-slate-100 text-slate-700 border-b border-slate-300'}>
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Detected Class Label</th>
                    <th className="p-3">Confidence Score</th>
                    <th className="p-3">Bounding Box Center (X, Y)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
                  {getDetectionRows().map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold">{row.cat}</td>
                      <td className={`p-3 font-bold ${row.color}`}>{row.cls}</td>
                      <td className="p-3 font-mono">{(row.conf * 100).toFixed(1)}%</td>
                      <td className="p-3 font-mono text-slate-400">({Math.round(row.x)}, {Math.round(row.y)})</td>
                    </tr>
                  ))}
                  {getDetectionRows().length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-3 text-center text-slate-500 font-mono">No threat bounding boxes in current frame</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
}
