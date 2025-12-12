/* --- v19.51 Cache Version v19.52 --- */
const CACHE_NAME = 'moo-budget-v19-52';

// Cache root and explicit index.html
const CRITICAL_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// External libraries & Assets
const EXTERNAL_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263/lucide.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    /* --- v19.51 Doc Parsers --- */
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    // FIXED: Updated Icon Paths (PNGs)
    'https://raw.githubusercontent.com/moollc/mooBudgetTool/main/assets/cow-512.png',
    'https://raw.githubusercontent.com/moollc/mooBudgetTool/main/assets/cow-192.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await cache.addAll(CRITICAL_ASSETS);
            await Promise.all(
                EXTERNAL_ASSETS.map(url => 
                    fetch(url).then(res => {
                        if (res.ok) return cache.put(url, res);
                    }).catch(err => console.log('Failed to cache external:', url))
                )
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
});

/* --- v19.51 Offline Handler --- */
self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            // 1. Try Network First
            try {
                const networkResponse = await fetch(event.request);
                
                // If successful and valid, update the cache for next time
                if (networkResponse && networkResponse.status === 200) {
                    const cache = await caches.open(CACHE_NAME);
                    // Only cache valid HTTP/HTTPS requests (skips chrome-extension://, etc.)
                    if(event.request.url.startsWith('http')) {
                        cache.put(event.request, networkResponse.clone());
                    }
                }
                return networkResponse;
            } catch (error) {
                // 2. Network Failed (Offline) - Fallback Strategy
                
                // A. Check for exact match in cache (CSS, JS, Images)
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                // B. Navigation Fallback (The "App Shell" Fix)
                // If the user is trying to open the app (HTML), force load the cached index.html
                if (event.request.mode === 'navigate') {
                    // Try finding the explicit index.html
                    const appShell = await caches.match('./index.html');
                    if (appShell) return appShell;
                    
                    // Fallback: Try the root path if index.html lookup fails
                    const rootShell = await caches.match('./');
                    if (rootShell) return rootShell;
                }

                // 3. If absolutely nothing works, return a basic offline message
                return new Response("Offline - Content unavailable", { status: 503, headers: { 'Content-Type': 'text/plain' } });
            }
        })()
    );
});
