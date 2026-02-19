/**
 * Mobile-optimized Navbar
 * Collapsible menu for small screens
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Home, LayoutDashboard, MessageSquare, 
  Phone, Settings, Shield, LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isMobile } from '../utils/pwa';

const MobileNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  useEffect(() => {
    // Close menu on route change
    setIsOpen(false);
  }, [location]);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/playground', label: 'Chat', icon: MessageSquare },
    { path: '/voice-playground', label: 'Voice', icon: Phone },
    { path: '/live-call', label: 'Live Call', icon: Phone },
    { path: '/call-starter', label: 'Call Starter', icon: Phone },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span className="font-black text-white tracking-tighter">
              HONEY<span className="text-emerald-400">BADGER</span>
            </span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl"
            style={{ top: '60px' }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-xs bg-gradient-to-br from-emerald-950/50 to-teal-950/50 border-l border-white/10 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Navigation Items */}
              <div className="space-y-2">
                {navItems.map((item, idx) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all active:scale-95 ${
                          isActive
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                            : 'hover:bg-white/5 text-white/70 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="absolute bottom-6 left-6 right-6 space-y-2">
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-all active:scale-95"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header */}
      <div className="h-[60px]" />
    </>
  );
};

export default MobileNavbar;
