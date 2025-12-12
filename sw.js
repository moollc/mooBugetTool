/* --- v19.51 Cache Version v19.52 --- */
const CACHE_NAME = 'moo-budget-v19-52';
const OFFLINE_URL = './index.html';

// Cache root and explicit index.html
const CRITICAL_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// External libraries & Assets
const EXTERNAL_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263/lucide.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    /* --- v19.51 Doc Parsers --- */
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    // Assets
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

/* --- v19.51 Offline Handler v19.52 --- */
self.addEventListener('fetch', (event) => {
    // 1. Navigation Requests (HTML) - "App Shell" Strategy
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Return cached HTML immediately if network fails
                    // This prevents the "Blank Screen" on mobile/PWA
                    return caches.match(OFFLINE_URL) || caches.match('./');
                })
        );
        return;
    }

    // 2. Asset Requests (CSS, JS, Images)
    event.respondWith(
        (async () => {
            // Check cache first for speed/offline capability
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;

            try {
                // If not in cache, fetch from network
                const networkResponse = await fetch(event.request);
                
                // Cache valid responses for next time
                if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                // Return simple offline message if all else fails
                return new Response("Offline - Content unavailable", { status: 503, headers: { 'Content-Type': 'text/plain' } });
            }
        })()
    );
});
