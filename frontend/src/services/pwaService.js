/**
 * EXAM.AI PWA Manager and Service Worker Registration Engine
 */

let deferredInstallPrompt = null;
const installListeners = new Set();
const onlineStatusListeners = new Set();

/**
 * Register Service Worker
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[EXAM.AI PWA] Service Worker registered with scope:', registration.scope);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[EXAM.AI PWA] New update available.');
                  // Check if student is in an active examination
                  const inExam = !!localStorage.getItem('active_exam_session') || window.location.pathname.includes('/exam-hall');
                  if (!inExam) {
                    // Safe to notify / update
                    window.dispatchEvent(new CustomEvent('pwa-update-available'));
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[EXAM.AI PWA] Service Worker registration failed:', error);
        });
    });
  }

  // Listen for PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    notifyInstallListeners(true);
  });

  // Track appinstalled
  window.addEventListener('appinstalled', () => {
    console.log('[EXAM.AI PWA] Application was successfully installed!');
    deferredInstallPrompt = null;
    notifyInstallListeners(false);
  });

  // Listen for online / offline network changes
  window.addEventListener('online', () => {
    notifyOnlineStatusListeners(true);
  });

  window.addEventListener('offline', () => {
    notifyOnlineStatusListeners(false);
  });
}

/**
 * Check if app is in standalone PWA display mode
 */
export function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Prompt user to install the PWA
 */
export async function promptPwaInstall() {
  if (!deferredInstallPrompt) {
    return false;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  console.log('[EXAM.AI PWA] User response to install prompt:', outcome);
  deferredInstallPrompt = null;
  notifyInstallListeners(false);
  return outcome === 'accepted';
}

/**
 * Check if install prompt is currently available
 */
export function isInstallPromptAvailable() {
  return !!deferredInstallPrompt && !isRunningStandalone();
}

/**
 * Subscribe to install prompt availability changes
 */
export function subscribeToInstallPrompt(callback) {
  installListeners.add(callback);
  callback(isInstallPromptAvailable());
  return () => installListeners.delete(callback);
}

function notifyInstallListeners(available) {
  installListeners.forEach((cb) => {
    try {
      cb(available);
    } catch (err) {
      console.error(err);
    }
  });
}

/**
 * Subscribe to network online/offline changes
 */
export function subscribeToOnlineStatus(callback) {
  onlineStatusListeners.add(callback);
  callback(navigator.onLine);
  return () => onlineStatusListeners.delete(callback);
}

function notifyOnlineStatusListeners(isOnline) {
  onlineStatusListeners.forEach((cb) => {
    try {
      cb(isOnline);
    } catch (err) {
      console.error(err);
    }
  });
}
