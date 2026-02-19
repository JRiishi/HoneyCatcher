/**
 * React Hooks for Mobile/Responsive Features
 */

import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile device
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to detect screen size breakpoints
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('mobile');
      else if (width < 768) setBreakpoint('sm');
      else if (width < 1024) setBreakpoint('md');
      else if (width < 1280) setBreakpoint('lg');
      else setBreakpoint('xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Hook to detect touch support
 */
export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window || navigator.maxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

/**
 * Hook to detect network status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for wake lock (keep screen on)
 */
export function useWakeLock() {
  const [wakeLock, setWakeLock] = useState(null);

  const request = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        return lock;
      }
    } catch (err) {
      console.error('Wake lock error:', err);
    }
    return null;
  };

  const release = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  };

  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [wakeLock]);

  return { request, release, wakeLock };
}

/**
 * Hook to detect PWA mode
 */
export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWA = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsPWA(checkPWA);
  }, []);

  return isPWA;
}

/**
 * Hook for orientation
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState(
    window.screen?.orientation?.type || 'landscape-primary'
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.screen?.orientation?.type || 'landscape-primary');
    };

    window.screen?.orientation?.addEventListener('change', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.screen?.orientation?.removeEventListener('change', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
}

/**
 * Hook for safe area insets (notch support)
 */
export function useSafeArea() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('--sat') || '0'),
        right: parseInt(style.getPropertyValue('--sar') || '0'),
        bottom: parseInt(style.getPropertyValue('--sab') || '0'),
        left: parseInt(style.getPropertyValue('--sal') || '0')
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}

/**
 * Hook for vibration feedback
 */
export function useVibrate() {
  const vibrate = (pattern = 200) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return vibrate;
}

/**
 * Hook for battery status
 */
export function useBatteryStatus() {
  const [battery, setBattery] = useState({
    level: 1,
    charging: false,
    chargingTime: 0,
    dischargingTime: Infinity
  });

  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then((batteryManager) => {
        const updateBattery = () => {
          setBattery({
            level: batteryManager.level,
            charging: batteryManager.charging,
            chargingTime: batteryManager.chargingTime,
            dischargingTime: batteryManager.dischargingTime
          });
        };

        updateBattery();
        batteryManager.addEventListener('levelchange', updateBattery);
        batteryManager.addEventListener('chargingchange', updateBattery);

        return () => {
          batteryManager.removeEventListener('levelchange', updateBattery);
          batteryManager.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);

  return battery;
}

/**
 * Hook for network information
 */
export function useNetworkInfo() {
  const [network, setNetwork] = useState({
    type: 'unknown',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  });

  useEffect(() => {
    const connection = 
      navigator.connection || 
      navigator.mozConnection || 
      navigator.webkitConnection;

    if (connection) {
      const updateNetwork = () => {
        setNetwork({
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
          saveData: connection.saveData || false
        });
      };

      updateNetwork();
      connection.addEventListener('change', updateNetwork);

      return () => {
        connection.removeEventListener('change', updateNetwork);
      };
    }
  }, []);

  return network;
}
