// ─────────────────────────────────────────────────────────────────────────────
// Yandex Music Time
// Модульная версия: settings, db, stats, timer, playerObserver, navbar, ui,
// modals, weeklyStats.
// ─────────────────────────────────────────────────────────────────────────────

const AppConstants = Object.freeze({
    addonName: 'YandexMusicTime',
    dbName: 'YandexMusicStatsDB',
    storeName: 'sessions',
    legacyKey: 'yandexMusicTotalTime',
    previousSessionKey: 'yandexMusicPreviousSessionTime',
    dayMs: 24 * 60 * 60 * 1000,
    autosaveIntervalSeconds: 30,
    dayProgressMaxSeconds: 24 * 60 * 60,
});


const ThemeModule = (() => {
    const themeAttribute = 'data-ym-addon-theme';

    let probe = null;
    let observer = null;
    let syncInterval = null;
    let syncFrame = null;
    let currentTheme = null;

    function ensureProbe() {
        if (probe && probe.isConnected) {
            return probe;
        }

        probe = document.createElement('span');
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText = [
            'position: fixed',
            'left: -9999px',
            'top: -9999px',
            'width: 0',
            'height: 0',
            'overflow: hidden',
            'opacity: 0',
            'pointer-events: none',
            'color: var(--ym-controls-color-primary-text-enabled_variant, rgb(255, 255, 255))',
        ].join(';');

        (document.body || document.documentElement).appendChild(probe);

        return probe;
    }

    function parseComputedColor(color) {
        const rgbMatch = color.match(/rgba?\(\s*([\d.]+)%?[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?/i);

        if (rgbMatch) {
            const usesPercent = color.includes('%');
            const multiplier = usesPercent ? 2.55 : 1;

            return [
                Number(rgbMatch[1]) * multiplier,
                Number(rgbMatch[2]) * multiplier,
                Number(rgbMatch[3]) * multiplier,
            ];
        }

        const srgbMatch = color.match(
            /color\(\s*(?:srgb|display-p3)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i
        );

        if (srgbMatch) {
            return [
                Number(srgbMatch[1]) * 255,
                Number(srgbMatch[2]) * 255,
                Number(srgbMatch[3]) * 255,
            ];
        }

        return null;
    }

    function getRelativeLuminance([red, green, blue]) {
        const channels = [red, green, blue].map((value) => {
            const channel = Math.min(255, Math.max(0, value)) / 255;

            return channel <= 0.04045
                ? channel / 12.92
                : Math.pow((channel + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function detectTheme() {
        const computedColor = getComputedStyle(ensureProbe()).color;
        const rgb = parseComputedColor(computedColor);

        if (!rgb) {
            return currentTheme || 'dark';
        }

        // В светлой теме основной текст Яндекс Музыки тёмный,
        // а в тёмной — светлый.
        return getRelativeLuminance(rgb) < 0.5 ? 'light' : 'dark';
    }

    function applyTheme(theme) {
        const root = document.documentElement;

        if (currentTheme === theme && root.getAttribute(themeAttribute) === theme) {
            return;
        }

        currentTheme = theme;
        root.setAttribute(themeAttribute, theme);
    }

    function syncTheme() {
        syncFrame = null;
        applyTheme(detectTheme());
    }

    function scheduleSync() {
        if (syncFrame !== null) {
            return;
        }

        syncFrame = requestAnimationFrame(syncTheme);
    }

    function init() {
        scheduleSync();

        observer = new MutationObserver(scheduleSync);

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-theme'],
        });

        if (document.body) {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class', 'style', 'data-theme'],
            });
        }

        syncInterval = setInterval(scheduleSync, 1000);
    }

    function destroy() {
        if (observer) {
            observer.disconnect();
        }

        if (syncInterval) {
            clearInterval(syncInterval);
        }

        if (syncFrame !== null) {
            cancelAnimationFrame(syncFrame);
        }

        if (probe) {
            probe.remove();
        }

        observer = null;
        syncInterval = null;
        syncFrame = null;
        probe = null;
        currentTheme = null;

        document.documentElement.removeAttribute(themeAttribute);
    }

    return {
        init,
        destroy,
    };
})();

const SettingsModule = (() => {
    function getAddonSettings(addonName) {
        return (
            window.nextmusicApi?.getSettings(addonName) ?? {
                getCurrent: () => ({}),
                onChange: () => () => {},
            }
        );
    }

    function unwrapSetting(entry, fallback) {
        if (entry !== null && entry !== undefined && typeof entry === 'object' && !Array.isArray(entry)) {
            if (typeof entry.value !== 'undefined') return entry.value;
            if (typeof entry.default !== 'undefined') return entry.default;
        }

        return typeof entry !== 'undefined' ? entry : fallback;
    }

    function readBool(settings, key, fallback) {
        return Boolean(unwrapSetting(settings[key], fallback));
    }

    function readNumber(settings, key, fallback) {
        return Number(unwrapSetting(settings[key], fallback));
    }

    function readString(settings, key, fallback) {
        return String(unwrapSetting(settings[key], fallback));
    }

    return {
        getAddonSettings,
        readBool,
        readNumber,
        readString,
    };
})();

const DBModule = (() => {
    let dbPromise = null;

    function open() {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(AppConstants.dbName, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(AppConstants.storeName)) {
                    const store = db.createObjectStore(AppConstants.storeName, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });

                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('date', 'date');
                }
            };

            request.onsuccess = () => resolve(request.result);

            request.onerror = () => {
                dbPromise = null;
                reject(request.error);
            };
        });

        return dbPromise;
    }

    async function addSession(duration) {
        if (duration <= 0) return;

        try {
            const db = await open();
            const tx = db.transaction(AppConstants.storeName, 'readwrite');
            const store = tx.objectStore(AppConstants.storeName);
            const now = Date.now();
            const date = new Date(now).toISOString().slice(0, 10);

            await new Promise((resolve, reject) => {
                const req = store.add({
                    timestamp: now,
                    duration,
                    date,
                });

                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            console.warn('[YandexMusicTime] Не удалось записать сессию:', error);
        }
    }

    async function getAllSessions() {
        try {
            const db = await open();
            const tx = db.transaction(AppConstants.storeName, 'readonly');
            const store = tx.objectStore(AppConstants.storeName);

            return new Promise((resolve) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
        } catch (error) {
            console.warn('[YandexMusicTime] Не удалось прочитать сессии:', error);
            return [];
        }
    }

    async function clearAllSessions() {
        try {
            const db = await open();
            const tx = db.transaction(AppConstants.storeName, 'readwrite');
            const store = tx.objectStore(AppConstants.storeName);

            await new Promise((resolve, reject) => {
                const req = store.clear();
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            });

            localStorage.removeItem(AppConstants.legacyKey);
            localStorage.removeItem(AppConstants.previousSessionKey);
        } catch (error) {
            console.warn('[YandexMusicTime] Не удалось очистить статистику:', error);
        }
    }

    async function migrateLegacyTime() {
        const legacy = localStorage.getItem(AppConstants.legacyKey);
        if (!legacy) return;

        const seconds = parseInt(legacy, 10);

        if (seconds > 0) {
            try {
                const db = await open();
                const tx = db.transaction(AppConstants.storeName, 'readwrite');
                const store = tx.objectStore(AppConstants.storeName);

                const all = await new Promise((resolve) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });

                if (all.length === 0) {
                    await new Promise((resolve, reject) => {
                        const req = store.add({
                            timestamp: 0,
                            duration: seconds,
                            date: '1970-01-01',
                        });

                        req.onsuccess = resolve;
                        req.onerror = () => reject(req.error);
                    });
                }
            } catch (error) {
                console.warn('[YandexMusicTime] Ошибка миграции:', error);
            }
        }

        localStorage.removeItem(AppConstants.legacyKey);
    }

    return {
        open,
        addSession,
        getAllSessions,
        clearAllSessions,
        migrateLegacyTime,
    };
})();

const StatsModule = (() => {
    function getPeriodBoundaries(date = new Date()) {
        const startOfDay = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0,
            0,
            0,
            0
        ).getTime();

        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const startOfWeek = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - mondayOffset,
            0,
            0,
            0,
            0
        ).getTime();

        const startOfMonth = new Date(
            date.getFullYear(),
            date.getMonth(),
            1,
            0,
            0,
            0,
            0
        ).getTime();

        const startOfYear = new Date(
            date.getFullYear(),
            0,
            1,
            0,
            0,
            0,
            0
        ).getTime();

        return {
            startOfDay,
            startOfWeek,
            endOfWeek: startOfWeek + 7 * AppConstants.dayMs,
            startOfMonth,
            startOfYear,
        };
    }

    function getStatsFromSessions(sessions) {
        const nowDate = new Date();
        const now = nowDate.getTime();
        const boundaries = getPeriodBoundaries(nowDate);

        let total = 0;
        let year = 0;
        let month = 0;
        let week = 0;
        let day = 0;

        for (const session of sessions) {
            const duration = Number(session.duration) || 0;
            const timestamp = Number(session.timestamp) || 0;

            if (duration <= 0) continue;

            total += duration;

            if (timestamp <= 0 || timestamp > now) {
                continue;
            }

            if (timestamp >= boundaries.startOfYear) year += duration;
            if (timestamp >= boundaries.startOfMonth) month += duration;
            if (timestamp >= boundaries.startOfWeek) week += duration;
            if (timestamp >= boundaries.startOfDay) day += duration;
        }

        return {
            total,
            year,
            month,
            week,
            day,
        };
    }

    function getWeekdayName(index) {
        return [
            'Понедельник',
            'Вторник',
            'Среда',
            'Четверг',
            'Пятница',
            'Суббота',
            'Воскресенье',
        ][index] || '';
    }

    function formatDateShort(date) {
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    function getWeekStatsFromSessions(sessions) {
        const nowDate = new Date();
        const now = nowDate.getTime();
        const boundaries = getPeriodBoundaries(nowDate);

        const days = Array.from({ length: 7 }, (_, index) => {
            const timestamp = boundaries.startOfWeek + index * AppConstants.dayMs;
            const date = new Date(timestamp);

            return {
                index,
                date,
                timestamp,
                label: getWeekdayName(index),
                dateLabel: formatDateShort(date),
                duration: 0,
                isToday:
                    date.getFullYear() === nowDate.getFullYear() &&
                    date.getMonth() === nowDate.getMonth() &&
                    date.getDate() === nowDate.getDate(),
            };
        });

        for (const session of sessions) {
            const duration = Number(session.duration) || 0;
            const timestamp = Number(session.timestamp) || 0;

            if (duration <= 0) continue;
            if (timestamp <= 0 || timestamp > now) continue;
            if (timestamp < boundaries.startOfWeek || timestamp >= boundaries.endOfWeek) continue;

            const dayIndex = Math.floor((timestamp - boundaries.startOfWeek) / AppConstants.dayMs);

            if (days[dayIndex]) {
                days[dayIndex].duration += duration;
            }
        }

        return {
            days,
            total: days.reduce((sum, day) => sum + day.duration, 0),
            startDate: new Date(boundaries.startOfWeek),
            endDate: new Date(boundaries.endOfWeek - 1),
        };
    }

    function getLatestCompletedSession(sessions) {
        const realSessions = sessions
            .filter((session) => session.timestamp && session.timestamp > 0 && session.duration > 0)
            .sort((a, b) => b.timestamp - a.timestamp);

        return realSessions[0]?.duration || 0;
    }

    function formatTime(seconds, showSeconds = true) {
        const safeSeconds = Math.max(0, Number(seconds) || 0);
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const secs = safeSeconds % 60;

        return showSeconds
            ? `${hours}ч ${minutes}м ${secs}с`
            : `${hours}ч ${minutes}м`;
    }

    function formatTimePadded(seconds) {
        const safeSeconds = Math.max(0, Number(seconds) || 0);
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const secs = safeSeconds % 60;

        return `${String(hours).padStart(2, '0')} ч ${String(minutes).padStart(2, '0')} м ${String(secs).padStart(2, '0')} с`;
    }

    return {
        getPeriodBoundaries,
        getStatsFromSessions,
        getWeekStatsFromSessions,
        getLatestCompletedSession,
        formatDateShort,
        formatTime,
        formatTimePadded,
    };
})();

const TimerModule = (() => {
    const state = {
        totalTime: 0,
        isPlaying: false,
        startTime: null,
        timerElement: null,
        currentSessionTime: 0,
        previousSessionTime: Number.parseInt(localStorage.getItem(AppConstants.previousSessionKey) || '0', 10) || 0,
        statsCache: {
            total: 0,
            year: 0,
            month: 0,
            week: 0,
            day: 0,
        },
    };

    async function loadTotalTime() {
        const sessions = await DBModule.getAllSessions();
        const stats = StatsModule.getStatsFromSessions(sessions);

        state.totalTime = stats.total;
        state.statsCache = stats;

        if (!state.previousSessionTime) {
            state.previousSessionTime = StatsModule.getLatestCompletedSession(sessions);
        }

        return stats.total;
    }

    async function refreshStatsCache() {
        const sessions = await DBModule.getAllSessions();
        const stats = StatsModule.getStatsFromSessions(sessions);

        state.statsCache = stats;
        state.totalTime = stats.total;
    }

    function start() {
        if (!state.isPlaying) {
            state.isPlaying = true;
            state.startTime = Date.now();
        }
    }

    function stop() {
        if (!state.isPlaying) return;

        commitCurrentChunk({
            continuePlaying: false,
            minSeconds: 1,
        });

        state.isPlaying = false;
        state.startTime = null;
    }

    function commitCurrentChunk(options = {}) {
        const minSeconds = Number(options.minSeconds || 1);
        const continuePlaying = Boolean(options.continuePlaying);

        if (!state.startTime) return 0;

        const now = Date.now();
        const elapsed = Math.floor((now - state.startTime) / 1000);

        if (elapsed < minSeconds) return 0;

        DBModule.addSession(elapsed);

        state.totalTime += elapsed;
        state.currentSessionTime += elapsed;
        state.statsCache.total += elapsed;
        state.statsCache.year += elapsed;
        state.statsCache.month += elapsed;
        state.statsCache.week += elapsed;
        state.statsCache.day += elapsed;

        state.startTime = continuePlaying && state.isPlaying ? now : null;

        return elapsed;
    }

    function autosaveCurrentSession() {
        if (!state.isPlaying) return 0;

        return commitCurrentChunk({
            continuePlaying: true,
            minSeconds: AppConstants.autosaveIntervalSeconds,
        });
    }

    function getActiveElapsedTime() {
        if (!state.isPlaying || !state.startTime) return 0;
        return Math.floor((Date.now() - state.startTime) / 1000);
    }

    function saveCurrentSessionAsPrevious() {
        const current = getCurrentListeningSessionTime();
        localStorage.setItem(AppConstants.previousSessionKey, String(current));
    }

    function getCurrentListeningSessionTime() {
        return state.currentSessionTime + getActiveElapsedTime();
    }

    function getCurrentTime() {
        return state.totalTime + getActiveElapsedTime();
    }

    function getDisplayTimeByMode(mode) {
        const activeElapsed = getActiveElapsedTime();

        switch (String(mode)) {
            case '2':
                return state.statsCache.year + activeElapsed;
            case '3':
                return state.statsCache.month + activeElapsed;
            case '4':
                return state.statsCache.week + activeElapsed;
            case '5':
                return state.statsCache.day + activeElapsed;
            case '6':
                return getCurrentListeningSessionTime();
            case '1':
            default:
                return getCurrentTime();
        }
    }

    function getTimerLabelByMode(mode) {
        switch (String(mode)) {
            case '2':
                return 'За год';
            case '3':
                return 'За месяц';
            case '4':
                return 'За неделю';
            case '5':
                return 'За день';
            case '6':
                return 'Сессия';
            case '1':
            default:
                return 'Всего';
        }
    }

    async function getStats() {
        const sessions = await DBModule.getAllSessions();
        const stats = StatsModule.getStatsFromSessions(sessions);

        state.statsCache = stats;

        const activeElapsed = getActiveElapsedTime();

        return {
            total: stats.total + activeElapsed,
            year: stats.year + activeElapsed,
            month: stats.month + activeElapsed,
            week: stats.week + activeElapsed,
            day: stats.day + activeElapsed,
            currentSession: getCurrentListeningSessionTime(),
            previousSession: state.previousSessionTime,
        };
    }

    async function getWeeklyStats() {
        const sessions = await DBModule.getAllSessions();
        const weeklyStats = StatsModule.getWeekStatsFromSessions(sessions);
        const activeElapsed = getActiveElapsedTime();

        if (activeElapsed > 0) {
            const todayIndex = weeklyStats.days.findIndex((day) => day.isToday);

            if (todayIndex >= 0) {
                weeklyStats.days[todayIndex].duration += activeElapsed;
                weeklyStats.total += activeElapsed;
            }
        }

        return weeklyStats;
    }

    async function resetStats() {
        await DBModule.clearAllSessions();

        state.totalTime = 0;
        state.currentSessionTime = 0;
        state.previousSessionTime = 0;
        state.statsCache = {
            total: 0,
            year: 0,
            month: 0,
            week: 0,
            day: 0,
        };

        state.startTime = state.isPlaying ? Date.now() : null;

        updateDisplay(AppModule.getSettings());
    }

    function getPositionClass(positionValue) {
        const positions = {
            1: 'ym-timer--top-center',
            2: 'ym-timer--top-left',
            3: 'ym-timer--bottom-left',
        };

        return positions[positionValue] || positions[1];
    }

    function updateDisplay(settings) {
        const showTimer = SettingsModule.readBool(settings, 'showTimer', true);

        if (!showTimer) {
            if (state.timerElement) {
                state.timerElement.remove();
                state.timerElement = null;
            }

            return;
        }

        if (!state.timerElement) {
            state.timerElement = document.createElement('div');
            state.timerElement.id = 'yandex-music-timer';
            document.body.appendChild(state.timerElement);
        }

        const positionValue = SettingsModule.readNumber(settings, 'timerPosition', 1);
        const statType = SettingsModule.readNumber(settings, 'timerStatType', 1);
        const showTimerLabel = SettingsModule.readBool(settings, 'showTimerLabel', true);
        const useStaticColor = SettingsModule.readBool(settings, 'timerColor', false);
        const customColor = SettingsModule.readString(settings, 'customColor', '#ffffff');
        const fontSize = SettingsModule.readNumber(settings, 'fontSize', 12);
        const showSeconds = SettingsModule.readBool(settings, 'showSeconds', true);
        const showIcon = SettingsModule.readBool(settings, 'showIcon', false);

        state.timerElement.classList.remove(
            'ym-timer--top-center',
            'ym-timer--top-left',
            'ym-timer--bottom-left'
        );
        state.timerElement.classList.add(getPositionClass(positionValue));

        const color = useStaticColor
            ? customColor
            : 'var(--ym-controls-color-primary-text-enabled_variant, #ffffff)';

        state.timerElement.style.setProperty('--ym-timer-color', color);
        state.timerElement.style.setProperty('--ym-timer-font-size', `${fontSize}px`);

        const displayTime = getDisplayTimeByMode(statType);
        const formattedTime = StatsModule.formatTime(displayTime, showSeconds);
        const icon = showIcon ? '🎵 ' : '';
        const label = showTimerLabel ? `${getTimerLabelByMode(statType)}: ` : '';

        state.timerElement.textContent = `${icon}${label}${formattedTime}`;
    }

    function isPlaying() {
        return state.isPlaying;
    }

    function setPlayingFromUI(nextIsPlaying) {
        if (nextIsPlaying) {
            start();
        } else {
            stop();
        }
    }

    return {
        state,
        loadTotalTime,
        refreshStatsCache,
        start,
        stop,
        autosaveCurrentSession,
        getStats,
        getWeeklyStats,
        resetStats,
        updateDisplay,
        saveCurrentSessionAsPrevious,
        isPlaying,
        setPlayingFromUI,
    };
})();

const PlayerObserverModule = (() => {
    let playerObserver = null;
    let observedRoot = null;
    let syncScheduled = false;
    let rootSearchInterval = null;
    let safetySyncInterval = null;
    let lastKnownPlaybackState = null;

    const playPauseSelector = '[class*="BaseSonataControlsDesktop_sonataButton"]';
    const sonataIconSelector = `${playPauseSelector} use`;

    function findInPlayerRoot(selector) {
        if (observedRoot && document.contains(observedRoot)) {
            const foundInsideRoot = observedRoot.querySelector(selector);

            if (foundInsideRoot) {
                return foundInsideRoot;
            }
        }

        return document.querySelector(selector);
    }

    function findAllInPlayerRoot(selector) {
        if (observedRoot && document.contains(observedRoot)) {
            const foundInsideRoot = observedRoot.querySelectorAll(selector);

            if (foundInsideRoot.length) {
                return [...foundInsideRoot];
            }
        }

        return [...document.querySelectorAll(selector)];
    }

    function getPlaybackStateFromDOM() {
        const icons = findAllInPlayerRoot(sonataIconSelector);

        const hrefs = icons.map(
            (icon) => icon.getAttribute('xlink:href') || icon.getAttribute('href') || ''
        );

        if (hrefs.some((href) => href.includes('pause_filled_l'))) {
            return true;
        }

        if (hrefs.some((href) => href.includes('play_filled_l'))) {
            return false;
        }

        return null;
    }

    function applyPlaybackState(nextState) {
        if (nextState === null) {
            return;
        }

        if (nextState !== lastKnownPlaybackState) {
            lastKnownPlaybackState = nextState;
            TimerModule.setPlayingFromUI(nextState);
            return;
        }

        if (nextState === true && !TimerModule.isPlaying()) {
            TimerModule.setPlayingFromUI(true);
        }

        if (nextState === false && TimerModule.isPlaying()) {
            TimerModule.setPlayingFromUI(false);
        }
    }

    function syncPlaybackState() {
        syncScheduled = false;

        const nextState = getPlaybackStateFromDOM();
        applyPlaybackState(nextState);
    }

    function scheduleSync() {
        if (syncScheduled) {
            return;
        }

        syncScheduled = true;
        requestAnimationFrame(syncPlaybackState);
    }

    function getNearestPlayerRootFromButton(button) {
        if (!button) {
            return null;
        }

        const directRoot = button.closest(
            [
                '[class*="PlayerBar_root"]',
                '[class*="PlayerBar_root"]',
                '[class*="PlayerBar"]',
                '[class*="playerBar"]',
                '[class*="PlayerControls"]',
                '[class*="playerControls"]',
                '[class*="Bar"]',
            ].join(', ')
        );

        if (directRoot && directRoot !== document.body) {
            return directRoot;
        }

        let root = button;

        for (let i = 0; i < 6 && root?.parentElement && root.parentElement !== document.body; i++) {
            root = root.parentElement;
        }

        return root || button.parentElement;
    }

    function findPlayerRoot() {
        const button = document.querySelector(playPauseSelector);

        if (button) {
            return getNearestPlayerRootFromButton(button);
        }

        return (
            document.querySelector('[class*="PlayerBar_root"]') ||
            document.querySelector('[class*="PlayerBar_root"]') ||
            document.querySelector('[class*="PlayerBar"]') ||
            document.querySelector('[class*="playerBar"]') ||
            document.querySelector('[class*="PlayerControls"]') ||
            document.querySelector('[class*="playerControls"]')
        );
    }

    function observeRoot(root) {
        if (!root || root === observedRoot) {
            return;
        }

        if (playerObserver) {
            playerObserver.disconnect();
        }

        observedRoot = root;

        playerObserver = new MutationObserver(() => {
            scheduleSync();
        });

        playerObserver.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                'aria-label',
                'class',
                'disabled',
                'title',
                'href',
                'xlink:href',
            ],
        });

        syncPlaybackState();
    }

    function ensureObserver() {
        const rootIsStillValid =
            observedRoot &&
            document.contains(observedRoot) &&
            observedRoot.querySelector(playPauseSelector);

        if (!rootIsStillValid) {
            const root = findPlayerRoot();

            if (root) {
                observeRoot(root);
            }
        }

        syncPlaybackState();
    }

    function init() {
        ensureObserver();

        rootSearchInterval = setInterval(() => {
            ensureObserver();
        }, 2000);

        safetySyncInterval = setInterval(() => {
            syncPlaybackState();
        }, 1000);

        window.addEventListener('focus', ensureObserver);
        document.addEventListener('visibilitychange', ensureObserver);
    }

    function destroy() {
        if (playerObserver) {
            playerObserver.disconnect();
        }

        if (rootSearchInterval) {
            clearInterval(rootSearchInterval);
        }

        if (safetySyncInterval) {
            clearInterval(safetySyncInterval);
        }

        playerObserver = null;
        observedRoot = null;
        rootSearchInterval = null;
        safetySyncInterval = null;
        lastKnownPlaybackState = null;
    }

    return {
        init,
        destroy,
        syncPlaybackState,
    };
})();

const UIModule = (() => {
    let toastContainer = null;

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (typeof text !== 'undefined') element.textContent = text;

        return element;
    }

    function createSvgElement(tag, attrs = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);

        for (const [key, value] of Object.entries(attrs)) {
            element.setAttribute(key, value);
        }

        return element;
    }

function createModalSvgIcon(type) {
    const svg = createSvgElement('svg', {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
        focusable: 'false',
    });

    if (type === 'week') {
        svg.appendChild(createSvgElement('rect', {
            x: '3',
            y: '4',
            width: '18',
            height: '18',
            rx: '3',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M16 2v4',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M8 2v4',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M3 10h18',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M8 14h.01',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M12 14h.01',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M16 14h.01',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M8 18h.01',
        }));

        svg.appendChild(createSvgElement('path', {
            d: 'M12 18h.01',
        }));

        return svg;
    }

    // Иконка статистики в стиле 📊:
    // три красивые вертикальные колонки с разной высотой.
    svg.appendChild(createSvgElement('rect', {
        x: '4',
        y: '11',
        width: '4',
        height: '8',
        rx: '1.4',
        fill: 'currentColor',
        stroke: 'none',
        opacity: '0.92',
    }));

    svg.appendChild(createSvgElement('rect', {
        x: '10',
        y: '5',
        width: '4',
        height: '14',
        rx: '1.4',
        fill: 'currentColor',
        stroke: 'none',
        opacity: '0.98',
    }));

    svg.appendChild(createSvgElement('rect', {
        x: '16',
        y: '8',
        width: '4',
        height: '11',
        rx: '1.4',
        fill: 'currentColor',
        stroke: 'none',
        opacity: '0.94',
    }));

    svg.appendChild(createSvgElement('path', {
        d: 'M3 20h18',
        opacity: '0.65',
    }));

    return svg;
}

    function createModalTitleIcon(type) {
        const icon = createElement(
            'div',
            `ym-modal__title-icon ym-modal__title-icon--${type === 'week' ? 'week' : 'stats'}`
        );

        icon.appendChild(createModalSvgIcon(type));

        return icon;
    }

    function createButton(text, variant = 'default') {
        const button = createElement('button', 'ym-ui-button', text);

        if (variant === 'danger') button.classList.add('ym-ui-button--danger');
        if (variant === 'ghost') button.classList.add('ym-ui-button--ghost');

        return button;
    }

    function createCloseButton(onClick) {
        const button = createElement('button', 'ym-modal__close', '✕');
        button.type = 'button';
        button.addEventListener('click', onClick);
        return button;
    }

    function createModal(options) {
        const modal = createElement('div', `ym-modal ${options.modalClass || ''}`.trim());
        const box = createElement('div', `ym-modal__box ${options.boxClass || ''}`.trim());

        modal.id = options.id;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                options.onClose();
            }
        });

        const header = createElement('div', 'ym-modal__header');
        const titleWrap = createElement('div', 'ym-modal__title-wrap');
        const titleRow = createElement('div', 'ym-modal__title-row');

        if (options.icon) {
            titleRow.appendChild(createModalTitleIcon(options.icon));
        }

        const title = createElement('h3', 'ym-modal__title', options.title);
        titleRow.appendChild(title);

        const subtitle = createElement('div', 'ym-modal__subtitle', options.subtitle || '');

        if (options.subtitleId) subtitle.id = options.subtitleId;

        titleWrap.appendChild(titleRow);
        if (options.subtitle !== null) titleWrap.appendChild(subtitle);

        header.appendChild(titleWrap);
        header.appendChild(createCloseButton(options.onClose));

        box.appendChild(header);
        modal.appendChild(box);

        return {
            modal,
            box,
            title,
            subtitle,
        };
    }

    function createStatsCard(label, value, accentClass) {
        const card = createElement('div', 'ym-stats-card');
        const left = createElement('div', 'ym-stats-card__left');
        const accent = createElement('div', `ym-stats-card__accent ${accentClass || ''}`.trim());
        const labelElement = createElement('div', 'ym-stats-card__label', label);
        const valueElement = createElement('div', 'ym-stats-card__value', value);

        left.appendChild(accent);
        left.appendChild(labelElement);

        card.appendChild(left);
        card.appendChild(valueElement);

        return card;
    }

    function createWeekDayCard(day) {
        const card = createElement('div', 'ym-week-day');
        if (day.isToday) card.classList.add('ym-week-day--today');

        const top = createElement('div', 'ym-week-day__top');
        const left = createElement('div', 'ym-week-day__left');
        const accent = createElement('div', 'ym-week-day__accent');
        const text = createElement('div', 'ym-week-day__text');
        const title = createElement('div', 'ym-week-day__title', `${day.label}${day.isToday ? ' · сегодня' : ''}`);
        const date = createElement('div', 'ym-week-day__date', day.dateLabel);
        const value = createElement('div', 'ym-week-day__value', StatsModule.formatTimePadded(day.duration));
        const progress = document.createElement('progress');

        progress.className = 'ym-week-progress';
        progress.max = AppConstants.dayProgressMaxSeconds;
        progress.value = Math.min(AppConstants.dayProgressMaxSeconds, Math.max(0, Number(day.duration) || 0));
        progress.setAttribute('aria-label', `${day.label}: ${StatsModule.formatTimePadded(day.duration)} из 24 часов`);

        text.appendChild(title);
        text.appendChild(date);

        left.appendChild(accent);
        left.appendChild(text);

        top.appendChild(left);
        top.appendChild(value);

        card.appendChild(top);
        card.appendChild(progress);

        return card;
    }

    function createActions(className = '') {
        return createElement('div', `ym-modal__actions ${className}`.trim());
    }

    function createToastContainer() {
        if (toastContainer) return toastContainer;

        toastContainer = createElement('div', 'ym-toast-container');
        toastContainer.id = 'ym-toast-container';
        document.body.appendChild(toastContainer);

        return toastContainer;
    }

    function showToast(message, variant = 'default') {
        const container = createToastContainer();
        const toast = createElement('div', `ym-toast ym-toast--${variant}`, message);

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('ym-toast--visible');
        });

        setTimeout(() => {
            toast.classList.remove('ym-toast--visible');

            setTimeout(() => {
                toast.remove();

                if (toastContainer && toastContainer.children.length === 0) {
                    toastContainer.remove();
                    toastContainer = null;
                }
            }, 220);
        }, 2600);
    }

    function setHidden(element, hidden) {
        if (element) element.hidden = hidden;
    }

    return {
        createElement,
        createButton,
        createCloseButton,
        createModal,
        createStatsCard,
        createWeekDayCard,
        createActions,
        showToast,
        setHidden,
    };
})();

const ShareModule = (() => {
    async function copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');

        textarea.value = text;
        textarea.className = 'ym-clipboard-fallback';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        document.execCommand('copy');
        textarea.remove();
    }

    function buildStatsShareText(stats) {
        return [
            'Моя статистика Яндекс Музыки',
            '',
            `Прослушано всего: ${StatsModule.formatTimePadded(stats.total)}`,
            `За год: ${StatsModule.formatTimePadded(stats.year)}`,
            `За месяц: ${StatsModule.formatTimePadded(stats.month)}`,
            `За неделю: ${StatsModule.formatTimePadded(stats.week)}`,
            `За день: ${StatsModule.formatTimePadded(stats.day)}`,
            `В текущей сессии: ${StatsModule.formatTimePadded(stats.currentSession)}`,
            `В предыдущей сессии: ${StatsModule.formatTimePadded(stats.previousSession)}`,
            '',
            'Собрано через Yandex Music Time',
        ].join('\n');
    }

    function buildWeeklyShareText(weekStats) {
        const range = `${StatsModule.formatDateShort(weekStats.startDate)} — ${StatsModule.formatDateShort(weekStats.endDate)}`;
        const daysText = weekStats.days.map((day) => {
            return `${day.label}, ${day.dateLabel}: ${StatsModule.formatTimePadded(day.duration)}`;
        });

        return [
            'Моя статистика Яндекс Музыки за неделю',
            `Неделя: ${range}`,
            '',
            ...daysText,
            '',
            `Итого за неделю: ${StatsModule.formatTimePadded(weekStats.total)}`,
            '',
            'Собрано через Yandex Music Time',
        ].join('\n');
    }

    async function shareStats() {
        const stats = await TimerModule.getStats();
        const text = buildStatsShareText(stats);

        try {
            await copyTextToClipboard(text);
            UIModule.showToast('Статистика скопирована', 'success');
        } catch (error) {
            console.warn('[YandexMusicTime] Не удалось скопировать статистику:', error);
            UIModule.showToast('Не удалось скопировать статистику', 'error');
        }
    }

    async function shareWeeklyStats() {
        const weekStats = await TimerModule.getWeeklyStats();
        const text = buildWeeklyShareText(weekStats);

        try {
            await copyTextToClipboard(text);
            UIModule.showToast('Статистика за неделю скопирована', 'success');
        } catch (error) {
            console.warn('[YandexMusicTime] Не удалось скопировать статистику за неделю:', error);
            UIModule.showToast('Не удалось скопировать статистику за неделю', 'error');
        }
    }

    return {
        shareStats,
        shareWeeklyStats,
    };
})();

const WeeklyStatsModule = (() => {
    let modal = null;
    let list = null;
    let subtitle = null;
    let totalBox = null;

    function open() {
        if (modal) {
            UIModule.setHidden(modal, false);
            update();
            return;
        }

        const modalParts = UIModule.createModal({
            id: 'ym-weekly-stats-modal',
            title: 'Статистика за неделю',
            subtitle: 'С понедельника по воскресенье',
            subtitleId: 'ym-weekly-stats-subtitle',
            modalClass: 'ym-modal--weekly',
            boxClass: 'ym-modal__box--weekly',
            icon: 'week',
            onClose: close,
        });

        modal = modalParts.modal;
        subtitle = modalParts.subtitle;

        list = UIModule.createElement('div', 'ym-week-list');
        list.id = 'ym-weekly-stats-content';
        modalParts.box.appendChild(list);

        totalBox = UIModule.createElement('div', 'ym-week-total');
        totalBox.id = 'ym-weekly-stats-total';
        modalParts.box.appendChild(totalBox);

        const actions = UIModule.createActions();
        const shareButton = UIModule.createButton('Скопировать статистику');
        shareButton.classList.add('ym-ui-button--wide');
        shareButton.addEventListener('click', ShareModule.shareWeeklyStats);

        actions.appendChild(shareButton);
        modalParts.box.appendChild(actions);

        document.body.appendChild(modal);

        update();
    }

    function close() {
        UIModule.setHidden(modal, true);
    }

    async function update() {
        if (!modal || modal.hidden || !list || !subtitle || !totalBox) return;

        const weekStats = await TimerModule.getWeeklyStats();
        const range = `${StatsModule.formatDateShort(weekStats.startDate)} — ${StatsModule.formatDateShort(weekStats.endDate)}`;

        subtitle.textContent = `Текущая неделя: ${range}. Полная шкала дня = 24 ч`;

        list.replaceChildren(
            ...weekStats.days.map((day) => UIModule.createWeekDayCard(day))
        );

        const label = UIModule.createElement('div', 'ym-week-total__label', 'Итого за неделю');
        const value = UIModule.createElement('div', 'ym-week-total__value', StatsModule.formatTimePadded(weekStats.total));

        totalBox.replaceChildren(label, value);
    }

    function isOpen() {
        return Boolean(modal && !modal.hidden);
    }

    return {
        open,
        close,
        update,
        isOpen,
    };
})();

const ModalModule = (() => {
    let statsModal = null;
    let statsList = null;
    let resetConfirmModal = null;

    const cards = [
        ['Прослушано всего', 'total', 'ym-accent-total'],
        ['Прослушано за год', 'year', 'ym-accent-year'],
        ['Прослушано за месяц', 'month', 'ym-accent-month'],
        ['Прослушано за неделю', 'week', 'ym-accent-week'],
        ['Прослушано за день', 'day', 'ym-accent-day'],
        ['Прослушано в текущей сессии', 'currentSession', 'ym-accent-current'],
        ['Прослушано в предыдущей сессии', 'previousSession', 'ym-accent-previous'],
    ];

    function openStats() {
        if (statsModal) {
            UIModule.setHidden(statsModal, false);
            updateStats();
            return;
        }

        const modalParts = UIModule.createModal({
            id: 'ym-stats-modal',
            title: 'Статистика прослушиваний',
            subtitle: 'Твоё время в Яндекс Музыке',
            icon: 'stats',
            onClose: closeStats,
        });

        statsModal = modalParts.modal;

        statsList = UIModule.createElement('div', 'ym-stats-list');
        statsList.id = 'ym-stats-content';
        modalParts.box.appendChild(statsList);

        const actions = UIModule.createActions();

        const weeklyButton = UIModule.createButton('Статистика за неделю');
        weeklyButton.classList.add('ym-ui-button--wide');
        weeklyButton.addEventListener('click', WeeklyStatsModule.open);

        const shareButton = UIModule.createButton('Скопировать статистику');
        shareButton.classList.add('ym-ui-button--wide');
        shareButton.addEventListener('click', ShareModule.shareStats);

        const resetButton = UIModule.createButton('Сбросить', 'danger');
        resetButton.addEventListener('click', openResetConfirm);

        actions.appendChild(weeklyButton);
        actions.appendChild(shareButton);
        actions.appendChild(resetButton);

        modalParts.box.appendChild(actions);
        document.body.appendChild(statsModal);

        updateStats();
    }

    function closeStats() {
        UIModule.setHidden(statsModal, true);
    }

    async function updateStats() {
        if (!statsModal || statsModal.hidden || !statsList) return;

        const stats = await TimerModule.getStats();
        const nodes = cards.map(([label, key, accentClass]) => {
            return UIModule.createStatsCard(label, StatsModule.formatTimePadded(stats[key]), accentClass);
        });

        statsList.replaceChildren(...nodes);
    }

    function openResetConfirm() {
        if (resetConfirmModal) {
            UIModule.setHidden(resetConfirmModal, false);
            return;
        }

        const modal = UIModule.createElement('div', 'ym-modal ym-modal--confirm');
        modal.id = 'ym-reset-confirm-modal';
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeResetConfirm();
        });

        const box = UIModule.createElement('div', 'ym-modal__box ym-modal__box--confirm');

        const title = UIModule.createElement('h3', 'ym-modal__title ym-modal__title--confirm', 'Сбросить статистику?');
        const text = UIModule.createElement(
            'div',
            'ym-modal__text',
            'Это действие удалит всё накопленное время прослушивания. Отменить сброс после подтверждения не получится.'
        );

        const actions = UIModule.createActions('ym-modal__actions--confirm');
        const cancelButton = UIModule.createButton('Отмена', 'ghost');
        const confirmButton = UIModule.createButton('Да, сбросить', 'danger');

        confirmButton.classList.add('ym-ui-button--confirm');

        cancelButton.addEventListener('click', closeResetConfirm);

        confirmButton.addEventListener('click', async () => {
            confirmButton.disabled = true;
            confirmButton.textContent = 'Сбрасываю...';

            await TimerModule.resetStats();

            await updateStats();

            if (WeeklyStatsModule.isOpen()) {
                await WeeklyStatsModule.update();
            }

            closeResetConfirm();

            confirmButton.disabled = false;
            confirmButton.textContent = 'Да, сбросить';

            UIModule.showToast('Статистика сброшена', 'success');
        });

        actions.appendChild(cancelButton);
        actions.appendChild(confirmButton);

        box.appendChild(title);
        box.appendChild(text);
        box.appendChild(actions);

        modal.appendChild(box);
        document.body.appendChild(modal);

        resetConfirmModal = modal;
    }

    function closeResetConfirm() {
        UIModule.setHidden(resetConfirmModal, true);
    }

    function updateOpenModals() {
        updateStats();

        if (WeeklyStatsModule.isOpen()) {
            WeeklyStatsModule.update();
        }
    }

    return {
        openStats,
        closeStats,
        updateStats,
        updateOpenModals,
    };
})();

const NavbarModule = (() => {
    let navObserver = null;
    let appObserver = null;
    let navList = null;
    let lastCollapsedState = null;
    let findInterval = null;
    let ensureFrame = null;
    let tooltipElement = null;
    let tooltipShowTimer = null;
    let tooltipHideTimer = null;
    let tooltipAnchor = null;
    const tooltipShowDelayMs = 280;

    function getStatsNavList() {
        return (
            document.querySelector('.NavbarDesktop_navigationGroup__eexLF, ul[class*="NavbarDesktop_navigationGroup"]') ||
            document.querySelector('[class*="NavbarDesktop_root"] ul')
        );
    }

    function createSvgIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2');

        const bars = [
            ['3', '12', '4', '8'],
            ['10', '8', '4', '12'],
            ['17', '10', '4', '10'],
        ];

        svg.appendChild(path);

        for (const [x, y, width, height] of bars) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', width);
            rect.setAttribute('height', height);
            rect.setAttribute('rx', '1');
            svg.appendChild(rect);
        }

        return svg;
    }

    function createStatsButton(container) {
        const existingButton = document.getElementById('ym-stats-button');

        if (existingButton) return existingButton.closest('li');

        const li = document.createElement('li');
        li.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT';
        li.setAttribute('aria-current', 'false');

        const link = document.createElement('a');
        link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
        link.setAttribute('role', 'link');
        link.setAttribute('tabindex', '0');
        link.setAttribute('aria-disabled', 'false');
        link.setAttribute('aria-label', 'Статистика');
        link.setAttribute('data-ym-tooltip', 'Статистика');
        link.id = 'ym-stats-button';
        link.href = '#';

        link.addEventListener('click', (event) => {
            event.preventDefault();
            hideStatsTooltip();
            ModalModule.openStats();
        });

        link.addEventListener('mouseenter', () => scheduleStatsTooltip(link));
        link.addEventListener('mouseleave', hideStatsTooltip);
        link.addEventListener('focus', () => scheduleStatsTooltip(link));
        link.addEventListener('blur', hideStatsTooltip);

        const iconDiv = document.createElement('div');
        iconDiv.className = '_YzsXZGNK8KeaUFC4Ja1';
        iconDiv.appendChild(createSvgIcon());

        const textDiv = document.createElement('div');
        textDiv.className = 'nxMXCBiVfgH4oxds3f2y';

        const span = document.createElement('span');
        span.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR NavbarDesktop_title_animate__XLxaQ';
        span.setAttribute('title', 'Статистика');
        span.textContent = 'Статистика';

        textDiv.appendChild(span);

        link.appendChild(iconDiv);
        link.appendChild(textDiv);
        li.appendChild(link);

        const children = container.children;

        if (children.length > 0) {
            container.insertBefore(li, children[children.length - 1]);
        } else {
            container.appendChild(li);
        }

        syncSidebarState();

        return li;
    }

    function isOriginalNavbarCollapsed(list, statsLi) {
        const navbar = document.querySelector('[class*="Navbar_root"]');

        if (navbar) {
            return navbar.className.includes('Navbar_root_collapsed');
        }

        const originalItem = [...list.children].find((item) => {
            if (item === statsLi) return false;
            return item.querySelector('a .nxMXCBiVfgH4oxds3f2y span');
        });

        if (!originalItem) return false;

        const originalButton = originalItem.querySelector('a');
        const originalTitle = originalItem.querySelector('.nxMXCBiVfgH4oxds3f2y span');

        return Boolean(
            originalItem.className.includes('e1KYSvMXXv0FD4s_yCuw') ||
            originalButton?.className.includes('uw57VJ37U4rAAHDs0zJR') ||
            originalTitle?.className.includes('NavbarDesktop_title_collapsed')
        );
    }

    function setStatsTextCollapsed(statsButton, isCollapsed) {
        const textWrap = statsButton.querySelector('.nxMXCBiVfgH4oxds3f2y');
        const title = textWrap?.querySelector('span');

        statsButton.dataset.ymCollapsed = isCollapsed ? 'true' : 'false';

        if (textWrap) {
            if (isCollapsed) {
                textWrap.style.marginInlineStart = '0px';
                textWrap.style.maxWidth = '0px';
                textWrap.style.opacity = '0';
                textWrap.style.overflow = 'hidden';
            } else {
                textWrap.style.marginInlineStart = '';
                textWrap.style.maxWidth = '';
                textWrap.style.opacity = '';
                textWrap.style.overflow = '';
            }
        }

        if (title) {
            title.classList.toggle('NavbarDesktop_title_collapsed__IH9Bc', isCollapsed);

            if (isCollapsed) {
                title.style.opacity = '0';
                title.style.visibility = 'hidden';
                title.style.maxWidth = '0px';
                title.style.overflow = 'hidden';
                title.style.pointerEvents = 'none';
            } else {
                title.style.opacity = '';
                title.style.visibility = '';
                title.style.maxWidth = '';
                title.style.overflow = '';
                title.style.pointerEvents = '';
            }
        }
    }

    function createTooltipElement() {
        if (tooltipElement) return tooltipElement;

        tooltipElement = document.createElement('div');
        tooltipElement.id = 'ym-stats-tooltip';
        tooltipElement.setAttribute('role', 'tooltip');
        tooltipElement.textContent = 'Статистика';
        document.body.appendChild(tooltipElement);

        return tooltipElement;
    }

    function positionStatsTooltip(anchor) {
        if (!tooltipElement || !anchor) return;

        const rect = anchor.getBoundingClientRect();
        const gap = 6;

        tooltipElement.style.left = `${Math.round(rect.right + gap)}px`;
        tooltipElement.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
    }

    function clearStatsTooltipShowTimer() {
        if (tooltipShowTimer) {
            clearTimeout(tooltipShowTimer);
            tooltipShowTimer = null;
        }
    }

    function scheduleStatsTooltip(anchor) {
        clearStatsTooltipShowTimer();

        tooltipAnchor = anchor;

        if (!lastCollapsedState || !anchor || anchor.offsetParent === null) {
            return;
        }

        tooltipShowTimer = setTimeout(() => {
            tooltipShowTimer = null;

            if (tooltipAnchor !== anchor) return;
            if (!lastCollapsedState || !anchor || anchor.offsetParent === null) return;

            showStatsTooltip(anchor);
        }, tooltipShowDelayMs);
    }

    function showStatsTooltip(anchor) {
        if (!lastCollapsedState || !anchor || anchor.offsetParent === null) return;

        if (tooltipHideTimer) {
            clearTimeout(tooltipHideTimer);
            tooltipHideTimer = null;
        }

        const tooltip = createTooltipElement();

        positionStatsTooltip(anchor);
        tooltip.classList.add('ym-stats-tooltip--visible');
    }

    function hideStatsTooltip() {
        clearStatsTooltipShowTimer();

        tooltipAnchor = null;

        if (!tooltipElement) return;

        tooltipElement.classList.remove('ym-stats-tooltip--visible');

        if (tooltipHideTimer) clearTimeout(tooltipHideTimer);

        tooltipHideTimer = setTimeout(() => {
            if (tooltipElement && !tooltipElement.classList.contains('ym-stats-tooltip--visible')) {
                tooltipElement.remove();
                tooltipElement = null;
            }
        }, 180);
    }

    function syncSidebarState() {
        const statsButton = document.getElementById('ym-stats-button');

        if (!statsButton) return;

        const statsLi = statsButton.closest('li');
        const currentNavList = statsLi?.parentElement || navList || getStatsNavList();

        if (!statsLi || !currentNavList) return;

        const isCollapsed = isOriginalNavbarCollapsed(currentNavList, statsLi);

        lastCollapsedState = isCollapsed;

        statsLi.classList.toggle('e1KYSvMXXv0FD4s_yCuw', isCollapsed);
        statsButton.classList.toggle('uw57VJ37U4rAAHDs0zJR', isCollapsed);
        statsButton.classList.toggle('ym-sidebar-collapsed', isCollapsed);
        setStatsTextCollapsed(statsButton, isCollapsed);

        if (!isCollapsed) {
            hideStatsTooltip();
        }
    }

    function observeNavList(list) {
        if (!list || list === navList) return;

        if (navObserver) {
            navObserver.disconnect();
        }

        navList = list;

        navObserver = new MutationObserver((mutations) => {
            const onlyStatsButtonChanged = mutations.every((m) => {
                const target = m.target;
                return (
                    target === document.getElementById('ym-stats-button') ||
                    target === document.getElementById('ym-stats-button')?.closest('li') ||
                    target === document.getElementById('ym-stats-button')?.querySelector('.nxMXCBiVfgH4oxds3f2y') ||
                    target === document.getElementById('ym-stats-button')?.querySelector('.nxMXCBiVfgH4oxds3f2y span')
                );
            });

            if (onlyStatsButtonChanged) return;

            ensureButton();
            syncSidebarState();
        });

        navObserver.observe(list, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        });

        const navbar = document.querySelector('[class*="Navbar_root"]');

        if (navbar && !navbar._ymNavbarObserver) {
            const asideObserver = new MutationObserver(() => {
                syncSidebarState();
            });

            asideObserver.observe(navbar, {
                attributes: true,
                attributeFilter: ['class'],
            });

            navbar._ymNavbarObserver = asideObserver;
        }
    }

    function ensureButton() {
        const list = getStatsNavList();

        if (!list) return;

        observeNavList(list);

        if (!document.getElementById('ym-stats-button')) {
            createStatsButton(list);
        }

        syncSidebarState();
        updateVisibility(AppModule.getSettings());
    }

    function updateVisibility(settings) {
        const showNavbarButton = SettingsModule.readBool(settings, 'showNavbarButton', true);
        const statsButton = document.getElementById('ym-stats-button');

        if (!statsButton) return;

        const statsLi = statsButton.closest('li');

        if (!statsLi) return;

        statsLi.style.display = showNavbarButton ? '' : 'none';

        if (!showNavbarButton) {
            hideStatsTooltip();
        }
    }

    function scheduleEnsureButton() {
    if (ensureFrame !== null) return;

    ensureFrame = requestAnimationFrame(() => {
        ensureFrame = null;
        ensureButton();
    });
}

    function observeAppRoot() {
        if (appObserver || !document.body) return;

        appObserver = new MutationObserver((mutations) => {
            const shouldIgnore = mutations.every((mutation) => {
                const target = mutation.target;

                return (
                    target === tooltipElement ||
                    target?.id === 'ym-stats-tooltip' ||
                    target?.closest?.('#ym-stats-tooltip')
                );
            });

            if (shouldIgnore) return;

            scheduleEnsureButton();
        });

        appObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function init() {
        observeAppRoot();
        ensureButton();

        findInterval = setInterval(() => {
            ensureButton();
        }, 300);
    }

    function destroy() {
        if (navObserver) navObserver.disconnect();
        if (appObserver) appObserver.disconnect();
        if (findInterval) clearInterval(findInterval);
        if (ensureFrame !== null) cancelAnimationFrame(ensureFrame);

        hideStatsTooltip();

        navObserver = null;
        appObserver = null;
        navList = null;
        findInterval = null;
        ensureFrame = null;
    }

    return {
        init,
        destroy,
        ensureButton,
        syncSidebarState,
        updateVisibility,
    };
})();

const AppModule = (() => {
    let currentSettings = {};
    let displayInterval = null;
    let modalUpdateInterval = null;
    let statsRefreshTick = 0;
    let autosaveTick = 0;

    function getSettings() {
        return currentSettings;
    }

    function applySettings(settings) {
        TimerModule.updateDisplay(settings);
        NavbarModule.updateVisibility(settings);
    }

    async function init() {
        ThemeModule.init();

        const settingsStore = SettingsModule.getAddonSettings(AppConstants.addonName);

        currentSettings = settingsStore.getCurrent();

        settingsStore.onChange((nextSettings) => {
            currentSettings = nextSettings;
            applySettings(currentSettings);
        });

        await DBModule.migrateLegacyTime();
        await TimerModule.loadTotalTime();

        PlayerObserverModule.init();
        NavbarModule.init();

        applySettings(currentSettings);

        displayInterval = setInterval(() => {
            TimerModule.updateDisplay(currentSettings);

            statsRefreshTick++;
            autosaveTick++;

            if (autosaveTick >= AppConstants.autosaveIntervalSeconds) {
                autosaveTick = 0;
                TimerModule.autosaveCurrentSession();
            }

            if (statsRefreshTick >= 10) {
                statsRefreshTick = 0;
                TimerModule.refreshStatsCache().then(() => {
                    TimerModule.updateDisplay(currentSettings);
                });
            }
        }, 1000);

        modalUpdateInterval = setInterval(() => {
            ModalModule.updateOpenModals();
        }, 1000);

        window.addEventListener('beforeunload', () => {
            TimerModule.stop();
            TimerModule.saveCurrentSessionAsPrevious();
        });

        window.addEventListener('pagehide', () => {
            TimerModule.stop();
            TimerModule.saveCurrentSessionAsPrevious();
        });
    }

    function destroy() {
        if (displayInterval) clearInterval(displayInterval);
        if (modalUpdateInterval) clearInterval(modalUpdateInterval);

        PlayerObserverModule.destroy();
        NavbarModule.destroy();
        ThemeModule.destroy();

        displayInterval = null;
        modalUpdateInterval = null;
    }

    return {
        init,
        destroy,
        getSettings,
    };
})();

AppModule.init().catch((error) => {
    console.warn('[YandexMusicTime] Ошибка инициализации:', error);
});
