/* ══════════════════════════════════════════════════════════════
   APP.JS — CodeLearn Application
   Single file, no modules, clipboard fix, editor, notes
   ══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─────────────────────────────────
       UTILITY: Copy to clipboard
       Works on file://, http://, https://
       ───────────────────────────────── */
    function copyToClipboard(text) {
        return new Promise(function (resolve, reject) {
            // Method 1: Clipboard API (requires https or localhost)
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(resolve).catch(function () {
                    fallbackCopy(text, resolve, reject);
                });
            } else {
                fallbackCopy(text, resolve, reject);
            }
        });
    }

    function fallbackCopy(text, resolve, reject) {
        try {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
            document.body.appendChild(textarea);

            // iOS specific
            var range = document.createRange();
            range.selectNodeContents(textarea);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            textarea.setSelectionRange(0, text.length);

            var success = document.execCommand('copy');
            document.body.removeChild(textarea);

            if (success) {
                resolve();
            } else {
                reject(new Error('execCommand copy failed'));
            }
        } catch (err) {
            reject(err);
        }
    }

    /* ─────────────────────────────────
       1. PROGRESS MANAGER
       ───────────────────────────────── */
    class ProgressManager {
        constructor() {
            this.storageKey = 'codelearn-progress';
            this.historyKey = 'codelearn-history';
            this.bookmarksKey = 'codelearn-bookmarks';
            this.notesKey = 'codelearn-notes';
            this.data = this._load(this.storageKey, {});
            this.history = this._load(this.historyKey, []);
            this.bookmarks = this._load(this.bookmarksKey, []);
            this.notes = this._load(this.notesKey, {});
        }

        _load(key, fallback) {
            try {
                var raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) {
                return fallback;
            }
        }

        _save(key, data) {
            try { localStorage.setItem(key, JSON.stringify(data)); }
            catch (e) { console.warn('localStorage save failed:', e); }
        }

        isCompleted(catId, lessonId) {
            return this.data[catId + '/' + lessonId] === true;
        }

        toggleComplete(catId, lessonId) {
            var key = catId + '/' + lessonId;
            this.data[key] = !this.data[key];
            if (!this.data[key]) delete this.data[key];
            this._save(this.storageKey, this.data);
            return !!this.data[key];
        }

        getCompletedCount() {
            var count = 0;
            for (var k in this.data) { if (this.data[k] === true) count++; }
            return count;
        }

        getCategoryProgress(catId, total) {
            if (total <= 0) return 0;
            var done = 0;
            for (var k in this.data) {
                if (k.indexOf(catId + '/') === 0 && this.data[k]) done++;
            }
            return Math.round((done / total) * 100);
        }

        getGlobalProgress(total) {
            if (total <= 0) return 0;
            return Math.round((this.getCompletedCount() / total) * 100);
        }

        addToHistory(catId, lessonId, title, catName) {
            this.history = this.history.filter(function (h) {
                return !(h.catId === catId && h.lessonId === lessonId);
            });
            this.history.unshift({ catId: catId, lessonId: lessonId, title: title, catName: catName, ts: Date.now() });
            if (this.history.length > 20) this.history.length = 20;
            this._save(this.historyKey, this.history);
        }

        getRecent(n) { return this.history.slice(0, n || 5); }

        isBookmarked(catId, lessonId) {
            return this.bookmarks.some(function (b) { return b.catId === catId && b.lessonId === lessonId; });
        }

        toggleBookmark(catId, lessonId, title, catName) {
            var idx = -1;
            for (var i = 0; i < this.bookmarks.length; i++) {
                if (this.bookmarks[i].catId === catId && this.bookmarks[i].lessonId === lessonId) { idx = i; break; }
            }
            if (idx >= 0) { this.bookmarks.splice(idx, 1); }
            else { this.bookmarks.push({ catId: catId, lessonId: lessonId, title: title, catName: catName }); }
            this._save(this.bookmarksKey, this.bookmarks);
            return idx < 0;
        }

        // Notes
        getNote(catId, lessonId) {
            return this.notes[catId + '/' + lessonId] || '';
        }

        saveNote(catId, lessonId, text) {
            var key = catId + '/' + lessonId;
            if (text.trim()) {
                this.notes[key] = text;
            } else {
                delete this.notes[key];
            }
            this._save(this.notesKey, this.notes);
        }

        hasNote(catId, lessonId) {
            var n = this.notes[catId + '/' + lessonId];
            return n && n.trim().length > 0;
        }
    }

    /* ─────────────────────────────────
       2. THEME MANAGER
       ───────────────────────────────── */
    class ThemeManager {
        constructor() {
            this.toggle = document.getElementById('themeToggle');
            this.icon = document.getElementById('themeIcon');
            this.label = document.getElementById('themeLabel');
            this._init();
        }

        _init() {
            var saved = localStorage.getItem('codelearn-theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.set(saved || (prefersDark ? 'dark' : 'light'), false);

            var self = this;
            if (this.toggle) {
                this.toggle.addEventListener('click', function () {
                    var cur = document.documentElement.getAttribute('data-theme');
                    self.set(cur === 'dark' ? 'light' : 'dark', true);
                });
            }

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
                if (!localStorage.getItem('codelearn-theme')) {
                    self.set(e.matches ? 'dark' : 'light', false);
                }
            });
        }

        set(theme, save) {
            document.documentElement.setAttribute('data-theme', theme);
            if (this.icon) this.icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
            if (this.label) this.label.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
            if (save) localStorage.setItem('codelearn-theme', theme);
        }
    }

    /* ─────────────────────────────────
       3. SIDEBAR MANAGER
       ───────────────────────────────── */
    class SidebarManager {
        constructor() {
            this.el = document.getElementById('sidebar');
            this.overlay = document.getElementById('sidebarOverlay');
            this.nav = document.getElementById('sidebarNav');
            this.hamburger = document.getElementById('hamburger');
            this.closeBtn = document.getElementById('sidebarClose');

            var self = this;
            if (this.hamburger) this.hamburger.addEventListener('click', function () { self.open(); });
            if (this.closeBtn) this.closeBtn.addEventListener('click', function () { self.close(); });
            if (this.overlay) this.overlay.addEventListener('click', function () { self.close(); });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && self.el && self.el.classList.contains('open')) self.close();
            });
        }

        open() {
            this.el.classList.add('open');
            this.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        close() {
            this.el.classList.remove('open');
            this.overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        render(categories, progress, onLessonClick) {
            this.nav.innerHTML = '';
            var self = this;

            categories.forEach(function (cat) {
                var group = document.createElement('div');
                group.className = 'nav-category';
                group.setAttribute('data-category', cat.id);

                var btn = document.createElement('button');
                btn.className = 'nav-category-btn';
                btn.type = 'button';
                btn.innerHTML =
                    '<span class="material-symbols-outlined cat-icon">' + cat.icon + '</span>' +
                    '<span class="cat-name">' + cat.name + '</span>' +
                    '<span class="cat-count">' + cat.lessons.length + '</span>' +
                    '<span class="material-symbols-outlined cat-chevron">chevron_right</span>';
                btn.addEventListener('click', function () { group.classList.toggle('open'); });

                var list = document.createElement('div');
                list.className = 'nav-lessons';

                cat.lessons.forEach(function (lesson) {
                    var item = document.createElement('div');
                    item.className = 'nav-lesson';
                    item.setAttribute('data-id', cat.id + '/' + lesson.id);
                    if (progress.isCompleted(cat.id, lesson.id)) item.classList.add('completed');

                    item.innerHTML =
                        '<span class="lesson-title">' + lesson.title + '</span>' +
                        '<span class="material-symbols-outlined lesson-check">check_circle</span>';

                    item.addEventListener('click', function () {
                        onLessonClick(cat.id, lesson.id);
                        if (window.innerWidth <= 1024) self.close();
                    });
                    list.appendChild(item);
                });

                group.appendChild(btn);
                group.appendChild(list);
                self.nav.appendChild(group);
            });
        }

        setActive(catId, lessonId) {
            var all = this.nav.querySelectorAll('.nav-lesson');
            for (var i = 0; i < all.length; i++) all[i].classList.remove('active');

            if (!catId || !lessonId) return;
            var target = this.nav.querySelector('[data-id="' + catId + '/' + lessonId + '"]');
            if (target) {
                target.classList.add('active');
                var parent = target.closest('.nav-category');
                if (parent) parent.classList.add('open');
                target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }

        markCompleted(catId, lessonId) {
            var target = this.nav.querySelector('[data-id="' + catId + '/' + lessonId + '"]');
            if (target) target.classList.add('completed');
        }
    }

    /* ─────────────────────────────────
       4. SEARCH MANAGER
       ───────────────────────────────── */
    class SearchManager {
        constructor(categories, onSelect) {
            this.onSelect = onSelect;
            this.modal = document.getElementById('searchModal');
            this.modalInput = document.getElementById('searchModalInput');
            this.modalResults = document.getElementById('searchModalResults');
            this.sidebarInput = document.getElementById('searchInput');
            this.focusedIdx = -1;
            this.index = [];

            var self = this;
            categories.forEach(function (cat) {
                cat.lessons.forEach(function (lesson) {
                    self.index.push({
                        catId: cat.id, catName: cat.name, catIcon: cat.icon,
                        lessonId: lesson.id, title: lesson.title,
                        text: (cat.name + ' ' + lesson.title + ' ' + (lesson.description || '')).toLowerCase()
                    });
                });
            });
            this._bind();
        }

        _bind() {
            var self = this;

            document.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); self.openModal(); }
                if (e.key === 'Escape' && self.modal.classList.contains('active')) self.closeModal();
            });

            if (this.sidebarInput) {
                this.sidebarInput.addEventListener('focus', function () { self.sidebarInput.blur(); self.openModal(); });
            }

            if (this.modalInput) {
                this.modalInput.addEventListener('input', function () { self.search(self.modalInput.value); });
                this.modalInput.addEventListener('keydown', function (e) {
                    var items = self.modalResults.querySelectorAll('.search-result-item');
                    if (e.key === 'ArrowDown') { e.preventDefault(); self.focusedIdx = Math.min(self.focusedIdx + 1, items.length - 1); self._updateFocus(items); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); self.focusedIdx = Math.max(self.focusedIdx - 1, 0); self._updateFocus(items); }
                    else if (e.key === 'Enter' && self.focusedIdx >= 0 && items[self.focusedIdx]) { items[self.focusedIdx].click(); }
                });
            }

            if (this.modal) {
                this.modal.addEventListener('click', function (e) { if (e.target === self.modal) self.closeModal(); });
            }
        }

        _updateFocus(items) {
            for (var i = 0; i < items.length; i++) items[i].classList.toggle('focused', i === this.focusedIdx);
            if (items[this.focusedIdx]) items[this.focusedIdx].scrollIntoView({ block: 'nearest' });
        }

        openModal() {
            this.modal.classList.add('active');
            this.modalInput.value = '';
            this.focusedIdx = -1;
            this.search('');
            var self = this;
            setTimeout(function () { self.modalInput.focus(); }, 100);
        }

        closeModal() { this.modal.classList.remove('active'); }

        search(query) {
            var q = query.toLowerCase().trim();
            this.focusedIdx = -1;
            var self = this;

            if (!q) {
                this.modalResults.innerHTML =
                    '<div class="search-no-results"><span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">search</span>Tapez pour rechercher...</div>';
                return;
            }

            var results = this.index.filter(function (l) { return l.text.indexOf(q) !== -1; });
            if (results.length === 0) {
                this.modalResults.innerHTML =
                    '<div class="search-no-results"><span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">search_off</span>Aucun résultat pour « ' + query + ' »</div>';
                return;
            }

            var html = '';
            for (var i = 0; i < Math.min(results.length, 20); i++) {
                var r = results[i];
                html += '<div class="search-result-item" data-cat="' + r.catId + '" data-lesson="' + r.lessonId + '">' +
                    '<span class="material-symbols-outlined">' + r.catIcon + '</span><div>' +
                    '<div class="search-result-cat">' + r.catName + '</div>' +
                    '<div class="search-result-title">' + r.title + '</div></div></div>';
            }
            this.modalResults.innerHTML = html;

            var items = this.modalResults.querySelectorAll('.search-result-item');
            for (var j = 0; j < items.length; j++) {
                items[j].addEventListener('click', function () {
                    self.closeModal();
                    self.onSelect(this.getAttribute('data-cat'), this.getAttribute('data-lesson'));
                });
            }
        }
    }

    /* ─────────────────────────────────
       5. LIVE EDITOR
       ───────────────────────────────── */
    class LiveEditor {
        constructor(container, initialCode) {
            this.container = container;
            this.code = Object.assign({ html: '', css: '', js: '' }, initialCode || {});
            this.activeTab = 'html';
            this.render();
            this.bind();
        }

        render() {
            this.container.innerHTML =
                '<div class="live-editor">' +
                  '<div class="editor-toolbar">' +
                    '<div class="editor-tabs">' +
                      '<button class="editor-tab active" data-tab="html" type="button"><span class="tab-dot"></span><span>HTML</span></button>' +
                      '<button class="editor-tab" data-tab="css" type="button"><span class="tab-dot"></span><span>CSS</span></button>' +
                      '<button class="editor-tab" data-tab="js" type="button"><span class="tab-dot"></span><span>JS</span></button>' +
                    '</div>' +
                    '<div class="editor-actions">' +
                      '<button class="editor-action-btn editor-reset-btn" type="button" title="Réinitialiser">' +
                        '<span class="material-symbols-outlined">restart_alt</span><span>Reset</span>' +
                      '</button>' +
                      '<button class="editor-action-btn editor-run-btn" type="button" title="Exécuter">' +
                        '<span class="material-symbols-outlined">play_arrow</span><span>Exécuter</span>' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                  '<div class="editor-body">' +
                    '<div class="editor-pane active" data-pane="html">' +
                      '<textarea class="editor-textarea" data-lang="html" placeholder="<!-- Écrivez votre HTML ici -->" spellcheck="false">' + this.escapeHtml(this.code.html) + '</textarea>' +
                    '</div>' +
                    '<div class="editor-pane" data-pane="css">' +
                      '<textarea class="editor-textarea" data-lang="css" placeholder="/* Écrivez votre CSS ici */" spellcheck="false">' + this.escapeHtml(this.code.css) + '</textarea>' +
                    '</div>' +
                    '<div class="editor-pane" data-pane="js">' +
                      '<textarea class="editor-textarea" data-lang="js" placeholder="// Écrivez votre JavaScript ici" spellcheck="false">' + this.escapeHtml(this.code.js) + '</textarea>' +
                    '</div>' +
                  '</div>' +
                  '<div class="editor-preview-wrapper">' +
                    '<div class="editor-preview-header">' +
                      '<span class="material-symbols-outlined">visibility</span> Aperçu' +
                    '</div>' +
                    '<iframe class="editor-preview" sandbox="allow-scripts allow-modals"></iframe>' +
                  '</div>' +
                '</div>';
        }

        escapeHtml(str) {
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        bind() {
            var self = this;
            var editor = this.container.querySelector('.live-editor');

            // Tab switching
            var tabs = editor.querySelectorAll('.editor-tab');
            var panes = editor.querySelectorAll('.editor-pane');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].addEventListener('click', function () {
                    var tab = this.getAttribute('data-tab');
                    for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j] === this);
                    for (var k = 0; k < panes.length; k++) panes[k].classList.toggle('active', panes[k].getAttribute('data-pane') === tab);
                    self.activeTab = tab;
                });
            }

            // Tab key support in textarea
            var textareas = editor.querySelectorAll('.editor-textarea');
            for (var t = 0; t < textareas.length; t++) {
                textareas[t].addEventListener('keydown', function (e) {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        var start = this.selectionStart;
                        var end = this.selectionEnd;
                        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
                        this.selectionStart = this.selectionEnd = start + 2;
                    }
                });
            }

            // Run button
            var runBtn = editor.querySelector('.editor-run-btn');
            if (runBtn) runBtn.addEventListener('click', function () { self.run(); });

            // Reset button
            var resetBtn = editor.querySelector('.editor-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', function () {
                    var areas = editor.querySelectorAll('.editor-textarea');
                    for (var a = 0; a < areas.length; a++) {
                        var lang = areas[a].getAttribute('data-lang');
                        areas[a].value = self.code[lang] || '';
                    }
                    self.run();
                });
            }

            // Auto-run on first render
            setTimeout(function () { self.run(); }, 200);
        }

        run() {
            var editor = this.container.querySelector('.live-editor');
            var iframe = editor.querySelector('.editor-preview');
            var htmlArea = editor.querySelector('[data-lang="html"]');
            var cssArea = editor.querySelector('[data-lang="css"]');
            var jsArea = editor.querySelector('[data-lang="js"]');

            var htmlCode = htmlArea ? htmlArea.value : '';
            var cssCode = cssArea ? cssArea.value : '';
            var jsCode = jsArea ? jsArea.value : '';

            var doc =
                '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
                '<style>body{font-family:Inter,-apple-system,sans-serif;padding:16px;margin:0;color:#333;line-height:1.6;}' +
                cssCode + '</style></head><body>' +
                htmlCode +
                '<script>' +
                'try{' + jsCode + '}catch(e){document.body.innerHTML+="<pre style=\\"color:red;padding:8px;background:#fee;border-radius:6px;font-size:13px;\\">Erreur: "+e.message+"</pre>";}' +
                '<\/script></body></html>';

            // Use srcdoc for security & simplicity
            iframe.srcdoc = doc;
        }
    }

    /* ─────────────────────────────────
       6. ROUTER
       ───────────────────────────────── */
    class Router {
        constructor() {
            this.callback = null;
            var self = this;
            window.addEventListener('hashchange', function () { self.resolve(); });
        }

        onNavigate(cb) { this.callback = cb; }

        resolve() {
            var hash = window.location.hash.replace('#', '') || '/';
            if (this.callback) this.callback(hash);
        }

        navigate(path) { window.location.hash = '#' + path; }

        parseRoute(hash) {
            var parts = hash.replace(/^\//, '').split('/');
            if (parts.length >= 2 && parts[0] && parts[1]) {
                return { catId: parts[0], lessonId: parts[1] };
            }
            return null;
        }
    }

    /* ─────────────────────────────────
       7. MAIN APP
       ───────────────────────────────── */
    class CodeLearnApp {
        constructor() {
            this.categories = [];
            this.totalLessons = 0;
            this.currentCatId = null;
            this.currentLessonId = null;
            this.fontSize = parseInt(localStorage.getItem('codelearn-fontsize'), 10) || 16;
            this.tocObserver = null;
        }

        async start() {
            await this.loadData();

            this.progress = new ProgressManager();
            this.theme = new ThemeManager();
            this.sidebar = new SidebarManager();
            this.router = new Router();

            var self = this;
            this.sidebar.render(this.categories, this.progress, function (catId, lessonId) {
                self.router.navigate('/' + catId + '/' + lessonId);
            });

            this.search = new SearchManager(this.categories, function (catId, lessonId) {
                self.router.navigate('/' + catId + '/' + lessonId);
            });

            this.router.onNavigate(function (hash) {
                var parsed = self.router.parseRoute(hash);
                if (parsed) self.showLesson(parsed.catId, parsed.lessonId);
                else self.showHome();
            });

            this.bindUI();
            this.applyFontSize();
            this.updateGlobalProgress();
            this.router.resolve();
        }

        async loadData() {
            try {
                var res = await fetch('js/data.json');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                var data = await res.json();
                this.categories = data.categories || [];
                var count = 0;
                this.categories.forEach(function (c) { count += c.lessons.length; });
                this.totalLessons = count;
            } catch (err) {
                console.error('Erreur chargement data.json:', err);
                console.warn('💡 Lancez un serveur local : npx serve / python3 -m http.server / Live Server');
                this.categories = [];
                this.totalLessons = 0;
            }
        }

        bindUI() {
            var self = this;

            // Scroll to top
            var scrollTopBtn = document.getElementById('scrollTop');
            window.addEventListener('scroll', function () {
                if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
                self.updateReadingProgress();
            });
            if (scrollTopBtn) scrollTopBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

            // Font size panel
            var fontPanel = document.getElementById('fontPanel');
            var fontSizeBtn = document.getElementById('fontSizeBtn');
            if (fontSizeBtn) fontSizeBtn.addEventListener('click', function (e) { e.stopPropagation(); fontPanel.classList.toggle('active'); });
            var fontInc = document.getElementById('fontIncrease');
            var fontDec = document.getElementById('fontDecrease');
            if (fontInc) fontInc.addEventListener('click', function () { self.fontSize = Math.min(self.fontSize + 1, 24); self.applyFontSize(); });
            if (fontDec) fontDec.addEventListener('click', function () { self.fontSize = Math.max(self.fontSize - 1, 12); self.applyFontSize(); });

            document.addEventListener('click', function (e) {
                if (fontPanel && !e.target.closest('#fontPanel') && !e.target.closest('#fontSizeBtn')) fontPanel.classList.remove('active');
            });

            // Print
            var printBtn = document.getElementById('printBtn');
            if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

            // Bookmark
            var bookmarkBtn = document.getElementById('bookmarkBtn');
            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', function () {
                    if (!self.currentCatId || !self.currentLessonId) return;
                    var cat = self.findCategory(self.currentCatId);
                    var lesson = self.findLesson(self.currentCatId, self.currentLessonId);
                    if (cat && lesson) {
                        var isNow = self.progress.toggleBookmark(self.currentCatId, self.currentLessonId, lesson.title, cat.name);
                        bookmarkBtn.classList.toggle('bookmarked', isNow);
                    }
                });
            }
        }

        applyFontSize() {
            document.documentElement.style.setProperty('--font-size-base', this.fontSize + 'px');
            var d = document.getElementById('fontSizeValue');
            if (d) d.textContent = this.fontSize + 'px';
            localStorage.setItem('codelearn-fontsize', this.fontSize);
        }

        updateGlobalProgress() {
            var percent = this.progress.getGlobalProgress(this.totalLessons);
            var fill = document.getElementById('globalProgress');
            var text = document.getElementById('globalProgressText');
            if (fill) fill.style.width = percent + '%';
            if (text) text.textContent = percent + '%';
        }

        updateReadingProgress() {
            var bar = document.getElementById('readingProgressBar');
            var fill = document.getElementById('readingProgressFill');
            if (!bar || !fill || !this.currentCatId) { if (bar) bar.style.display = 'none'; return; }

            bar.style.display = '';
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var percent = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
            fill.style.width = percent + '%';
        }

        findCategory(catId) {
            for (var i = 0; i < this.categories.length; i++) {
                if (this.categories[i].id === catId) return this.categories[i];
            }
            return null;
        }

        findLesson(catId, lessonId) {
            var cat = this.findCategory(catId);
            if (!cat) return null;
            for (var i = 0; i < cat.lessons.length; i++) {
                if (cat.lessons[i].id === lessonId) return cat.lessons[i];
            }
            return null;
        }

        findLessonIndex(cat, lessonId) {
            for (var i = 0; i < cat.lessons.length; i++) {
                if (cat.lessons[i].id === lessonId) return i;
            }
            return -1;
        }

        /* ═══════════ HOME ═══════════ */

        showHome() {
            this.currentCatId = null;
            this.currentLessonId = null;

            document.getElementById('homePage').style.display = '';
            document.getElementById('coursePage').style.display = 'none';
            document.getElementById('toc').style.display = 'none';
            var rpb = document.getElementById('readingProgressBar');
            if (rpb) rpb.style.display = 'none';

            this.sidebar.setActive('', '');
            this.setBreadcrumb([{ icon: 'home', label: 'Accueil' }]);

            var bb = document.getElementById('bookmarkBtn');
            if (bb) bb.classList.remove('bookmarked');

            var e1 = document.getElementById('totalCourses');
            var e2 = document.getElementById('totalCategories');
            var e3 = document.getElementById('completedLessons');
            if (e1) e1.textContent = this.totalLessons;
            if (e2) e2.textContent = this.categories.length;
            if (e3) e3.textContent = this.progress.getCompletedCount();

            this.renderCategoriesGrid();
            this.renderRecent();
            window.scrollTo({ top: 0 });
        }

        renderCategoriesGrid() {
            var grid = document.getElementById('categoriesGrid');
            if (!grid) return;
            var self = this;
            var html = '';

            this.categories.forEach(function (cat) {
                var prog = self.progress.getCategoryProgress(cat.id, cat.lessons.length);
                html +=
                    '<div class="category-card" data-category="' + cat.id + '"' +
                    ' style="--card-accent:oklch(0.60 0.20 ' + cat.color + ');--card-bg:oklch(0.60 0.20 ' + cat.color + '/0.08);">' +
                    '<div class="category-card-icon"><span class="material-symbols-outlined">' + cat.icon + '</span></div>' +
                    '<h3>' + cat.name + '</h3><p>' + cat.description + '</p>' +
                    '<div class="category-card-meta">' +
                    '<span class="category-card-lessons"><span class="material-symbols-outlined">menu_book</span>' +
                    cat.lessons.length + ' leçons · ' + cat.level + '</span>' +
                    '<div class="category-card-progress"><div class="category-card-progress-fill" style="width:' + prog + '%"></div></div>' +
                    '</div></div>';
            });
            grid.innerHTML = html;

            var cards = grid.querySelectorAll('.category-card');
            for (var i = 0; i < cards.length; i++) {
                cards[i].addEventListener('click', function () {
                    var catId = this.getAttribute('data-category');
                    var cat = self.findCategory(catId);
                    if (cat && cat.lessons.length > 0) self.router.navigate('/' + catId + '/' + cat.lessons[0].id);
                });
            }
        }

        renderRecent() {
            var section = document.getElementById('recentSection');
            var list = document.getElementById('recentList');
            var recent = this.progress.getRecent(5);
            var self = this;
            if (!section || !list) return;

            if (recent.length === 0) { section.style.display = 'none'; return; }
            section.style.display = '';

            var html = '';
            recent.forEach(function (r) {
                html +=
                    '<div class="recent-item" data-cat="' + r.catId + '" data-lesson="' + r.lessonId + '">' +
                    '<span class="material-symbols-outlined">history</span>' +
                    '<div class="recent-item-info"><div class="recent-item-title">' + r.title + '</div>' +
                    '<div class="recent-item-cat">' + r.catName + '</div></div>' +
                    '<span class="material-symbols-outlined recent-item-arrow">arrow_forward</span></div>';
            });
            list.innerHTML = html;

            var items = list.querySelectorAll('.recent-item');
            for (var i = 0; i < items.length; i++) {
                items[i].addEventListener('click', function () {
                    self.router.navigate('/' + this.getAttribute('data-cat') + '/' + this.getAttribute('data-lesson'));
                });
            }
        }

        /* ═══════════ LESSON ═══════════ */

        async showLesson(catId, lessonId) {
            var cat = this.findCategory(catId);
            if (!cat) { this.showHome(); return; }
            var lessonIdx = this.findLessonIndex(cat, lessonId);
            if (lessonIdx < 0) { this.showHome(); return; }

            var lesson = cat.lessons[lessonIdx];
            this.currentCatId = catId;
            this.currentLessonId = lessonId;

            document.getElementById('homePage').style.display = 'none';
            document.getElementById('coursePage').style.display = '';

            this.sidebar.setActive(catId, lessonId);
            this.setBreadcrumb([
                { icon: 'home', label: 'Accueil', link: '#/' },
                { label: cat.name },
                { label: lesson.title, current: true }
            ]);

            var bb = document.getElementById('bookmarkBtn');
            if (bb) bb.classList.toggle('bookmarked', this.progress.isBookmarked(catId, lessonId));

            await this.loadLessonContent(cat, lesson, lessonIdx);
            this.progress.addToHistory(catId, lessonId, lesson.title, cat.name);
            this.buildTOC();
            window.scrollTo({ top: 0 });
        }

        async loadLessonContent(cat, lesson, lessonIdx) {
            var self = this;
            var header = document.getElementById('courseHeader');
            var body = document.getElementById('courseBody');
            var footer = document.getElementById('courseFooter');

            // Header
            header.innerHTML =
                '<span class="course-badge" style="background:oklch(0.60 0.20 ' + cat.color + '/0.1);color:oklch(0.50 0.18 ' + cat.color + ');">' +
                '<span class="material-symbols-outlined" style="font-size:16px;">' + cat.icon + '</span> ' + cat.name + '</span>' +
                '<h1>' + lesson.title + '</h1>' +
                '<div class="course-meta">' +
                '<span><span class="material-symbols-outlined">schedule</span> ' + lesson.duration + '</span>' +
                '<span><span class="material-symbols-outlined">signal_cellular_alt</span> ' + cat.level + '</span>' +
                '<span><span class="material-symbols-outlined">format_list_numbered</span> Leçon ' + (lessonIdx + 1) + ' / ' + cat.lessons.length + '</span>' +
                '</div>';

            // Body
            try {
                var res = await fetch(lesson.file);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                body.innerHTML = await res.text();
            } catch (err) {
                console.warn('Cours non trouvé:', lesson.file, err);
                body.innerHTML =
                    '<div class="info-box warning"><span class="material-symbols-outlined">warning</span><div>' +
                    '<strong>Contenu en cours de rédaction</strong>' +
                    '<p>Fichier attendu : <code>' + lesson.file + '</code></p>' +
                    '<p style="margin-top:8px;font-size:0.8rem;color:var(--text-tertiary);">Lancez un serveur local : <code>npx serve</code> ou <code>python3 -m http.server</code></p>' +
                    '</div></div>';
            }

            // Enhance code blocks
            this.enhanceCodeBlocks(body);

            // Initialize live editors
            this.initEditors(body);

            // Notes section
            this.renderNotes(body, cat.id, lesson.id);

            // Footer
            var isComplete = this.progress.isCompleted(cat.id, lesson.id);
            var prev = lessonIdx > 0 ? cat.lessons[lessonIdx - 1] : null;
            var next = lessonIdx < cat.lessons.length - 1 ? cat.lessons[lessonIdx + 1] : null;

            var fHTML =
                '<button class="mark-complete-btn' + (isComplete ? ' completed' : '') + '" id="markCompleteBtn">' +
                '<span class="material-symbols-outlined">' + (isComplete ? 'check_circle' : 'radio_button_unchecked') + '</span> ' +
                (isComplete ? 'Terminé !' : 'Marquer comme terminé') + '</button>' +
                '<div style="display:flex;gap:12px;width:100%;margin-top:16px;flex-wrap:wrap;">';

            if (prev) {
                fHTML += '<button class="course-nav-btn prev" data-lesson="' + prev.id + '">' +
                    '<span class="material-symbols-outlined">arrow_back</span>' +
                    '<div><div class="nav-direction">Précédent</div><div class="nav-title">' + prev.title + '</div></div></button>';
            }
            if (next) {
                fHTML += '<button class="course-nav-btn next" data-lesson="' + next.id + '">' +
                    '<div><div class="nav-direction">Suivant</div><div class="nav-title">' + next.title + '</div></div>' +
                    '<span class="material-symbols-outlined">arrow_forward</span></button>';
            }
            fHTML += '</div>';
            footer.innerHTML = fHTML;

            // Mark complete event
            var markBtn = document.getElementById('markCompleteBtn');
            if (markBtn) {
                markBtn.addEventListener('click', function () {
                    var done = self.progress.toggleComplete(cat.id, lesson.id);
                    this.classList.toggle('completed', done);
                    this.innerHTML = '<span class="material-symbols-outlined">' + (done ? 'check_circle' : 'radio_button_unchecked') + '</span> ' +
                        (done ? 'Terminé !' : 'Marquer comme terminé');
                    if (done) self.sidebar.markCompleted(cat.id, lesson.id);
                    self.updateGlobalProgress();
                });
            }

            // Nav events
            var navBtns = footer.querySelectorAll('.course-nav-btn');
            for (var i = 0; i < navBtns.length; i++) {
                navBtns[i].addEventListener('click', function () {
                    self.router.navigate('/' + cat.id + '/' + this.getAttribute('data-lesson'));
                });
            }
        }

        /* ═══════════ CODE BLOCKS ═══════════ */

        enhanceCodeBlocks(container) {
            var pres = container.querySelectorAll('pre');

            for (var i = 0; i < pres.length; i++) {
                var pre = pres[i];
                if (pre.getAttribute('data-enhanced')) continue;
                pre.setAttribute('data-enhanced', '1');

                // Wrap in .code-block if needed
                if (!pre.closest('.code-block')) {
                    var wrapper = document.createElement('div');
                    wrapper.className = 'code-block';

                    var code = pre.querySelector('code');
                    var langMatch = code ? (code.className || '').match(/language-(\w+)/) : null;
                    var lang = langMatch ? langMatch[1] : 'code';

                    var headerDiv = document.createElement('div');
                    headerDiv.className = 'code-block-header';
                    headerDiv.innerHTML =
                        '<div class="code-block-lang"><span class="code-block-dots"><span></span><span></span><span></span></span> ' + lang + '</div>' +
                        '<button class="code-copy-btn" type="button" aria-label="Copier"><span class="material-symbols-outlined">content_copy</span> Copier</button>';

                    pre.parentNode.insertBefore(wrapper, pre);
                    wrapper.appendChild(headerDiv);
                    wrapper.appendChild(pre);
                }

                // Attach copy handler to all copy buttons in this block
                this.attachCopyHandler(pre);
            }
        }

        attachCopyHandler(pre) {
            var block = pre.closest('.code-block');
            if (!block) return;

            var btns = block.querySelectorAll('.code-copy-btn');
            for (var j = 0; j < btns.length; j++) {
                if (btns[j].getAttribute('data-bound')) continue;
                btns[j].setAttribute('data-bound', '1');

                (function (btn, preEl) {
                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var text = preEl.textContent || preEl.innerText || '';

                        copyToClipboard(text).then(function () {
                            btn.classList.add('copied');
                            btn.innerHTML = '<span class="material-symbols-outlined">check</span> Copié !';
                            setTimeout(function () {
                                btn.classList.remove('copied');
                                btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copier';
                            }, 2000);
                        }).catch(function (err) {
                            console.warn('Copy failed:', err);
                            btn.innerHTML = '<span class="material-symbols-outlined">error</span> Erreur';
                            setTimeout(function () {
                                btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copier';
                            }, 2000);
                        });
                    });
                })(btns[j], pre);
            }
        }

        /* ═══════════ LIVE EDITORS ═══════════ */

        initEditors(container) {
            var editorPlaceholders = container.querySelectorAll('.editor-placeholder');
            for (var i = 0; i < editorPlaceholders.length; i++) {
                var el = editorPlaceholders[i];
                var initialCode = {
                    html: el.getAttribute('data-html') || '',
                    css: el.getAttribute('data-css') || '',
                    js: el.getAttribute('data-js') || ''
                };
                new LiveEditor(el, initialCode);
            }
        }

        /* ═══════════ NOTES ═══════════ */

        renderNotes(container, catId, lessonId) {
            var self = this;
            var existing = container.querySelector('.lesson-notes');
            if (existing) existing.remove();

            var noteText = this.progress.getNote(catId, lessonId);
            var hasNote = noteText && noteText.trim().length > 0;

            var section = document.createElement('div');
            section.className = 'lesson-notes' + (hasNote ? ' open' : '');
            section.innerHTML =
                '<div class="notes-header">' +
                  '<div class="notes-header-left">' +
                    '<span class="material-symbols-outlined">edit_note</span>' +
                    '<span>Mes notes</span>' +
                    (hasNote ? '<span class="notes-badge">Sauvegardé</span>' : '') +
                  '</div>' +
                  '<span class="material-symbols-outlined notes-chevron">expand_more</span>' +
                '</div>' +
                '<div class="notes-body">' +
                  '<textarea class="notes-textarea" placeholder="Écrivez vos notes personnelles pour cette leçon...">' + (noteText || '') + '</textarea>' +
                  '<div class="notes-footer">' +
                    '<span class="notes-saved" id="notesSaved"><span class="material-symbols-outlined">check</span> Sauvegardé</span>' +
                    '<span class="notes-char-count"></span>' +
                  '</div>' +
                '</div>';

            container.appendChild(section);

            // Toggle
            var headerEl = section.querySelector('.notes-header');
            headerEl.addEventListener('click', function () {
                section.classList.toggle('open');
            });

            // Auto-save with debounce
            var textarea = section.querySelector('.notes-textarea');
            var savedEl = section.querySelector('#notesSaved');
            var badge = section.querySelector('.notes-badge');
            var timer = null;

            textarea.addEventListener('input', function () {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    self.progress.saveNote(catId, lessonId, textarea.value);
                    savedEl.classList.add('visible');

                    // Update badge
                    var headerLeft = section.querySelector('.notes-header-left');
                    var existingBadge = headerLeft.querySelector('.notes-badge');
                    if (textarea.value.trim()) {
                        if (!existingBadge) {
                            var b = document.createElement('span');
                            b.className = 'notes-badge';
                            b.textContent = 'Sauvegardé';
                            headerLeft.appendChild(b);
                        }
                    } else {
                        if (existingBadge) existingBadge.remove();
                    }

                    setTimeout(function () { savedEl.classList.remove('visible'); }, 2000);
                }, 500);
            });
        }

        /* ═══════════ TOC ═══════════ */

        buildTOC() {
            var tocEl = document.getElementById('toc');
            var tocNav = document.getElementById('tocNav');
            var body = document.getElementById('courseBody');
            if (!tocEl || !tocNav || !body) return;

            var headings = body.querySelectorAll('h2, h3');
            if (headings.length === 0) { tocEl.style.display = 'none'; return; }

            tocEl.style.display = '';
            tocNav.innerHTML = '';

            for (var i = 0; i < headings.length; i++) {
                var h = headings[i];
                var id = 'heading-' + i;
                h.id = id;

                var link = document.createElement('a');
                link.href = '#' + id;
                link.textContent = h.textContent;
                if (h.tagName === 'H3') link.className = 'depth-3';

                (function (heading) {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                })(h);

                tocNav.appendChild(link);
            }

            this.observeTOC(headings, tocNav);
        }

        observeTOC(headings, tocNav) {
            if (this.tocObserver) this.tocObserver.disconnect();
            if (!('IntersectionObserver' in window)) return;

            this.tocObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var links = tocNav.querySelectorAll('a');
                        for (var i = 0; i < links.length; i++) links[i].classList.remove('active');
                        var a = tocNav.querySelector('a[href="#' + entry.target.id + '"]');
                        if (a) a.classList.add('active');
                    }
                });
            }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

            for (var i = 0; i < headings.length; i++) this.tocObserver.observe(headings[i]);
        }

        /* ═══════════ BREADCRUMB ═══════════ */

        setBreadcrumb(items) {
            var bc = document.getElementById('breadcrumb');
            if (!bc) return;
            var html = '';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (i > 0) html += '<span class="separator">›</span>';
                if (item.icon) html += '<span class="material-symbols-outlined">' + item.icon + '</span>';
                if (item.link) html += '<a href="' + item.link + '">' + item.label + '</a>';
                else if (item.current) html += '<span class="current">' + item.label + '</span>';
                else html += '<span>' + item.label + '</span>';
            }
            bc.innerHTML = html;
        }
    }

    /* ─────────────────────────────────
       8. INIT
       ───────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        var app = new CodeLearnApp();
        app.start();
    });

    /* ─────────────────────────────────
       9. PWA — Service Worker + Install
       ───────────────────────────────── */
    (function initPWA() {

        // ── Register Service Worker ──
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('./sw.js', { scope: './' })
                    .then(function (registration) {
                        console.log('[PWA] Service Worker enregistré ✓', registration.scope);

                        // Check for updates
                        registration.addEventListener('updatefound', function () {
                            var newWorker = registration.installing;
                            if (!newWorker) return;

                            newWorker.addEventListener('statechange', function () {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New version available
                                    showUpdateBanner(registration);
                                }
                            });
                        });
                    })
                    .catch(function (err) {
                        console.warn('[PWA] Erreur SW:', err);
                    });

                // Listen for messages from SW
                navigator.serviceWorker.addEventListener('message', function (event) {
                    if (event.data && event.data.type === 'CACHE_UPDATED') {
                        console.log('[PWA] Cache mis à jour ✓');
                    }
                });
            });
        }

        // ── Install Prompt ──
        var deferredPrompt = null;
        var installBanner = document.getElementById('pwaInstallBanner');
        var installBtn = document.getElementById('pwaInstall');
        var dismissBtn = document.getElementById('pwaDismiss');

        window.addEventListener('beforeinstallprompt', function (e) {
            e.preventDefault();
            deferredPrompt = e;

            // Don't show if already dismissed recently
            var dismissed = localStorage.getItem('codelearn-pwa-dismissed');
            if (dismissed) {
                var dismissedAt = parseInt(dismissed, 10);
                // Show again after 7 days
                if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
            }

            // Show banner after 30 seconds
            setTimeout(function () {
                if (installBanner && deferredPrompt) {
                    installBanner.classList.add('visible');
                }
            }, 30000);
        });

        if (installBtn) {
            installBtn.addEventListener('click', function () {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function (choice) {
                    console.log('[PWA] Install choice:', choice.outcome);
                    deferredPrompt = null;
                    if (installBanner) installBanner.classList.remove('visible');
                });
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', function () {
                if (installBanner) installBanner.classList.remove('visible');
                localStorage.setItem('codelearn-pwa-dismissed', Date.now().toString());
            });
        }

        // Hide banner if already installed
        window.addEventListener('appinstalled', function () {
            console.log('[PWA] Application installée ✓');
            if (installBanner) installBanner.classList.remove('visible');
            deferredPrompt = null;
        });

        // ── Offline Detection ──
        var offlineEl = document.getElementById('offlineIndicator');

        function updateOnlineStatus() {
            if (!offlineEl) return;
            if (navigator.onLine) {
                offlineEl.classList.remove('visible');
            } else {
                offlineEl.classList.add('visible');
            }
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();

        // ── Update Banner ──
        function showUpdateBanner(registration) {
            var banner = document.getElementById('updateBanner');
            var updateBtn = document.getElementById('updateBtn');
            var updateDismiss = document.getElementById('updateDismiss');
            if (!banner) return;

            banner.classList.add('visible');

            if (updateBtn) {
                updateBtn.addEventListener('click', function () {
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    banner.classList.remove('visible');
                    // Reload after new SW takes over
                    navigator.serviceWorker.addEventListener('controllerchange', function () {
                        window.location.reload();
                    });
                });
            }

            if (updateDismiss) {
                updateDismiss.addEventListener('click', function () {
                    banner.classList.remove('visible');
                });
            }
        }

    })();
})();