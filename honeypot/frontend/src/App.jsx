import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import SessionView from './pages/SessionView.jsx';
import Playground from './pages/Playground.jsx';
import VoicePlayground from './pages/VoicePlayground.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LiveTakeoverMode from './pages/LiveTakeoverMode.jsx';
import VoiceCloneSetup from './pages/VoiceCloneSetup.jsx';
import LiveCall from './pages/LiveCall.jsx';
import CallStarter from './pages/CallStarter.jsx';
import MobileNavbar from './components/MobileNavbar.jsx';
import InstallPWAButton from './components/InstallPWAButton.jsx';
import OfflineIndicator from './components/OfflineIndicator.jsx';
import MobileOptimizedLiveCall from './components/MobileOptimizedLiveCall.jsx';
import { isMobile } from './utils/pwa.js';

function App() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(isMobile());
    
    // Add mobile class to body
    if (isMobile()) {
      document.body.classList.add('mobile');
    }
  }, []);

  return (
    <Router>
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Mobile Navigation - only show on mobile and not on landing page */}
      {isMobileDevice && window.location.pathname !== '/' && <MobileNavbar />}
      
      {/* Main Routes */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/session/:id" element={<SessionView />} />
        <Route path="/voice" element={<VoicePlayground />} />
        <Route path="/voice-playground" element={<VoicePlayground />} />
        <Route path="/live-takeover" element={<LiveTakeoverMode />} />
        <Route path="/voice-clone-setup" element={<VoiceCloneSetup />} />
        <Route path="/live-call" element={isMobileDevice ? <MobileOptimizedLiveCall /> : <LiveCall />} />
        <Route path="/call-starter" element={<CallStarter />} />
      </Routes>

      {/* PWA Install Prompt */}
      <InstallPWAButton />
    </Router>
  );
}

export default App;
