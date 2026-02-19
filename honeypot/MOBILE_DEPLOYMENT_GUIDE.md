# 📱 HoneyBadger Mobile Deployment Guide

## Overview

HoneyBadger is now a **Progressive Web App (PWA)** that works seamlessly on both desktop and mobile devices. This guide covers mobile-specific deployment and testing.

## ✨ Mobile Features

### PWA Capabilities
- ✅ **Install to Home Screen** - Appears like a native app
- ✅ **Offline Support** - Service worker caching
- ✅ **Push Notifications** - Real-time alerts (ready)
- ✅ **Background Sync** - Queue actions when offline
- ✅ **Wake Lock** - Keep screen on during live calls
- ✅ **Haptic Feedback** - Vibration on interactions
- ✅ **Share API** - Native sharing dialogs
- ✅ **Battery Status** - Monitor battery level
- ✅ **Network Info** - Connection type and speed
- ✅ **Safe Area** - Notch support for modern phones

### Mobile Optimizations
- 📱 Touch-friendly buttons (minimum 44px)
- 📱 Collapsible navigation menu
- 📱 Swipeable panels
- 📱 Responsive layouts (320px - 768px)
- 📱 Larger fonts for readability
- 📱 Thumb-zone friendly controls
- 📱 Prevent zoom on input focus (iOS)
- 📱 Pull-to-refresh prevention

## 🚀 Deployment Steps

### 1. Generate Icons

**Option A: Using Node.js script**
```bash
cd frontend
node scripts/generate-icons.js
```

**Option B: Using Sharp (requires npm package)**
```bash
cd frontend
npm install sharp
node scripts/generate-icons-sharp.js
```

**Option C: Using ImageMagick (Linux/WSL)**
```bash
cd frontend/public/icons
convert -background none -resize 72x72 icon.svg icon-72x72.png
convert -background none -resize 96x96 icon.svg icon-96x96.png
convert -background none -resize 128x128 icon.svg icon-128x128.png
convert -background none -resize 144x144 icon.svg icon-144x144.png
convert -background none -resize 152x152 icon.svg icon-152x152.png
convert -background none -resize 192x192 icon.svg icon-192x192.png
convert -background none -resize 384x384 icon.svg icon-384x384.png
convert -background none -resize 512x512 icon.svg icon-512x512.png
```

**Option D: Online Tool**
1. Open `frontend/public/icons/icon.svg`
2. Upload to https://realfavicongenerator.net/
3. Download generated icons
4. Place in `frontend/public/icons/` directory

### 2. Build for Production

```bash
cd frontend
npm run build
```

This creates an optimized production build in `frontend/dist/`.

### 3. Serve with HTTPS (REQUIRED for PWA)

PWAs require HTTPS. Use one of these methods:

**Option A: Self-signed certificate (testing only)**
```bash
# Generate certificate
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes

# Serve with HTTPS
npx serve -s dist -p 5173 --ssl-cert cert.pem --ssl-key key.pem
```

**Option B: ngrok (tunneling)**
```bash
# Install ngrok: https://ngrok.com/download
npm run build
npx serve -s dist -p 5173

# In another terminal
ngrok http 5173
# Use the HTTPS URL provided (e.g., https://abc123.ngrok.io)
```

**Option C: Production deployment (recommended)**
- Deploy to **Vercel** (automatic HTTPS)
- Deploy to **Netlify** (automatic HTTPS)
- Deploy to **Azure Static Web Apps** (automatic HTTPS)
- Deploy to **AWS Amplify** (automatic HTTPS)

### 4. Backend Configuration

Ensure backend is accessible from mobile:

**Option A: Local network (same WiFi)**
```python
# backend/main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Get your local IP:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

Update frontend API URL:
```javascript
// frontend/src/services/api.js
const BASE_URL = 'http://192.168.1.100:8000'; // Your local IP
```

**Option B: Cloud deployment (recommended)**
- Deploy backend to **Azure App Service**
- Deploy backend to **AWS EC2/ECS**
- Deploy backend to **Google Cloud Run**
- Deploy backend to **Heroku**

## 📲 Testing on Mobile

### iOS (Safari)

1. **Access the app:**
   - Connect iPhone to same WiFi as your computer
   - Open Safari and go to `https://your-url.com`
   - Accept certificate warning (if self-signed)

2. **Install PWA:**
   - Tap the Share button (square with arrow)
   - Scroll down and tap "Add to Home Screen"
   - Tap "Add" to confirm
   - App icon appears on home screen

3. **Test features:**
   - Open app from home screen (should be full-screen)
   - Test offline mode (turn off WiFi, app should still load)
   - Test microphone permissions (Live Call)
   - Test share functionality
   - Check notch safe area (iPhone X+)

4. **iOS Quirks:**
   - Service worker updates on app kill (not background)
   - No push notifications on iOS PWAs (yet)
   - Audio recording requires user gesture
   - Wake Lock API not supported (use NoSleep.js)

### Android (Chrome)

1. **Access the app:**
   - Connect Android to same WiFi
   - Open Chrome and go to `https://your-url.com`
   - Accept certificate warning (if self-signed)

2. **Install PWA:**
   - After 30 seconds, install banner appears
   - Tap "Install" button
   - Or: Menu (⋮) → "Add to Home screen"
   - App icon appears on home screen and app drawer

3. **Test features:**
   - Open app from home screen
   - Test offline mode
   - Test microphone permissions
   - Test vibration (haptic feedback)
   - Test wake lock (screen stays on during call)
   - Test battery status
   - Test network info

4. **Android Advantages:**
   - Full PWA support (push notifications work)
   - Wake Lock API supported
   - Better service worker handling
   - WebAPK installation (appears as native app)

## 🔧 Troubleshooting

### Install prompt not showing

**Criteria for install prompt:**
- Must be served over HTTPS
- Must have valid `manifest.json`
- Must have service worker registered
- Must have at least 192x192 and 512x512 icons
- User must interact with page (tap/scroll)
- App must not already be installed

**Check in DevTools:**
```javascript
// Chrome DevTools → Console
navigator.serviceWorker.getRegistrations().then(console.log)
```

### Service worker not updating

**Force update:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.update());
});
```

**Or unregister:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
// Refresh page
```

### Icons not loading

1. Check icon paths in `manifest.json`
2. Verify icons exist: `frontend/public/icons/icon-*.png`
3. Check console for 404 errors
4. Clear browser cache
5. Test: https://your-url.com/icons/icon-192x192.png

### Microphone not working

1. **Check permissions:**
   - Chrome: Settings → Site settings → Microphone
   - Safari: Settings → Safari → Microphone

2. **iOS requires user gesture:**
   ```javascript
   button.addEventListener('click', async () => {
     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
   });
   ```

3. **Check HTTPS:**
   - `getUserMedia` requires HTTPS (except localhost)

### WebSocket connection fails

1. **Check URL scheme:**
   ```javascript
   // Correct
   const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
   const ws = new WebSocket(`${protocol}//${location.host}/api/live-call/ws`);
   ```

2. **Backend WebSocket route:**
   ```python
   # backend/main.py
   app.add_websocket_route("/api/live-call/ws/{session_id}", websocket_endpoint)
   ```

3. **CORS and headers:**
   - Ensure backend allows WebSocket upgrades
   - Check for proxy misconfigurations

### Offline mode not working

1. **Check service worker registration:**
   - DevTools → Application → Service Workers
   - Status should be "activated and running"

2. **Check cache:**
   - DevTools → Application → Cache Storage
   - Should see `honeybadger-v1.0.0` cache

3. **Network interception:**
   - DevTools → Network → Throttling → Offline
   - Refresh page, should load from cache

## 🎯 Performance Optimization

### Lighthouse Audit

1. Open DevTools → Lighthouse
2. Select "Progressive Web App"
3. Click "Generate report"
4. Target: 90+ score

**Common issues:**
- Missing icons → Add all required sizes
- Service worker not registered → Check HTTPS
- Not installable → Check manifest.json
- Slow load times → Optimize images/code splitting

### Bundle Size

```bash
# Analyze bundle
cd frontend
npm run build -- --analyze

# Check size
du -sh dist/
```

**Target:** < 500KB initial bundle

### Image Optimization

```bash
# Compress PNGs
pngquant --quality=65-80 icon-*.png

# Or use online tools
# - TinyPNG.com
# - Squoosh.app
```

## 📊 Analytics & Monitoring

### Track PWA Installs

```javascript
// frontend/src/utils/pwa.js
window.addEventListener('beforeinstallprompt', (e) => {
  // Track install prompt shown
  gtag('event', 'pwa_install_prompt_shown');
});

window.addEventListener('appinstalled', () => {
  // Track successful install
  gtag('event', 'pwa_installed');
});
```

### Monitor Service Worker

```javascript
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('New service worker activated');
  // Track update
  gtag('event', 'pwa_updated');
});
```

## 🔐 Security Considerations

### HTTPS Everywhere
- Never run PWA over HTTP in production
- Use Let's Encrypt for free HTTPS
- Redirect HTTP → HTTPS

### Content Security Policy

Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               connect-src 'self' wss://* ws://localhost:*; 
               img-src 'self' data: https:;">
```

### Permissions

Request only when needed:
```javascript
// Don't request on page load
// ❌ Bad
navigator.mediaDevices.getUserMedia({ audio: true });

// ✅ Good
button.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
});
```

## 🚀 Production Deployment Checklist

- [ ] Icons generated (all 8 sizes)
- [ ] Production build created (`npm run build`)
- [ ] HTTPS enabled
- [ ] Backend accessible from internet
- [ ] WebSocket connections work over WSS
- [ ] Service worker registers successfully
- [ ] Manifest.json loads (no 404)
- [ ] Icons load (no 404)
- [ ] Install prompt appears on mobile
- [ ] App installs to home screen
- [ ] Offline mode works
- [ ] Microphone permissions work
- [ ] Live Call connects and records
- [ ] Wake lock keeps screen on
- [ ] Vibration provides feedback
- [ ] Battery warning shows at < 20%
- [ ] Network status updates correctly
- [ ] Lighthouse PWA score > 90
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Analytics tracking PWA installs

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://web.dev/add-manifest/)
- [Workbox (Advanced SW)](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)
- [Can I Use](https://caniuse.com/) - Browser compatibility

## 🆘 Support

For issues specific to HoneyBadger PWA:
1. Check browser console for errors
2. Check service worker status (DevTools → Application)
3. Verify manifest.json is valid (JSON validators)
4. Test on different devices/browsers
5. Check network connectivity

**Common Error Messages:**

| Error | Solution |
|-------|----------|
| "Service worker registration failed" | Check HTTPS, verify service-worker.js exists |
| "Manifest fetch failed" | Check manifest.json path, verify JSON syntax |
| "Icons missing" | Generate icons, verify paths in manifest |
| "getUserMedia not allowed" | Enable HTTPS, check permissions |
| "WebSocket connection failed" | Use WSS, check backend WebSocket route |

---

**Status:** PWA foundation complete ✅  
**Next Steps:** Generate icons → Test on mobile → Deploy to production

**Sync Status:** Desktop and mobile automatically synced (same codebase, same backend API) ✅
