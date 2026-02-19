/**
 * PWA Utilities
 * Service worker registration and mobile detection
 */

/**
 * Register service worker for PWA functionality
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered:', registration.scope);
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            if (confirm('New version available! Reload to update?')) {
              window.location.reload();
            }
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Unregister service worker (for development)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('Service Worker unregistered');
    }
  }
}

/**
 * Check if app is running as PWA
 */
export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Detect mobile device
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detect touch support
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get device type
 */
export function getDeviceType() {
  const ua = navigator.userAgent;
  
  if (/iPad/.test(ua)) return 'tablet';
  if (/iPhone|iPod/.test(ua)) return 'phone';
  if (/Android/.test(ua)) {
    return /Mobile/.test(ua) ? 'phone' : 'tablet';
  }
  
  return 'desktop';
}

/**
 * Show install prompt for PWA
 */
export class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.setupInstallPrompt();
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent default install prompt
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('PWA install prompt ready');
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.deferredPrompt = null;
    });
  }

  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      return { outcome: 'not-available' };
    }

    // Show install prompt
    this.deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`Install prompt outcome: ${outcome}`);

    this.deferredPrompt = null;
    return { outcome };
  }

  canInstall() {
    return this.deferredPrompt !== null;
  }
}

/**
 * Request persistent storage for offline data
 */
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage: ${isPersisted ? 'granted' : 'denied'}`);
    return isPersisted;
  }
  return false;
}

/**
 * Check storage quota
 */
export async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = (usage / quota * 100).toFixed(2);
    
    return {
      usage,
      quota,
      percentUsed,
      usageInMB: (usage / 1024 / 1024).toFixed(2),
      quotaInMB: (quota / 1024 / 1024).toFixed(2)
    };
  }
  return null;
}

/**
 * Vibrate device (for mobile feedback)
 */
export function vibrate(pattern = 200) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Wake lock to keep screen on during calls
 */
export class WakeLock {
  constructor() {
    this.wakeLock = null;
  }

  async request() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake lock released');
        });
      }
    } catch (err) {
      console.error('Wake lock error:', err);
    }
  }

  async release() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
  }
}

/**
 * Share API for mobile sharing
 */
export async function shareContent(data) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
      }
      return false;
    }
  }
  return false;
}

/**
 * Copy to clipboard (with mobile fallback)
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  }
  
  // Fallback for older mobile browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
}
