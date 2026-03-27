/* ══════════════════════════════════════════════════════════
   SW.JS — Service Worker — CodeLearn PWA
   Cache-first strategy + offline support
   ══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'codelearn-v1';

// ── Fichiers essentiels (App Shell) ──
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './css/sidebar.css',
    './css/content.css',
    './css/code-blocks.css',
    './css/dark-mode.css',
    './js/app.js',
    './js/data.json',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

// ── Tous les fichiers de cours ──
const COURSES = [
    // HTML
    './courses/html/01-introduction.html',
    './courses/html/02-balises.html',
    './courses/html/03-semantique.html',
    './courses/html/04-formulaires.html',
    './courses/html/05-media.html',
    // CSS
    './courses/css/01-introduction.html',
    './courses/css/02-selecteurs.html',
    './courses/css/03-box-model.html',
    './courses/css/04-flexbox.html',
    './courses/css/05-grid.html',
    './courses/css/06-responsive.html',
    // JavaScript
    './courses/javascript/01-introduction.html',
    './courses/javascript/02-variables.html',
    './courses/javascript/03-fonctions.html',
    './courses/javascript/04-dom.html',
    './courses/javascript/05-async.html',
    // Go
    './courses/go/01-introduction.html',
    './courses/go/02-syntaxe.html',
    './courses/go/03-goroutines.html',
    // Rust
    './courses/rust/01-introduction.html',
    './courses/rust/02-ownership.html',
    // Docker
    './courses/docker/01-introduction.html',
    './courses/docker/02-images.html',
    './courses/docker/03-compose.html',
    // Git
    './courses/git/01-introduction.html',
    './courses/git/02-bases.html',
    // Editors
    './courses/editors/01-vscode.html',
    './courses/editors/02-extensions.html',
    // AI
    './courses/ai/01-introduction.html',
    './courses/ai/02-copilot.html',
    './courses/ai/03-prompt-basics.html',
    './courses/ai/04-prompt-advanced.html'
];

// ── Ressources externes (Google Fonts, Material Icons) ──
const EXTERNAL = [
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// Tout combiner
const ALL_FILES = [...APP_SHELL, ...COURSES, ...EXTERNAL];


/* ─────────────────────────────────
   INSTALL — Pre-cache all resources
   ───────────────────────────────── */
self.addEventListener('install', function (event) {
    console.log('[SW] Install — Mise en cache de', ALL_FILES.length, 'fichiers');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                // Cache app shell (critical) — must succeed
                return cache.addAll(APP_SHELL)
                    .then(function () {
                        console.log('[SW] App shell en cache ✓');

                        // Cache courses (non-critical) — can fail individually
                        var promises = COURSES.map(function (url) {
                            return cache.add(url).catch(function (err) {
                                console.warn('[SW] Impossible de cacher:', url, err.message);
                            });
                        });

                        // Cache external (non-critical)
                        EXTERNAL.forEach(function (url) {
                            promises.push(
                                cache.add(url).catch(function (err) {
                                    console.warn('[SW] Externe non caché:', url, err.message);
                                })
                            );
                        });

                        return Promise.all(promises);
                    });
            })
            .then(function () {
                console.log('[SW] Tous les fichiers en cache ✓');
                // Force activation immédiate
                return self.skipWaiting();
            })
            .catch(function (err) {
                console.error('[SW] Erreur installation:', err);
            })
    );
});


/* ─────────────────────────────────
   ACTIVATE — Clean old caches
   ───────────────────────────────── */
self.addEventListener('activate', function (event) {
    console.log('[SW] Activate — Nettoyage ancien cache');

    event.waitUntil(
        caches.keys()
            .then(function (cacheNames) {
                return Promise.all(
                    cacheNames
                        .filter(function (name) { return name !== CACHE_NAME; })
                        .map(function (name) {
                            console.log('[SW] Suppression ancien cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(function () {
                console.log('[SW] Activation terminée ✓');
                // Prend le contrôle de toutes les pages immédiatement
                return self.clients.claim();
            })
    );
});


/* ─────────────────────────────────
   FETCH — Cache-first, network fallback
   ───────────────────────────────── */
self.addEventListener('fetch', function (event) {
    var request = event.request;

    // Ignore non-GET requests
    if (request.method !== 'GET') return;

    // Ignore chrome-extension, etc.
    if (!request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(request)
            .then(function (cachedResponse) {
                if (cachedResponse) {
                    // Found in cache → return cached + update in background
                    updateCacheInBackground(request);
                    return cachedResponse;
                }

                // Not in cache → fetch from network
                return fetch(request)
                    .then(function (networkResponse) {
                        // Cache the new response
                        if (networkResponse && networkResponse.status === 200) {
                            var responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(function (cache) {
                                cache.put(request, responseClone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(function () {
                        // Network failed → return offline page for HTML requests
                        if (request.headers.get('Accept') &&
                            request.headers.get('Accept').indexOf('text/html') !== -1) {
                            return caches.match('./index.html');
                        }

                        // For course files, return a placeholder
                        if (request.url.indexOf('/courses/') !== -1) {
                            return new Response(
                                '<div class="info-box warning">' +
                                '<span class="material-symbols-outlined">cloud_off</span>' +
                                '<div><strong>Hors ligne</strong><br>' +
                                'Ce cours n\'a pas été mis en cache. ' +
                                'Connectez-vous à Internet pour le télécharger.</div></div>',
                                {
                                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                                }
                            );
                        }
                    });
            })
    );
});


/* ─────────────────────────────────
   Stale-While-Revalidate helper
   ───────────────────────────────── */
function updateCacheInBackground(request) {
    // Don't update external fonts too often
    if (request.url.indexOf('fonts.googleapis.com') !== -1) return;
    if (request.url.indexOf('fonts.gstatic.com') !== -1) return;

    fetch(request)
        .then(function (networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(request, networkResponse);
                });
            }
        })
        .catch(function () {
            // Silently fail — we already have cached version
        });
}


/* ─────────────────────────────────
   MESSAGE — Handle messages from app
   ───────────────────────────────── */
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    // Force re-cache all (manual update)
    if (event.data && event.data.type === 'UPDATE_CACHE') {
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(ALL_FILES);
        }).then(function () {
            // Notify all clients
            self.clients.matchAll().then(function (clients) {
                clients.forEach(function (client) {
                    client.postMessage({ type: 'CACHE_UPDATED' });
                });
            });
        });
    }

    // Cache a specific new course file
    if (event.data && event.data.type === 'CACHE_FILE') {
        caches.open(CACHE_NAME).then(function (cache) {
            cache.add(event.data.url).catch(function (err) {
                console.warn('[SW] Impossible de cacher:', event.data.url, err);
            });
        });
    }
});