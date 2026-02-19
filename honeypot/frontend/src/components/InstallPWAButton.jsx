/**
 * Install PWA Button
 * Shows install prompt for mobile users
 */

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PWAInstaller, isPWA } from '../utils/pwa';

const InstallPWAButton = () => {
  const [installer, setInstaller] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as PWA
    if (isPWA()) {
      setIsInstalled(true);
      return;
    }

    // Initialize PWA installer
    const pwaInstaller = new PWAInstaller();
    setInstaller(pwaInstaller);

    // Check if can install after a delay
    setTimeout(() => {
      if (pwaInstaller.canInstall()) {
        setCanInstall(true);
        
        // Show banner after user has been on site for 30 seconds
        // and hasn't dismissed it before
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setTimeout(() => setShowBanner(true), 30000);
        }
      }
    }, 1000);
  }, []);

  const handleInstall = async () => {
    if (!installer) return;

    const result = await installer.showInstallPrompt();
    
    if (result.outcome === 'accepted') {
      setShowBanner(false);
      setCanInstall(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || !canInstall) return null;

  return (
    <>
      {/* Floating Install Button */}
      {!showBanner && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={handleInstall}
          className="fixed bottom-20 right-4 z-40 p-3 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/50 active:scale-95 transition-all"
        >
          <Download className="w-5 h-5 text-white" />
        </motion.button>
      )}

      {/* Install Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1">
                  Install HoneyBadger
                </h3>
                <p className="text-sm text-white/80">
                  Install our app for a better experience with offline support and faster access.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="px-4 py-2 bg-white text-emerald-600 font-bold rounded-lg text-sm hover:bg-white/90 active:scale-95 transition-all"
                  >
                    Install Now
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 bg-white/20 text-white font-medium rounded-lg text-sm hover:bg-white/30 active:scale-95 transition-all"
                  >
                    Not Now
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPWAButton;
