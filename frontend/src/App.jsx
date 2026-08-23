import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import ThreeBackground from './components/ThreeBackground';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewTab from './components/OverviewTab';
import EvidenceVaultTab from './components/EvidenceVaultTab';
import LiveMapTab from './components/LiveMapTab';
import AiInsightsTab from './components/AiInsightsTab';
import AlertsTab from './components/AlertsTab';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [focusedCoords, setFocusedCoords] = useState(null);

  // Live Telemetry State fetched from Backend / ESP32 Arduino
  const [telemetry, setTelemetry] = useState({
    temperature: 30.4,
    humidity: 70.8,
    smoke: 231,
    motion: "NO MOTION",
    lat: 12.8214,
    lng: 80.0433,
    alert_active: false,
    alert_reason: "NORMAL",
    last_updated: "Connecting..."
  });

  const [incidents, setIncidents] = useState([]);

  // Polling backend API for real-time ESP32 Telemetry & Incidents
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const resp = await fetch('http://127.0.0.1:5000/api/telemetry');
        if (resp.ok) {
          const data = await resp.json();
          setTelemetry(data);
        }
      } catch (err) {
        console.warn("Could not poll /api/telemetry", err);
      }
    };

    const fetchIncidents = async () => {
      try {
        const resp = await fetch('http://127.0.0.1:5000/api/incidents');
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            setIncidents(data);
          }
        }
      } catch (err) {
        console.warn("Could not poll /api/incidents", err);
      }
    };

    const fetchEvidenceCount = async () => {
      try {
        const resp = await fetch('http://127.0.0.1:5000/api/evidence');
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            setEvidenceCount(data.length);
          }
        }
      } catch (err) {
        console.warn("Could not poll /api/evidence", err);
      }
    };

    fetchTelemetry();
    fetchIncidents();
    fetchEvidenceCount();

    const interval = setInterval(() => {
      fetchTelemetry();
      fetchIncidents();
      fetchEvidenceCount();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const pinpointOnMap = (lat, lng) => {
    if (lat && lng) {
      setFocusedCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
      setActiveTab('map');
    }
  };

  const handleInferenceSuccess = (filename, annotatedImage, resultObj) => {
    const newInc = {
      id: Date.now(),
      type: "Roboflow ML Detection (" + filename + ")",
      time: new Date().toLocaleTimeString(),
      location: "12.8214° N, 80.0433° E",
      lat: 12.8214,
      lng: 80.0433,
      severity: "Active",
      status: "PROCESSED",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
    };
    setIncidents(prev => [newInc, ...prev]);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab setActiveTab={setActiveTab} incidents={incidents} theme={theme} telemetry={telemetry} pinpointOnMap={pinpointOnMap} />;
      case 'evidence':
        return <EvidenceVaultTab theme={theme} pinpointOnMap={pinpointOnMap} />;
      case 'map':
        return <LiveMapTab theme={theme} telemetry={telemetry} incidents={incidents} focusedCoords={focusedCoords} />;
      case 'ai-insights':
        return <AiInsightsTab onInferenceSuccess={handleInferenceSuccess} theme={theme} />;
      case 'alerts':
        return <AlertsTab incidents={incidents} theme={theme} pinpointOnMap={pinpointOnMap} />;
      default:
        return <OverviewTab setActiveTab={setActiveTab} incidents={incidents} theme={theme} telemetry={telemetry} pinpointOnMap={pinpointOnMap} />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen onFinish={() => setIsLoading(false)} />}
      </AnimatePresence>

      <div className={`flex h-screen overflow-hidden text-sm relative transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#05070c] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <ThreeBackground theme={theme} />

        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          activeIncidentsCount={incidents.filter(i => i.status === 'CRITICAL' || i.severity === 'CRITICAL').length}
          evidenceCount={evidenceCount}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          theme={theme}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
          <Header 
            theme={theme} 
            toggleTheme={toggleTheme} 
            telemetry={telemetry} 
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {renderActiveView()}
          </main>
        </div>
      </div>
    </>
  );
}
