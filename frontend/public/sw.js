/**
 * EXAM.AI Intelligent Examination Platform - Service Worker
 * Version: 1.0.0
 *
 * CRITICAL SAFETY RULES:
 * 1. Cache only static UI assets (HTML shell, bundled JS, CSS, fonts, icons).
 * 2. NEVER cache dynamic exam APIs (/api/exams/*, /api/questions/*, /api/answers/*, /api/proctor/*, /api/auth/*, /api/student/*).
 * 3. Never return stale exam data during an active assessment.
 * 4. Safe offline fallback for static app shells.
 * 5. Non-destructive update handling.
 */

const CACHE_NAME = 'exam-ai-static-v1';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png'
];

// Patterns for API routes that MUST NEVER BE CACHED
const UNCACHABLE_API_PATTERNS = [
  '/api/',
  ':8001',
  '/api/exams',
  '/api/questions',
  '/api/answers',
  '/api/submit',
  '/api/proctor',
  '/api/auth',
  '/api/student',
  '/api/admin',
  '/docs',
  '/openapi.json'
];

// Install Event: Pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Don't auto-skipWaiting to protect active exams
    })
  );
});

// Activate Event: Cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Helper: Check if request is an API or dynamic endpoint
function isApiRequest(url) {
  return UNCACHABLE_API_PATTERNS.some((pattern) => url.includes(pattern));
}

// Fetch Event: Network-first / Cache-first strategy tailored for exams
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // 1. NON-GET requests (POST, PUT, DELETE, etc.) -> ALWAYS Network Only
  if (request.method !== 'GET') {
    return;
  }

  // 2. API requests -> STRICTLY Network-Only with graceful offline JSON fallback
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'offline',
            message: 'Internet connection lost. Examination session is running in offline protection mode. Please reconnect.'
          }),
          {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts, App Shell) -> Stale-While-Revalidate / Cache-First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to keep cache up to date
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Not in cache -> Fetch from network
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache valid static responses
          const responseToCache = networkResponse.clone();
          if (
            url.includes('/assets/') ||
            url.includes('fonts.googleapis.com') ||
            url.includes('fonts.gstatic.com') ||
            url.endsWith('.png') ||
            url.endsWith('.svg') ||
            url.endsWith('.css') ||
            url.endsWith('.js')
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          // If navigation request fails, return cached index.html shell
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return new Response('Network error occurred while offline.', { status: 503 });
        });
    })
  );
});

// Safe Update Messaging: allow app to trigger skipWaiting when not in active exam
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
