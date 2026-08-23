import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng && lat !== 0 && lng !== 0) {
      map.setView([lat, lng], 14, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export default function LiveMapTab({ theme, telemetry, incidents = [], focusedCoords }) {
  const isDark = theme === 'dark';

  const telemLat = telemetry ? telemetry.lat : null;
  const telemLng = telemetry ? telemetry.lng : null;

  const initialLat = (focusedCoords && focusedCoords.lat) ? focusedCoords.lat : (telemLat || 12.8214);
  const initialLng = (focusedCoords && focusedCoords.lng) ? focusedCoords.lng : (telemLng || 80.0433);

  const [latInput, setLatInput] = useState((focusedCoords && focusedCoords.lat) ? focusedCoords.lat.toString() : (telemLat ? telemLat.toString() : ''));
  const [lngInput, setLngInput] = useState((focusedCoords && focusedCoords.lng) ? focusedCoords.lng.toString() : (telemLng ? telemLng.toString() : ''));
  const [locationName, setLocationName] = useState(telemLat ? 'Active Sensor Geolocation Node' : 'GPS Signal Searching...');
  const [activeCoords, setActiveCoords] = useState({ lat: initialLat, lng: initialLng });

  const hasGpsLock = telemLat !== null && telemLng !== null && telemLat !== 0 && telemLng !== 0;

  useEffect(() => {
    if (focusedCoords && focusedCoords.lat && focusedCoords.lng) {
      setLatInput(focusedCoords.lat.toString());
      setLngInput(focusedCoords.lng.toString());
      setActiveCoords({ lat: focusedCoords.lat, lng: focusedCoords.lng });
      setLocationName(`Pinpointed Incident (${focusedCoords.lat.toFixed(4)}°, ${focusedCoords.lng.toFixed(4)}°)`);
    } else if (telemLat && telemLng) {
      setLatInput(telemLat.toString());
      setLngInput(telemLng.toString());
      setActiveCoords({ lat: telemLat, lng: telemLng });
      setLocationName('Arduino ESP32 Live Satellite Geolocation');
    }
  }, [focusedCoords, telemLat, telemLng]);

  const handleUpdatePinpoint = (e) => {
    e.preventDefault();
    const latVal = parseFloat(latInput);
    const lngVal = parseFloat(lngInput);

    if (!isNaN(latVal) && !isNaN(lngVal)) {
      setActiveCoords({ lat: latVal, lng: lngVal });
      setLocationName(`Custom Target (${latVal.toFixed(4)}° N, ${lngVal.toFixed(4)}° E)`);
    } else {
      alert("Please enter valid numerical values for Latitude and Longitude.");
    }
  };

  const panelBg = isDark
    ? 'glass-panel p-6 border-blue-500/40 bg-slate-950/70 text-slate-100'
    : 'p-6 border border-slate-200/90 bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl rounded-2xl';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full max-w-full"
    >
      {/* Geolocation Pinpoint Control Panel */}
      <div className={panelBg}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div>
            <h2 className={`text-base font-extrabold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              Genuine GPS Geolocation &amp; Satellite Radar Console
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Strict zero-fake rule: Displays and pinpoints map markers ONLY after genuine hardware GPS signal establishment.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {hasGpsLock ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                GPS SATELLITE FIX ESTABLISHED
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 font-bold flex items-center gap-2 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"></span>
                GPS SIGNAL SEARCHING (Awaiting Hardware Lock)
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdatePinpoint} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className={`block text-xs font-mono font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Latitude (°N)</label>
            <input 
              type="text" 
              value={latInput} 
              onChange={(e) => setLatInput(e.target.value)} 
              placeholder={hasGpsLock ? "e.g. 12.8214" : "Waiting for GPS signal..."} 
              className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none ${
                isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-mono font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Longitude (°E)</label>
            <input 
              type="text" 
              value={lngInput} 
              onChange={(e) => setLngInput(e.target.value)} 
              placeholder={hasGpsLock ? "e.g. 80.0433" : "Waiting for GPS signal..."} 
              className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none ${
                isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            />
          </div>

          <div className="flex items-end">
            <button 
              type="submit" 
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-400/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              Pinpoint Target Coordinates
            </button>
          </div>
        </form>
      </div>

      {/* Map Container */}
      <div className={`h-[580px] relative overflow-hidden flex flex-col rounded-2xl border ${
        isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-300 bg-white/90 shadow-lg'
      }`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          isDark ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-slate-100/90'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${hasGpsLock ? 'bg-emerald-500 animate-ping' : 'bg-yellow-500 animate-pulse'}`}></span>
            <h3 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>{locationName}</h3>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 font-bold self-start sm:self-auto">
            {hasGpsLock ? (
              <>📍 PINPOINT: Latitude {activeCoords.lat.toFixed(4)}° N, Longitude {activeCoords.lng.toFixed(4)}° E</>
            ) : (
              <>📡 GPS SIGNAL SEARCHING — Awaiting Hardware Fix...</>
            )}
          </div>
        </div>

        <div className="flex-1 relative z-0">
          <MapContainer 
            center={[activeCoords.lat, activeCoords.lng]} 
            zoom={13} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url={isDark 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />
            <RecenterMap lat={activeCoords.lat} lng={activeCoords.lng} />

            {/* Active Hardware Marker (Rendered only when valid coordinates exist) */}
            {activeCoords.lat && activeCoords.lng && (
              <Marker position={[activeCoords.lat, activeCoords.lng]} icon={redIcon}>
                <Popup>
                  <div className="p-2 space-y-1 font-mono text-xs">
                    <div className="font-bold text-red-500 text-sm">{locationName}</div>
                    <div className="font-bold text-slate-800">Latitude: {activeCoords.lat.toFixed(6)}° N</div>
                    <div className="font-bold text-slate-800">Longitude: {activeCoords.lng.toFixed(6)}° E</div>
                    <div className="text-xs text-red-600 font-bold mt-1">STATUS: Pinpointed Geolocation Target</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Incident Markers (Rendered only for incidents with genuine non-null coordinates) */}
            {incidents.filter(inc => inc.lat !== null && inc.lng !== null && inc.lat !== 0 && inc.lng !== 0).map((inc, idx) => (
              <Marker key={`inc-${inc.id || idx}`} position={[inc.lat, inc.lng]} icon={orangeIcon}>
                <Popup>
                  <div className="p-2 font-mono text-xs space-y-1">
                    <div className="font-extrabold text-orange-600">Incident #{inc.id}</div>
                    <div className="font-bold">{inc.reason || inc.type}</div>
                    <div className="text-slate-800">Lat: {inc.lat.toFixed(6)}° N</div>
                    <div className="text-slate-800">Lng: {inc.lng.toFixed(6)}° E</div>
                    <div className="text-purple-700 font-bold">Severity: {inc.severity || 'HIGH'}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </motion.div>
  );
}
