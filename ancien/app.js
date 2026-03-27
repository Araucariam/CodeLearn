/* ══════════════════════════════════════════════════════════
   APP.JS — CodeLearn Application (Single File, No Modules)
   ══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─────────────────────────────────
       1. PROGRESS MANAGER
       ───────────────────────────────── */
    class ProgressManager {
        constructor() {
            this.storageKey = 'codelearn-progress';
            this.historyKey = 'codelearn-history';
            this.bookmarksKey = 'codelearn-bookmarks';
            this.data = this._load(this.storageKey, {});
            this.history = this._load(this.historyKey, []);
            this.bookmarks = this._load(this.bookmarksKey, []);
        }

        _load(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        }

        _save(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (e) {
                console.warn('localStorage save failed:', e);
            }
        }

        isCompleted(catId, lessonId) {
            return this.data[catId + '/' + lessonId] === true;
        }

        toggleComplete(catId, lessonId) {
            const key = catId + '/' + lessonId;
            this.data[key] = !this.data[key];
            if (!this.data[key]) delete this.data[key];
            this._save(this.storageKey, this.data);
            return !!this.data[key];
        }

        getCompletedCount() {
            return Object.values(this.data).filter(function (v) { return v === true; }).length;
        }

        getCategoryProgress(catId, total) {
            if (total <= 0) return 0;
            var done = 0;
            for (var k in this.data) {
                if (k.startsWith(catId + '/') && this.data[k]) done++;
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
            this.history.unshift({
                catId: catId,
                lessonId: lessonId,
                title: title,
                catName: catName,
                ts: Date.now()
            });
            if (this.history.length > 20) this.history.length = 20;
            this._save(this.historyKey, this.history);
        }

        getRecent(count) {
            return this.history.slice(0, count || 5);
        }

        isBookmarked(catId, lessonId) {
            return this.bookmarks.some(function (b) {
                return b.catId === catId && b.lessonId === lessonId;
            });
        }

        toggleBookmark(catId, lessonId, title, catName) {
            var idx = -1;
            for (var i = 0; i < this.bookmarks.length; i++) {
                if (this.bookmarks[i].catId === catId && this.bookmarks[i].lessonId === lessonId) {
                    idx = i; break;
                }
            }
            if (idx >= 0) {
                this.bookmarks.splice(idx, 1);
            } else {
                this.bookmarks.push({ catId: catId, lessonId: lessonId, title: title, catName: catName });
            }
            this._save(this.bookmarksKey, this.bookmarks);
            return idx < 0;
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
                if (e.key === 'Escape' && self.el.classList.contains('open')) self.close();
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

                // Category button
                var btn = document.createElement('button');
                btn.className = 'nav-category-btn';
                btn.type = 'button';
                btn.innerHTML =
                    '<span class="material-symbols-outlined cat-icon">' + cat.icon + '</span>' +
                    '<span class="cat-name">' + cat.name + '</span>' +
                    '<span class="cat-count">' + cat.lessons.length + '</span>' +
                    '<span class="material-symbols-outlined cat-chevron">chevron_right</span>';

                btn.addEventListener('click', function () {
                    group.classList.toggle('open');
                });

                // Lessons list
                var list = document.createElement('div');
                list.className = 'nav-lessons';

                cat.lessons.forEach(function (lesson) {
                    var item = document.createElement('div');
                    item.className = 'nav-lesson';
                    item.setAttribute('data-id', cat.id + '/' + lesson.id);

                    if (progress.isCompleted(cat.id, lesson.id)) {
                        item.classList.add('completed');
                    }

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
            for (var i = 0; i < all.length; i++) {
                all[i].classList.remove('active');
            }

            var key = catId + '/' + lessonId;
            var target = this.nav.querySelector('[data-id="' + key + '"]');
            if (target) {
                target.classList.add('active');
                var parent = target.closest('.nav-category');
                if (parent) parent.classList.add('open');
                target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }

        markCompleted(catId, lessonId) {
            var key = catId + '/' + lessonId;
            var target = this.nav.querySelector('[data-id="' + key + '"]');
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

            // Build index
            this.index = [];
            var self = this;
            categories.forEach(function (cat) {
                cat.lessons.forEach(function (lesson) {
                    self.index.push({
                        catId: cat.id,
                        catName: cat.name,
                        catIcon: cat.icon,
                        lessonId: lesson.id,
                        title: lesson.title,
                        desc: lesson.description || '',
                        text: (cat.name + ' ' + lesson.title + ' ' + (lesson.description || '')).toLowerCase()
                    });
                });
            });

            this._bind();
        }

        _bind() {
            var self = this;

            // Ctrl+K
            document.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    self.openModal();
                }
                if (e.key === 'Escape' && self.modal.classList.contains('active')) {
                    self.closeModal();
                }
            });

            // Sidebar input click → open modal
            if (this.sidebarInput) {
                this.sidebarInput.addEventListener('focus', function () {
                    self.sidebarInput.blur();
                    self.openModal();
                });
            }

            // Modal input
            if (this.modalInput) {
                this.modalInput.addEventListener('input', function () {
                    self.search(self.modalInput.value);
                });
                this.modalInput.addEventListener('keydown', function (e) {
                    var items = self.modalResults.querySelectorAll('.search-result-item');
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        self.focusedIdx = Math.min(self.focusedIdx + 1, items.length - 1);
                        self._updateFocus(items);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        self.focusedIdx = Math.max(self.focusedIdx - 1, 0);
                        self._updateFocus(items);
                    } else if (e.key === 'Enter' && self.focusedIdx >= 0 && items[self.focusedIdx]) {
                        items[self.focusedIdx].click();
                    }
                });
            }

            // Backdrop click
            if (this.modal) {
                this.modal.addEventListener('click', function (e) {
                    if (e.target === self.modal) self.closeModal();
                });
            }
        }

        _updateFocus(items) {
            for (var i = 0; i < items.length; i++) {
                items[i].classList.toggle('focused', i === this.focusedIdx);
            }
            if (items[this.focusedIdx]) {
                items[this.focusedIdx].scrollIntoView({ block: 'nearest' });
            }
        }

        openModal() {
            this.modal.classList.add('active');
            this.modalInput.value = '';
            this.focusedIdx = -1;
            this.search('');
            var self = this;
            setTimeout(function () { self.modalInput.focus(); }, 100);
        }

        closeModal() {
            this.modal.classList.remove('active');
        }

        search(query) {
            var q = query.toLowerCase().trim();
            this.focusedIdx = -1;
            var self = this;

            if (!q) {
                this.modalResults.innerHTML =
                    '<div class="search-no-results">' +
                    '<span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">search</span>' +
                    'Tapez pour rechercher dans les cours...' +
                    '</div>';
                return;
            }

            var results = this.index.filter(function (l) { return l.text.indexOf(q) !== -1; });

            if (results.length === 0) {
                this.modalResults.innerHTML =
                    '<div class="search-no-results">' +
                    '<span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">search_off</span>' +
                    'Aucun résultat pour « ' + query + ' »' +
                    '</div>';
                return;
            }

            var html = '';
            var max = Math.min(results.length, 20);
            for (var i = 0; i < max; i++) {
                var r = results[i];
                html +=
                    '<div class="search-result-item" data-cat="' + r.catId + '" data-lesson="' + r.lessonId + '">' +
                    '<span class="material-symbols-outlined">' + r.catIcon + '</span>' +
                    '<div>' +
                    '<div class="search-result-cat">' + r.catName + '</div>' +
                    '<div class="search-result-title">' + r.title + '</div>' +
                    '</div>' +
                    '</div>';
            }
            this.modalResults.innerHTML = html;

            // Click handlers
            var items = this.modalResults.querySelectorAll('.search-result-item');
            for (var j = 0; j < items.length; j++) {
                items[j].addEventListener('click', function () {
                    var catId = this.getAttribute('data-cat');
                    var lessonId = this.getAttribute('data-lesson');
                    self.closeModal();
                    self.onSelect(catId, lessonId);
                });
            }
        }
    }

    /* ─────────────────────────────────
       5. ROUTER (Simple Hash)
       ───────────────────────────────── */
    class Router {
        constructor() {
            this.callback = null;
            var self = this;
            window.addEventListener('hashchange', function () { self.resolve(); });
        }

        onNavigate(cb) {
            this.callback = cb;
        }

        resolve() {
            var hash = window.location.hash.replace('#', '') || '/';
            if (this.callback) this.callback(hash);
        }

        navigate(path) {
            window.location.hash = '#' + path;
        }

        parseRoute(hash) {
            // Expected: /categoryId/lessonId  or  /
            var parts = hash.replace(/^\//, '').split('/');
            if (parts.length >= 2 && parts[0] && parts[1]) {
                return { catId: parts[0], lessonId: parts[1] };
            }
            return null;
        }
    }

    /* ─────────────────────────────────
       6. MAIN APP
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
            // 1) Load data
            await this.loadData();

            // 2) Init managers
            this.progress = new ProgressManager();
            this.theme = new ThemeManager();
            this.sidebar = new SidebarManager();
            this.router = new Router();

            // 3) Render sidebar
            var self = this;
            this.sidebar.render(this.categories, this.progress, function (catId, lessonId) {
                self.router.navigate('/' + catId + '/' + lessonId);
            });

            // 4) Search
            this.search = new SearchManager(this.categories, function (catId, lessonId) {
                self.router.navigate('/' + catId + '/' + lessonId);
            });

            // 5) Router
            this.router.onNavigate(function (hash) {
                var parsed = self.router.parseRoute(hash);
                if (parsed) {
                    self.showLesson(parsed.catId, parsed.lessonId);
                } else {
                    self.showHome();
                }
            });

            // 6) Bind UI
            this.bindUI();

            // 7) Apply font size
            this.applyFontSize();

            // 8) Update progress
            this.updateGlobalProgress();

            // 9) Resolve current route
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
                console.warn('Astuce: Lancez un serveur local (npx serve, Live Server, python -m http.server)');
                this.categories = [];
                this.totalLessons = 0;
            }
        }

        bindUI() {
            var self = this;

            // Scroll to top
            var scrollTopBtn = document.getElementById('scrollTop');
            window.addEventListener('scroll', function () {
                if (scrollTopBtn) {
                    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
                }
            });
            if (scrollTopBtn) {
                scrollTopBtn.addEventListener('click', function () {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }

            // Font size panel
            var fontPanel = document.getElementById('fontPanel');
            var fontSizeBtn = document.getElementById('fontSizeBtn');
            var fontIncrease = document.getElementById('fontIncrease');
            var fontDecrease = document.getElementById('fontDecrease');

            if (fontSizeBtn) {
                fontSizeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    fontPanel.classList.toggle('active');
                });
            }
            if (fontIncrease) {
                fontIncrease.addEventListener('click', function () {
                    self.fontSize = Math.min(self.fontSize + 1, 24);
                    self.applyFontSize();
                });
            }
            if (fontDecrease) {
                fontDecrease.addEventListener('click', function () {
                    self.fontSize = Math.max(self.fontSize - 1, 12);
                    self.applyFontSize();
                });
            }

            // Close font panel on outside click
            document.addEventListener('click', function (e) {
                if (fontPanel && !e.target.closest('#fontPanel') && !e.target.closest('#fontSizeBtn')) {
                    fontPanel.classList.remove('active');
                }
            });

            // Print
            var printBtn = document.getElementById('printBtn');
            if (printBtn) {
                printBtn.addEventListener('click', function () { window.print(); });
            }

            // Bookmark
            var bookmarkBtn = document.getElementById('bookmarkBtn');
            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', function () {
                    if (!self.currentCatId || !self.currentLessonId) return;
                    var cat = self.findCategory(self.currentCatId);
                    var lesson = self.findLesson(self.currentCatId, self.currentLessonId);
                    if (cat && lesson) {
                        var isNowBookmarked = self.progress.toggleBookmark(
                            self.currentCatId, self.currentLessonId, lesson.title, cat.name
                        );
                        bookmarkBtn.classList.toggle('bookmarked', isNowBookmarked);
                    }
                });
            }
        }

        applyFontSize() {
            document.documentElement.style.setProperty('--font-size-base', this.fontSize + 'px');
            var display = document.getElementById('fontSizeValue');
            if (display) display.textContent = this.fontSize + 'px';
            localStorage.setItem('codelearn-fontsize', this.fontSize);
        }

        updateGlobalProgress() {
            var percent = this.progress.getGlobalProgress(this.totalLessons);
            var fill = document.getElementById('globalProgress');
            var text = document.getElementById('globalProgressText');
            if (fill) fill.style.width = percent + '%';
            if (text) text.textContent = percent + '%';
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

        // ═══════════ HOME ═══════════

        showHome() {
            this.currentCatId = null;
            this.currentLessonId = null;

            document.getElementById('homePage').style.display = '';
            document.getElementById('coursePage').style.display = 'none';
            document.getElementById('toc').style.display = 'none';

            this.sidebar.setActive('', '');
            this.setBreadcrumb([{ icon: 'home', label: 'Accueil' }]);

            var bookmarkBtn = document.getElementById('bookmarkBtn');
            if (bookmarkBtn) bookmarkBtn.classList.remove('bookmarked');

            // Stats
            var el1 = document.getElementById('totalCourses');
            var el2 = document.getElementById('totalCategories');
            var el3 = document.getElementById('completedLessons');
            if (el1) el1.textContent = this.totalLessons;
            if (el2) el2.textContent = this.categories.length;
            if (el3) el3.textContent = this.progress.getCompletedCount();

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
                    '<div class="category-card-icon">' +
                    '<span class="material-symbols-outlined">' + cat.icon + '</span>' +
                    '</div>' +
                    '<h3>' + cat.name + '</h3>' +
                    '<p>' + cat.description + '</p>' +
                    '<div class="category-card-meta">' +
                    '<span class="category-card-lessons">' +
                    '<span class="material-symbols-outlined">menu_book</span>' +
                    cat.lessons.length + ' leçons · ' + cat.level +
                    '</span>' +
                    '<div class="category-card-progress">' +
                    '<div class="category-card-progress-fill" style="width:' + prog + '%"></div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            });

            grid.innerHTML = html;

            // Click handlers
            var cards = grid.querySelectorAll('.category-card');
            for (var i = 0; i < cards.length; i++) {
                cards[i].addEventListener('click', function () {
                    var catId = this.getAttribute('data-category');
                    var cat = self.findCategory(catId);
                    if (cat && cat.lessons.length > 0) {
                        self.router.navigate('/' + catId + '/' + cat.lessons[0].id);
                    }
                });
            }
        }

        renderRecent() {
            var section = document.getElementById('recentSection');
            var list = document.getElementById('recentList');
            var recent = this.progress.getRecent(5);
            var self = this;

            if (!section || !list) return;

            if (recent.length === 0) {
                section.style.display = 'none';
                return;
            }

            section.style.display = '';
            var html = '';
            recent.forEach(function (r) {
                html +=
                    '<div class="recent-item" data-cat="' + r.catId + '" data-lesson="' + r.lessonId + '">' +
                    '<span class="material-symbols-outlined">history</span>' +
                    '<div class="recent-item-info">' +
                    '<div class="recent-item-title">' + r.title + '</div>' +
                    '<div class="recent-item-cat">' + r.catName + '</div>' +
                    '</div>' +
                    '<span class="material-symbols-outlined recent-item-arrow">arrow_forward</span>' +
                    '</div>';
            });
            list.innerHTML = html;

            var items = list.querySelectorAll('.recent-item');
            for (var i = 0; i < items.length; i++) {
                items[i].addEventListener('click', function () {
                    self.router.navigate('/' + this.getAttribute('data-cat') + '/' + this.getAttribute('data-lesson'));
                });
            }
        }

        // ═══════════ LESSON ═══════════

        async showLesson(catId, lessonId) {
            var cat = this.findCategory(catId);
            if (!cat) { this.showHome(); return; }

            var lessonIdx = this.findLessonIndex(cat, lessonId);
            if (lessonIdx < 0) { this.showHome(); return; }

            var lesson = cat.lessons[lessonIdx];
            this.currentCatId = catId;
            this.currentLessonId = lessonId;

            // Toggle views
            document.getElementById('homePage').style.display = 'none';
            document.getElementById('coursePage').style.display = '';

            // Sidebar
            this.sidebar.setActive(catId, lessonId);

            // Breadcrumb
            this.setBreadcrumb([
                { icon: 'home', label: 'Accueil', link: '#/' },
                { label: cat.name },
                { label: lesson.title, current: true }
            ]);

            // Bookmark state
            var bookmarkBtn = document.getElementById('bookmarkBtn');
            if (bookmarkBtn) {
                bookmarkBtn.classList.toggle('bookmarked', this.progress.isBookmarked(catId, lessonId));
            }

            // Load content
            await this.loadLessonContent(cat, lesson, lessonIdx);

            // History
            this.progress.addToHistory(catId, lessonId, lesson.title, cat.name);

            // TOC
            this.buildTOC();

            window.scrollTo({ top: 0 });
        }

        async loadLessonContent(cat, lesson, lessonIdx) {
            var self = this;
            var header = document.getElementById('courseHeader');
            var body = document.getElementById('courseBody');
            var footer = document.getElementById('courseFooter');

            // ── Header ──
            header.innerHTML =
                '<span class="course-badge" style="background:oklch(0.60 0.20 ' + cat.color + '/0.1);color:oklch(0.50 0.18 ' + cat.color + ');">' +
                '<span class="material-symbols-outlined" style="font-size:16px;">' + cat.icon + '</span> ' +
                cat.name +
                '</span>' +
                '<h1>' + lesson.title + '</h1>' +
                '<div class="course-meta">' +
                '<span><span class="material-symbols-outlined">schedule</span> ' + lesson.duration + '</span>' +
                '<span><span class="material-symbols-outlined">signal_cellular_alt</span> ' + cat.level + '</span>' +
                '<span><span class="material-symbols-outlined">format_list_numbered</span> Leçon ' + (lessonIdx + 1) + ' / ' + cat.lessons.length + '</span>' +
                '</div>';

            // ── Body — fetch content ──
            try {
                var res = await fetch(lesson.file);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                var html = await res.text();
                body.innerHTML = html;
            } catch (err) {
                console.warn('Cours non trouvé:', lesson.file, err);
                body.innerHTML =
                    '<div class="info-box warning">' +
                    '<span class="material-symbols-outlined">warning</span>' +
                    '<div>' +
                    '<strong>Contenu en cours de rédaction</strong>' +
                    '<p>Ce cours sera bientôt disponible. Fichier attendu : <code>' + lesson.file + '</code></p>' +
                    '<p style="margin-top:8px;font-size:0.8rem;color:var(--text-tertiary);">' +
                    'Si vous travaillez en local, lancez un serveur : <code>npx serve</code> ou <code>python3 -m http.server</code></p>' +
                    '</div>' +
                    '</div>';
            }

            // ── Enhance code blocks ──
            this.enhanceCodeBlocks(body);

            // ── Footer ──
            var isComplete = this.progress.isCompleted(cat.id, lesson.id);
            var prev = lessonIdx > 0 ? cat.lessons[lessonIdx - 1] : null;
            var next = lessonIdx < cat.lessons.length - 1 ? cat.lessons[lessonIdx + 1] : null;

            var footerHTML =
                '<button class="mark-complete-btn' + (isComplete ? ' completed' : '') + '" id="markCompleteBtn">' +
                '<span class="material-symbols-outlined">' + (isComplete ? 'check_circle' : 'radio_button_unchecked') + '</span> ' +
                (isComplete ? 'Terminé !' : 'Marquer comme terminé') +
                '</button>' +
                '<div style="display:flex;gap:12px;width:100%;margin-top:16px;flex-wrap:wrap;">';

            if (prev) {
                footerHTML +=
                    '<button class="course-nav-btn prev" data-lesson="' + prev.id + '">' +
                    '<span class="material-symbols-outlined">arrow_back</span>' +
                    '<div><div class="nav-direction">Précédent</div><div class="nav-title">' + prev.title + '</div></div>' +
                    '</button>';
            }
            if (next) {
                footerHTML +=
                    '<button class="course-nav-btn next" data-lesson="' + next.id + '">' +
                    '<div><div class="nav-direction">Suivant</div><div class="nav-title">' + next.title + '</div></div>' +
                    '<span class="material-symbols-outlined">arrow_forward</span>' +
                    '</button>';
            }

            footerHTML += '</div>';
            footer.innerHTML = footerHTML;

            // ── Event: mark complete ──
            var markBtn = document.getElementById('markCompleteBtn');
            if (markBtn) {
                markBtn.addEventListener('click', function () {
                    var done = self.progress.toggleComplete(cat.id, lesson.id);
                    this.classList.toggle('completed', done);
                    this.innerHTML =
                        '<span class="material-symbols-outlined">' + (done ? 'check_circle' : 'radio_button_unchecked') + '</span> ' +
                        (done ? 'Terminé !' : 'Marquer comme terminé');
                    if (done) self.sidebar.markCompleted(cat.id, lesson.id);
                    self.updateGlobalProgress();
                });
            }

            // ── Event: prev/next ──
            var navBtns = footer.querySelectorAll('.course-nav-btn');
            for (var i = 0; i < navBtns.length; i++) {
                navBtns[i].addEventListener('click', function () {
                    self.router.navigate('/' + cat.id + '/' + this.getAttribute('data-lesson'));
                });
            }
        }

        enhanceCodeBlocks(container) {
            var blocks = container.querySelectorAll('pre');
            for (var i = 0; i < blocks.length; i++) {
                var pre = blocks[i];
                if (pre.getAttribute('data-enhanced')) continue;
                pre.setAttribute('data-enhanced', '1');

                // Wrap if not already in .code-block
                if (!pre.closest('.code-block')) {
                    var wrapper = document.createElement('div');
                    wrapper.className = 'code-block';

                    var code = pre.querySelector('code');
                    var langMatch = code ? (code.className || '').match(/language-(\w+)/) : null;
                    var lang = langMatch ? langMatch[1] : 'code';

                    var headerDiv = document.createElement('div');
                    headerDiv.className = 'code-block-header';
                    headerDiv.innerHTML =
                        '<div class="code-block-lang">' +
                        '<span class="code-block-dots"><span></span><span></span><span></span></span> ' +
                        lang +
                        '</div>' +
                        '<button class="code-copy-btn" type="button" aria-label="Copier">' +
                        '<span class="material-symbols-outlined">content_copy</span> Copier' +
                        '</button>';

                    pre.parentNode.insertBefore(wrapper, pre);
                    wrapper.appendChild(headerDiv);
                    wrapper.appendChild(pre);
                }

                // Attach copy handler
                var block = pre.closest('.code-block');
                if (block) {
                    var copyBtns = block.querySelectorAll('.code-copy-btn');
                    for (var j = 0; j < copyBtns.length; j++) {
                        if (copyBtns[j].getAttribute('data-bound')) continue;
                        copyBtns[j].setAttribute('data-bound', '1');
                        (function (btn, preEl) {
                            btn.addEventListener('click', function () {
                                var text = preEl.textContent;
                                navigator.clipboard.writeText(text).then(function () {
                                    btn.classList.add('copied');
                                    btn.innerHTML = '<span class="material-symbols-outlined">check</span> Copié !';
                                    setTimeout(function () {
                                        btn.classList.remove('copied');
                                        btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copier';
                                    }, 2000);
                                }).catch(function () {
                                    // Fallback
                                    var ta = document.createElement('textarea');
                                    ta.value = text;
                                    ta.style.position = 'fixed';
                                    ta.style.opacity = '0';
                                    document.body.appendChild(ta);
                                    ta.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(ta);
                                    btn.classList.add('copied');
                                    btn.innerHTML = '<span class="material-symbols-outlined">check</span> Copié !';
                                    setTimeout(function () {
                                        btn.classList.remove('copied');
                                        btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copier';
                                    }, 2000);
                                });
                            });
                        })(copyBtns[j], pre);
                    }
                }
            }
        }

        // ═══════════ TOC ═══════════

        buildTOC() {
            var tocEl = document.getElementById('toc');
            var tocNav = document.getElementById('tocNav');
            var body = document.getElementById('courseBody');

            if (!tocEl || !tocNav || !body) return;

            var headings = body.querySelectorAll('h2, h3');

            if (headings.length === 0) {
                tocEl.style.display = 'none';
                return;
            }

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

            this.tocObserver = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            var links = tocNav.querySelectorAll('a');
                            for (var i = 0; i < links.length; i++) {
                                links[i].classList.remove('active');
                            }
                            var active = tocNav.querySelector('a[href="#' + entry.target.id + '"]');
                            if (active) active.classList.add('active');
                        }
                    });
                },
                { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
            );

            for (var i = 0; i < headings.length; i++) {
                this.tocObserver.observe(headings[i]);
            }
        }

        // ═══════════ BREADCRUMB ═══════════

        setBreadcrumb(items) {
            var bc = document.getElementById('breadcrumb');
            if (!bc) return;

            var html = '';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (i > 0) html += '<span class="separator">›</span>';
                if (item.icon) {
                    html += '<span class="material-symbols-outlined">' + item.icon + '</span>';
                }
                if (item.link) {
                    html += '<a href="' + item.link + '">' + item.label + '</a>';
                } else if (item.current) {
                    html += '<span class="current">' + item.label + '</span>';
                } else {
                    html += '<span>' + item.label + '</span>';
                }
            }
            bc.innerHTML = html;
        }
    }

    /* ─────────────────────────────────
       7. INIT ON DOM READY
       ───────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        var app = new CodeLearnApp();
        app.start();
    });

})();