(() => {
var __defProp = Object.defineProperty;
	var __esmMin = (fn, res, err) => () => {
		if (err) throw err[0];
		try {
			return fn && (res = fn(fn = 0)), res;
		} catch (e) {
			throw err = [e], e;
		}
	};
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
		if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
		return target;
	};
	// src/constants.ts
	var STREAK_KEY, DAY_MS, SVG_NS, DB_NAME, STORE_NAME, LEGACY_KEY, PREV_SESSION_KEY, DAY_PROGRESS_MAX_SECONDS;
	var init_constants = __esmMin((() => {
		STREAK_KEY = "yandexMusicStreak.v1";
		DAY_MS = 864e5;
		SVG_NS = "http://www.w3.org/2000/svg";
		DB_NAME = "YandexMusicStatsDB";
		STORE_NAME = "sessions";
		LEGACY_KEY = "yandexMusicTotalTime";
		PREV_SESSION_KEY = "yandexMusicPreviousSessionTime";
		DAY_PROGRESS_MAX_SECONDS = 86400;
	}));
	// src/streak.ts
	init_constants();
	/** Returns 'YYYY-MM-DD' for a local date */
	function todayString(now = /* @__PURE__ */ new Date()) {
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	}
	/** Converts a 'YYYY-MM-DD' string to a UTC day-index (ms / DAY_MS), or null if invalid */
	function parseDateToDay(date) {
		if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
		const [y, m, d] = date.split("-").map(Number);
		const utc = new Date(Date.UTC(y, m - 1, d));
		return utc.toISOString().slice(0, 10) === date ? utc.getTime() / DAY_MS : null;
	}
	/** Returns updated streak state after recording a visit on `visitDate` */
	function updateStreak(current, visitDate) {
		const visitDay = parseDateToDay(visitDate);
		if (visitDay === null) throw new TypeError("Invalid visit date");
		const state = current?.version === 1 && Number.isSafeInteger(current.count) && current.count > 0 && Number.isSafeInteger(current.best) && current.best >= current.count && parseDateToDay(current.lastDate) !== null ? current : {
			version: 1,
			count: 0,
			best: 0,
			lastDate: null
		};
		const lastDay = state.lastDate !== null ? parseDateToDay(state.lastDate) : null;
		if (lastDay !== null && visitDay <= lastDay) return state;
		const newCount = lastDay !== null && visitDay - lastDay === 1 ? Math.min(2 ** 53 - 1, state.count + 1) : 1;
		return {
			version: 1,
			count: newCount,
			best: Math.max(state.best, newCount),
			lastDate: visitDate
		};
	}
	/** Returns visual level info for a given number of streak days */
	function getFlameLevel(days) {
		if (!Number.isSafeInteger(days) || days < 0) throw new TypeError("Days must be a non-negative safe integer");
		if (days < 10) return {
			min: 1,
			max: 9,
			level: 1,
			kind: 0,
			rank: 0,
			color: days ? "#ff9248" : "#808080",
			inner: "#ffdc83"
		};
		if (days < 50) return {
			min: 10,
			max: 49,
			level: 2,
			kind: 1,
			rank: 0,
			color: "#ff5c48",
			inner: "#ffb65c"
		};
		if (days < 100) return {
			min: 50,
			max: 99,
			level: 3,
			kind: 2,
			rank: 0,
			color: "#c18aff",
			inner: "#f3bfff"
		};
		const hundreds = Math.floor(days / 100);
		const hue = hundreds === 1 ? 192 : (252 + (hundreds - 2) * 137.508) % 360;
		return {
			min: hundreds * 100,
			max: hundreds * 100 + 99,
			level: hundreds + 3,
			kind: 3 + (hundreds - 1) % 4,
			rank: hundreds,
			color: `hsl(${hue.toFixed(3)} 92% 70%)`,
			inner: `hsl(${hue.toFixed(3)} 100% 89%)`
		};
	}
	/** Builds the flame SVG icon for a given number of days */
	function buildFlameIcon(doc, days) {
		const lvl = getFlameLevel(days);
		const svg = doc.createElementNS(SVG_NS, "svg");
		svg.setAttribute("viewBox", "0 0 32 36");
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		const addPath = (attrs) => {
			const el = doc.createElementNS(SVG_NS, "path");
			for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
			svg.appendChild(el);
		};
		if (lvl.kind >= 4) addPath({
			d: "M5 7 2 4m25 3 3-3M2 16H0m30 0h2",
			fill: "none",
			stroke: lvl.color,
			"stroke-width": 1.5,
			"stroke-linecap": "round"
		});
		addPath({
			d: [
				"M18 3c1 8-7 9-6 15-3-1-4-4-3-6C1 20 6 33 16 33c12 0 17-14 8-23 0 5-2 7-4 8 3-7 1-11-2-15Z",
				"M17 2c3 8-5 11-3 16 2-1 4-4 4-7 8 5 12 11 8 17-5 9-19 6-21-3-2-7 2-12 5-16-1 5 0 7 2 8-2-6 5-9 5-15Z",
				"M17 2c4 7 1 11-3 15-1-4-3-5-5-6 1 6-6 9-4 15 2 10 19 11 23 0 2-6-2-12-6-16 1 5-1 8-4 9 4-7 3-11-1-17Z",
				"M17 3c0 7-6 9-5 15-3-2-4-5-3-8-7 7-8 14-3 19 5 6 17 6 22-2 3-6-1-12-4-15 0 5-2 7-5 8 2-6 2-11-2-17Z",
				"M16 3c3 6-1 8-1 12 4-2 5-5 5-8 4 4 5 8 3 13 4-2 5-5 4-7 8 13 1 21-11 21C3 34-3 21 7 11c-1 6 1 8 4 9-3-8 5-10 5-17Z",
				"M16 2c4 6 6 9 4 14 4-1 5-4 4-8 8 9 7 18 1 23-5 5-15 4-20-2-4-6-2-13 2-17 0 4 2 6 5 6-2-7 5-9 4-16Z",
				"M16 2c5 5 7 11 4 16 4-1 5-4 5-7 8 10 5 20-5 23-10 3-18-4-17-12 1-5 4-8 7-11-2 6 0 8 3 9-3-8 5-11 3-18Z"
			][lvl.kind],
			fill: lvl.color
		});
		addPath({
			d: "M17 18c2 4-2 5-1 8 2-1 3-2 3-4 5 5 3 10-2 10-6 0-9-6-5-11 0 3 1 4 2 4-1-3 2-4 3-7Z",
			fill: lvl.inner
		});
		if (lvl.kind >= 2) addPath({
			d: "m5 2 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z",
			fill: lvl.inner
		});
		if (lvl.rank >= 2) addPath({
			d: "m26 0 1.2 2.8L30 4l-2.8 1.2L26 8l-1.2-2.8L22 4l2.8-1.2Z",
			fill: lvl.color
		});
		if (lvl.kind === 5) addPath({
			d: "m11 11 2-5 3 3 3-3 2 5",
			fill: "none",
			stroke: lvl.inner,
			"stroke-width": 1.5,
			"stroke-linejoin": "round"
		});
		if (lvl.kind === 6) addPath({
			d: "M8 29c4 5 12 5 16 0",
			fill: "none",
			stroke: lvl.inner,
			"stroke-width": 1.5,
			"stroke-linecap": "round"
		});
		return svg;
	}
	function createStreakManager(win, onChange, logger = console) {
		let state = null;
		let previewDays = null;
		let active = false;
		let prevPublicApi;
		let lastVisitDate = null;
		let streakEl = null;
		let lastRenderKey = null;
		function readState() {
			try {
				return JSON.parse(win.localStorage.getItem("yandexMusicStreak.v1") || "null");
			} catch {
				return null;
			}
		}
		function recordVisit(force = false) {
			if (!active || win.document.visibilityState === "hidden") return;
			const today = todayString();
			if (force !== true && lastVisitDate === today) return;
			const prev = readState();
			const updated = updateStreak(prev, today);
			lastVisitDate = today;
			if (JSON.stringify(prev) !== JSON.stringify(updated)) try {
				win.localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
			} catch (e) {
				logger.warn("Не удалось сохранить стрик", e);
			}
			const changed = JSON.stringify(state) !== JSON.stringify(updated);
			state = updated;
			if (changed) onChange();
		}
		const forceVisit = () => recordVisit(true);
		const onStorage = (e) => {
			if (e.key === "yandexMusicStreak.v1" || e.key === null) forceVisit();
		};
		const publicApi = Object.freeze({
			preview(days) {
				getFlameLevel(days);
				previewDays = days;
				onChange();
				return {
					days,
					...getFlameLevel(days),
					preview: true
				};
			},
			restore() {
				previewDays = null;
				onChange();
				return publicApi.status();
			},
			status() {
				return {
					...state,
					previewDays,
					level: getFlameLevel(previewDays ?? state?.count ?? 0)
				};
			},
			levels(count = 8) {
				if (!Number.isInteger(count) || count < 1 || count > 100) throw new TypeError("Use 1–100 levels");
				return [
					1,
					10,
					50,
					...Array.from({ length: count }, (_, i) => (i + 1) * 100)
				].map((days) => ({
					days,
					...getFlameLevel(days)
				}));
			}
		});
		function onPreviewEvent(e) {
			const detail = e.detail;
			try {
				if (detail === null || detail === void 0) publicApi.restore();
				else publicApi.preview(detail);
			} catch (e) {
				logger.warn("Предпросмотр огонька: укажите целое число дней от 0", e);
			}
		}
		return {
			start() {
				active = true;
				state = readState();
				prevPublicApi = win.YMTimeStreak;
				win.YMTimeStreak = publicApi;
				win.addEventListener("focus", forceVisit);
				win.addEventListener("storage", onStorage);
				win.document.addEventListener("visibilitychange", forceVisit);
				win.document.addEventListener("ymtime:streak:preview", onPreviewEvent);
				recordVisit();
			},
			visit: recordVisit,
			getStats() {
				return {
					current: state?.count ?? 0,
					best: state?.best ?? 0
				};
			},
			exportState() {
				return state ? { ...state } : null;
			},
			restoreState(newState) {
				if (newState) win.localStorage.setItem(STREAK_KEY, JSON.stringify(newState));
				else win.localStorage.removeItem(STREAK_KEY);
				state = newState ? { ...newState } : null;
				lastVisitDate = null;
				previewDays = null;
				recordVisit();
				onChange();
			},
			render(container, format, showLabel) {
				const days = previewDays ?? state?.count ?? 0;
				streakEl ??= (() => {
					const el = win.document.createElement("span");
					el.className = "ym-streak";
					el.setAttribute("role", "img");
					return el;
				})();
				const key = `${days}:${previewDays !== null}:${format}:${showLabel}`;
				if (lastRenderKey !== key) {
					lastRenderKey = key;
					const lvl = getFlameLevel(days);
					const countEl = win.document.createElement("span");
					countEl.className = "ym-streak__count";
					countEl.textContent = String(days);
					streakEl.dataset.format = format;
					if (format === "text") {
						streakEl.replaceChildren(showLabel ? win.document.createTextNode("Дней подряд: ") : win.document.createTextNode(""), countEl);
						streakEl.removeAttribute("role");
					} else {
						streakEl.replaceChildren(buildFlameIcon(win.document, days), countEl);
						streakEl.setAttribute("role", "img");
					}
					streakEl.dataset.level = String(lvl.level);
					streakEl.dataset.preview = String(previewDays !== null);
					streakEl.style.setProperty("--ym-streak-color", lvl.color);
					const ariaLabel = `Серия ежедневных входов: ${days}. Уровень ${lvl.level}${previewDays === null ? "" : " · Предпросмотр"}`;
					streakEl.setAttribute("aria-label", ariaLabel);
					streakEl.title = ariaLabel;
				}
				if (streakEl.parentElement !== container) container.appendChild(streakEl);
			},
			hide() {
				streakEl?.remove();
			},
			destroy() {
				active = false;
				win.removeEventListener("focus", forceVisit);
				win.removeEventListener("storage", onStorage);
				win.document.removeEventListener("visibilitychange", forceVisit);
				win.document.removeEventListener("ymtime:streak:preview", onPreviewEvent);
				if (win.YMTimeStreak === publicApi) {
					if (prevPublicApi === void 0) delete win.YMTimeStreak;
					else win.YMTimeStreak = prevPublicApi;
				}
				streakEl?.remove();
			},
			get api() {
				return publicApi;
			}
		};
	}
	// src/db.ts
	var db_exports = /* @__PURE__ */ __exportAll({
		addSession: () => addSession,
		clearAllSessions: () => clearAllSessions,
		closeDB: () => closeDB,
		getAllSessions: () => getAllSessions,
		invalidateCache: () => invalidateCache,
		migrateLegacyTime: () => migrateLegacyTime,
		openDB: () => openDB,
		readForBackup: () => readForBackup,
		restoreSessionsToDB: () => restoreSessionsToDB,
		waitForWrites: () => waitForWrites
	});
	function invalidateCache() {
		cacheVersion++;
		cachedSessions = null;
		cacheExpiry = 0;
		fetchingPromise = null;
	}
	function openDB() {
		if (dbPromise) return dbPromise;
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, 1);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains("sessions")) {
					const store = db.createObjectStore(STORE_NAME, {
						keyPath: "id",
						autoIncrement: true
					});
					store.createIndex("timestamp", "timestamp");
					store.createIndex("date", "date");
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => {
				dbPromise = null;
				reject(req.error);
			};
		});
		return dbPromise;
	}
	async function writeSession(durationSeconds) {
		if (durationSeconds <= 0) return;
		const db = await openDB();
		const timestamp = Date.now();
		const date = new Date(timestamp).toISOString().slice(0, 10);
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		await new Promise((resolve, reject) => {
			store.add({
				timestamp,
				duration: durationSeconds,
				date
			});
			tx.oncomplete = () => resolve();
			tx.onerror = tx.onabort = () => reject(tx.error);
		});
	}
	function addSession(durationSeconds) {
		invalidateCache();
		const p = writeSession(durationSeconds).catch(() => {});
		pendingWrites.add(p);
		p.finally(() => {
			pendingWrites.delete(p);
			invalidateCache();
		});
		return p;
	}
	async function waitForWrites() {
		await Promise.all([...pendingWrites]);
	}
	async function fetchAllFromDB() {
		try {
			const store = (await openDB()).transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
			return new Promise((resolve) => {
				const req = store.getAll();
				req.onsuccess = () => resolve(req.result || []);
				req.onerror = () => resolve([]);
			});
		} catch (e) {
			console.warn("[YandexMusicTime] Не удалось прочитать сессии:", e);
			return [];
		}
	}
	async function getAllSessions() {
		await Promise.allSettled([...pendingWrites]);
		if (cachedSessions && Date.now() < cacheExpiry) return cachedSessions;
		if (fetchingPromise) return fetchingPromise;
		const snap = cacheVersion;
		fetchingPromise = fetchAllFromDB().then((rows) => {
			if (cacheVersion === snap) {
				cachedSessions = rows;
				cacheExpiry = Date.now() + 1e4;
			}
			fetchingPromise = null;
			return rows;
		});
		return fetchingPromise;
	}
	async function readForBackup() {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const req = tx.objectStore(STORE_NAME).getAll();
			tx.oncomplete = () => resolve(req.result);
			tx.onerror = tx.onabort = () => reject(tx.error || /* @__PURE__ */ new Error("Не удалось прочитать статистику"));
		});
	}
	async function clearAllSessions() {
		invalidateCache();
		try {
			const store = (await openDB()).transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
			await new Promise((resolve, reject) => {
				const req = store.clear();
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
			localStorage.removeItem(LEGACY_KEY);
			localStorage.removeItem(PREV_SESSION_KEY);
			invalidateCache();
		} catch (e) {
			console.warn("[YandexMusicTime] Не удалось очистить статистику:", e);
		}
	}
	async function restoreSessionsToDB(db, sessions) {
		await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			tx.oncomplete = () => resolve();
			tx.onerror = tx.onabort = () => reject(tx.error || /* @__PURE__ */ new Error("Не удалось восстановить базу статистики"));
			const store = tx.objectStore(STORE_NAME);
			store.clear();
			for (const s of sessions) store.add({
				timestamp: s.timestamp,
				date: s.date,
				duration: s.duration
			});
		});
	}
	/** Migrates old single-key localStorage value into IndexedDB (runs once) */
	async function migrateLegacyTime() {
		const raw = localStorage.getItem(LEGACY_KEY);
		if (!raw) return;
		const seconds = parseInt(raw, 10);
		if (seconds <= 0) return;
		try {
			const store = (await openDB()).transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
			if ((await new Promise((resolve) => {
				const req = store.getAll();
				req.onsuccess = () => resolve(req.result || []);
				req.onerror = () => resolve([]);
			})).length === 0) await new Promise((resolve, reject) => {
				const req = store.add({
					timestamp: 0,
					duration: seconds,
					date: "1970-01-01"
				});
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch (e) {
			console.warn("[YandexMusicTime] Ошибка миграции:", e);
		}
		localStorage.removeItem(LEGACY_KEY);
	}
	function closeDB(logger) {
		dbPromise?.then((db) => db.close()).catch((e) => logger?.warn("Не удалось закрыть базу статистики", e));
	}
	var dbPromise, pendingWrites, cacheVersion, cachedSessions, cacheExpiry, fetchingPromise;
	var init_db = __esmMin((() => {
		init_constants();
		dbPromise = null;
		pendingWrites = /* @__PURE__ */ new Set();
		cacheVersion = 0;
		cachedSessions = null;
		cacheExpiry = 0;
		fetchingPromise = null;
	}));
	// src/stats.ts
	var stats_exports = /* @__PURE__ */ __exportAll({
		DAY_PROGRESS_MAX_SECONDS: () => DAY_PROGRESS_MAX_SECONDS,
		formatDateShort: () => formatDateShort,
		formatTime: () => formatTime,
		formatTimePadded: () => formatTimePadded,
		getLatestCompletedSession: () => getLatestCompletedSession,
		getPeriodBoundaries: () => getPeriodBoundaries,
		getStatsFromSessions: () => getStatsFromSessions,
		getWeekStatsFromSessions: () => getWeekStatsFromSessions
	});
	function getPeriodBoundaries(now = /* @__PURE__ */ new Date()) {
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
		const dow = now.getDay();
		const mondayOffset = dow === 0 ? 6 : dow - 1;
		const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset, 0, 0, 0, 0).getTime();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
		const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
		return {
			startOfDay,
			startOfWeek,
			endOfWeek: startOfWeek + 7 * DAY_MS,
			startOfMonth,
			startOfYear
		};
	}
	/** Day-of-week label (Mon = 0) */
	function dayLabel(index) {
		return [
			"Понедельник",
			"Вторник",
			"Среда",
			"Четверг",
			"Пятница",
			"Суббота",
			"Воскресенье"
		][index] || "";
	}
	function formatDateShort(date) {
		return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
	}
	function getStatsFromSessions(sessions) {
		const now = /* @__PURE__ */ new Date();
		const nowMs = now.getTime();
		const b = getPeriodBoundaries(now);
		const cached = aggregateCache.get(sessions);
		if (cached?.day === b.startOfDay) return { ...cached.value };
		let total = 0, year = 0, month = 0, week = 0, day = 0;
		for (const s of sessions) {
			const dur = Number(s.duration) || 0;
			const ts = Number(s.timestamp) || 0;
			if (dur <= 0) continue;
			total += dur;
			if (ts <= 0 || ts > nowMs) continue;
			if (ts >= b.startOfYear) year += dur;
			if (ts >= b.startOfMonth) month += dur;
			if (ts >= b.startOfWeek) week += dur;
			if (ts >= b.startOfDay) day += dur;
		}
		const value = {
			total,
			year,
			month,
			week,
			day
		};
		aggregateCache.set(sessions, {
			day: b.startOfDay,
			value
		});
		return { ...value };
	}
	function getWeekStatsFromSessions(sessions) {
		const now = /* @__PURE__ */ new Date();
		const nowMs = now.getTime();
		const b = getPeriodBoundaries(now);
		const cached = weekCache.get(sessions);
		if (cached?.day === b.startOfDay) return cloneWeekStats(cached.value);
		const days = Array.from({ length: 7 }, (_, i) => {
			const ts = b.startOfWeek + i * DAY_MS;
			const date = new Date(ts);
			return {
				index: i,
				date,
				timestamp: ts,
				label: dayLabel(i),
				dateLabel: formatDateShort(date),
				duration: 0,
				isToday: date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
			};
		});
		for (const s of sessions) {
			const dur = Number(s.duration) || 0;
			const ts = Number(s.timestamp) || 0;
			if (dur <= 0 || ts <= 0 || ts > nowMs || ts < b.startOfWeek || ts >= b.endOfWeek) continue;
			const idx = Math.floor((ts - b.startOfWeek) / DAY_MS);
			if (days[idx]) days[idx].duration += dur;
		}
		const value = {
			days,
			total: days.reduce((acc, d) => acc + d.duration, 0),
			startDate: new Date(b.startOfWeek),
			endDate: /* @__PURE__ */ new Date(b.endOfWeek - 1)
		};
		weekCache.set(sessions, {
			day: b.startOfDay,
			value
		});
		return cloneWeekStats(value);
	}
	function cloneWeekStats(ws) {
		return {
			...ws,
			days: ws.days.map((d) => ({ ...d }))
		};
	}
	/** Returns the duration of the most recent completed session */
	function getLatestCompletedSession(sessions) {
		let latest = null;
		for (const s of sessions) if (s.timestamp > 0 && s.duration > 0 && (!latest || s.timestamp > latest.timestamp)) latest = s;
		return latest?.duration || 0;
	}
	/** Formats seconds as "Xч Yм Zс" or "Xч Yм" */
	function formatTime(seconds, showSeconds = true) {
		const s = Math.max(0, Number(seconds) || 0);
		const h = Math.floor(s / 3600);
		const m = Math.floor(s % 3600 / 60);
		const sec = s % 60;
		return showSeconds ? `${h}ч ${m}м ${String(sec).padStart(2, "0")}с` : `${h}ч ${m}м`;
	}
	/** Formats seconds as "XX ч YY м ZZ с" (zero-padded) */
	function formatTimePadded(seconds) {
		const s = Math.max(0, Number(seconds) || 0);
		const h = Math.floor(s / 3600);
		const m = Math.floor(s % 3600 / 60);
		const sec = s % 60;
		return `${String(h).padStart(2, "0")} ч ${String(m).padStart(2, "0")} м ${String(sec).padStart(2, "0")} с`;
	}
	var aggregateCache, weekCache;
	var init_stats = __esmMin((() => {
		init_constants();
		aggregateCache = /* @__PURE__ */ new WeakMap();
		weekCache = /* @__PURE__ */ new WeakMap();
	}));
	// src/timer.ts
	init_constants();
	init_db();
	init_stats();
	function positionClass(pos) {
		return {
			1: "ym-timer--top-center",
			2: "ym-timer--top-left",
			3: "ym-timer--bottom-left"
		}[pos] ?? "ym-timer--top-center";
	}
	function statLabel(type) {
		return {
			2: "За год",
			3: "За месяц",
			4: "За неделю",
			5: "За день",
			6: "Сессия"
		}[type] ?? "Время";
	}
	function createTimerManager(streak, logger, isDestroyed) {
		const state = {
			totalTime: 0,
			isPlaying: false,
			startTime: null,
			timerElement: null,
			currentSessionTime: 0,
			previousSessionTime: parseInt(localStorage.getItem("yandexMusicPreviousSessionTime") || "0", 10) || 0,
			statsCache: {
				total: 0,
				year: 0,
				month: 0,
				week: 0,
				day: 0
			}
		};
		function liveElapsed() {
			if (!state.isPlaying || !state.startTime) return 0;
			return Math.floor((Date.now() - state.startTime) / 1e3);
		}
		function currentSessionSeconds() {
			return state.currentSessionTime + liveElapsed();
		}
		function totalSeconds() {
			return state.totalTime + liveElapsed();
		}
		function flushElapsed(opts) {
			if (!state.startTime) return 0;
			const now = Date.now();
			const elapsed = Math.floor((now - state.startTime) / 1e3);
			if (elapsed < opts.minSeconds) return 0;
			addSession(elapsed).catch((e) => logger.error?.("Не удалось сохранить время", e));
			state.totalTime += elapsed;
			state.currentSessionTime += elapsed;
			state.statsCache.total += elapsed;
			state.statsCache.year += elapsed;
			state.statsCache.month += elapsed;
			state.statsCache.week += elapsed;
			state.statsCache.day += elapsed;
			state.startTime = opts.continuePlaying && state.isPlaying ? now : null;
			return elapsed;
		}
		function getStatValue(type) {
			const live = liveElapsed();
			switch (String(type)) {
				case "2": return state.statsCache.year + live;
				case "3": return state.statsCache.month + live;
				case "4": return state.statsCache.week + live;
				case "5": return state.statsCache.day + live;
				case "6": return currentSessionSeconds();
				default: return totalSeconds();
			}
		}
		function updateDisplay(s) {
			if (isDestroyed()) return;
			const showTimer = s.showTimer;
			const showStreak = s.showStreak;
			if (!showTimer && !showStreak) {
				state.timerElement?.remove();
				state.timerElement = null;
				return;
			}
			if (!state.timerElement) {
				state.timerElement = document.createElement("div");
				state.timerElement.id = "yandex-music-timer";
				document.body.appendChild(state.timerElement);
			}
			const el = state.timerElement;
			const cls = positionClass(s.timerPosition);
			if (!el.classList.contains(cls)) {
				el.classList.remove("ym-timer--top-center", "ym-timer--top-left", "ym-timer--bottom-left");
				el.classList.add(cls);
			}
			const color = s.timerColor ? s.customColor : "var(--ym-controls-color-primary-text-enabled_variant, #ffffff)";
			if (el.style.getPropertyValue("--ym-timer-color") !== color) el.style.setProperty("--ym-timer-color", color);
			const fontSizePx = `${s.fontSize}px`;
			if (el.style.getPropertyValue("--ym-timer-font-size") !== fontSizePx) el.style.setProperty("--ym-timer-font-size", fontSizePx);
			let timeSpan = el.querySelector(".ym-time-value");
			if (showTimer) {
				if (!timeSpan) {
					timeSpan = document.createElement("span");
					timeSpan.className = "ym-time-value";
					el.prepend(timeSpan);
				}
				const text = `${s.showIcon ? "🎵 " : ""}${s.showTimerLabel ? `${statLabel(s.timerStatType)}: ` : ""}${formatTime(getStatValue(s.timerStatType), s.showSeconds)}`;
				if (timeSpan.textContent !== text) timeSpan.textContent = text;
			} else {
				timeSpan?.remove();
				timeSpan = null;
			}
			let sep = el.querySelector(".ym-time-separator");
			if (showTimer && showStreak) {
				if (!sep) {
					sep = document.createElement("span");
					sep.className = "ym-time-separator";
					sep.textContent = " | ";
					sep.setAttribute("aria-hidden", "true");
				}
				if (timeSpan && timeSpan.nextElementSibling !== sep) timeSpan.after(sep);
			} else sep?.remove();
			const format = s.streakFormat === "flame" ? "flame" : "text";
			if (showStreak) streak.render(el, format, s.showTimerLabel);
			else streak.hide();
		}
		return {
			state,
			async loadTotalTime() {
				const sessions = await getAllSessions();
				const agg = getStatsFromSessions(sessions);
				state.totalTime = agg.total;
				state.statsCache = agg;
				state.previousSessionTime ||= getLatestCompletedSession(sessions);
				return agg.total;
			},
			async refreshStatsCache() {
				const sessions = await getAllSessions();
				if (isDestroyed()) return;
				const agg = getStatsFromSessions(sessions);
				state.statsCache = agg;
				state.totalTime = agg.total;
			},
			start() {
				if (!state.isPlaying) {
					state.isPlaying = true;
					state.startTime = Date.now();
				}
			},
			stop() {
				if (state.isPlaying) {
					flushElapsed({
						continuePlaying: false,
						minSeconds: 1
					});
					state.isPlaying = false;
					state.startTime = null;
				}
			},
			autosaveCurrentSession() {
				return state.isPlaying ? flushElapsed({
					continuePlaying: true,
					minSeconds: 30
				}) : 0;
			},
			async getStats() {
				const agg = getStatsFromSessions(await getAllSessions());
				state.statsCache = agg;
				const live = liveElapsed();
				return {
					total: agg.total + live,
					year: agg.year + live,
					month: agg.month + live,
					week: agg.week + live,
					day: agg.day + live,
					currentSession: currentSessionSeconds(),
					previousSession: state.previousSessionTime
				};
			},
			async getWeeklyStats() {
				const week = getWeekStatsFromSessions(await getAllSessions());
				const live = liveElapsed();
				if (live > 0) {
					const todayIdx = week.days.findIndex((d) => d.isToday);
					if (todayIdx >= 0) {
						week.days[todayIdx].duration += live;
						week.total += live;
					}
				}
				return week;
			},
			async resetStats() {
				await clearAllSessions();
				state.totalTime = 0;
				state.currentSessionTime = 0;
				state.previousSessionTime = 0;
				state.statsCache = {
					total: 0,
					year: 0,
					month: 0,
					week: 0,
					day: 0
				};
				state.startTime = state.isPlaying ? Date.now() : null;
			},
			updateDisplay,
			saveCurrentSessionAsPrevious() {
				localStorage.setItem(PREV_SESSION_KEY, String(currentSessionSeconds()));
			},
			isPlaying() {
				return state.isPlaying;
			},
			setPlayingFromUI(playing) {
				if (playing) this.start();
				else this.stop();
			},
			async flushForBackup() {
				flushElapsed({
					continuePlaying: state.isPlaying,
					minSeconds: 1
				});
				await waitForWrites();
			}
		};
	}
	// src/theme.ts
	var ATTR = "data-ym-addon-theme";
	function createThemeDetector(requestFrame, cancelFrame, setInterval, clearInterval) {
		let probeEl = null;
		let observer = null;
		let intervalId = null;
		let rafId = null;
		let currentTheme = null;
		function getProbe() {
			if (!probeEl?.isConnected) {
				probeEl = document.createElement("span");
				probeEl.setAttribute("aria-hidden", "true");
				probeEl.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;color:var(--ym-controls-color-primary-text-enabled_variant,rgb(255,255,255))";
				(document.body || document.documentElement).appendChild(probeEl);
			}
			return probeEl;
		}
		function parseRgb(color) {
			const m = color.match(/rgba?\(\s*([\d.]+)%?[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?/i);
			if (m) {
				const scale = color.includes("%") ? 2.55 : 1;
				return [
					Number(m[1]) * scale,
					Number(m[2]) * scale,
					Number(m[3]) * scale
				];
			}
			const m2 = color.match(/color\(\s*(?:srgb|display-p3)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
			if (m2) return [
				Number(m2[1]) * 255,
				Number(m2[2]) * 255,
				Number(m2[3]) * 255
			];
			return null;
		}
		function relativeLuminance([r, g, b]) {
			const [rs, gs, bs] = [
				r,
				g,
				b
			].map((c) => {
				const v = Math.min(255, Math.max(0, c)) / 255;
				return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
			});
			return .2126 * rs + .7152 * gs + .0722 * bs;
		}
		function detectTheme() {
			const color = getComputedStyle(getProbe()).color;
			const rgb = parseRgb(color);
			return rgb ? relativeLuminance(rgb) < .5 ? "light" : "dark" : currentTheme || "dark";
		}
		function applyTheme(theme) {
			const root = document.documentElement;
			if (currentTheme !== theme || root.getAttribute(ATTR) !== theme) {
				currentTheme = theme;
				root.setAttribute(ATTR, theme);
			}
		}
		function onFrame() {
			rafId = null;
			applyTheme(detectTheme());
		}
		function scheduleUpdate() {
			if (rafId === null) rafId = requestFrame(onFrame);
		}
		function init() {
			scheduleUpdate();
			observer = new MutationObserver(scheduleUpdate);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: [
					"class",
					"style",
					"data-theme"
				]
			});
			if (document.body) observer.observe(document.body, {
				attributes: true,
				attributeFilter: [
					"class",
					"style",
					"data-theme"
				]
			});
			intervalId = setInterval(scheduleUpdate, 1e3);
		}
		function destroy() {
			observer?.disconnect();
			if (intervalId !== null) clearInterval(intervalId);
			if (rafId !== null) cancelFrame(rafId);
			probeEl?.remove();
			observer = null;
			intervalId = null;
			rafId = null;
			probeEl = null;
			currentTheme = null;
			document.documentElement.removeAttribute(ATTR);
		}
		return {
			init,
			destroy
		};
	}
	// src/dom-utils.ts
	init_constants();
	init_stats();
	function el(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== void 0) node.textContent = text;
		return node;
	}
	function svgEl(tag, attrs = {}) {
		const node = document.createElementNS(SVG_NS, tag);
		for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
		return node;
	}
	function buildIcon(type) {
		const svg = svgEl("svg", {
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "1.75",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"aria-hidden": "true",
			focusable: "false"
		});
		const paths = type === "week" ? [
			"M7 3v4m10-4v4",
			"M4 10h16",
			"M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
			"M8 14h2m4 0h2m-8 3h2"
		] : ["M5 19V12m7 7V5m7 14V9", "M3 21h18"];
		for (const d of paths) svg.appendChild(svgEl("path", { d }));
		return svg;
	}
	function createTitleIcon(type) {
		const wrap = el("div", `ym-modal__title-icon ym-modal__title-icon--${type === "week" ? "week" : "stats"}`);
		wrap.appendChild(buildIcon(type));
		return wrap;
	}
	function createButton(text, variant = "default") {
		const btn = el("button", "ym-ui-button", text);
		if (variant === "danger") btn.classList.add("ym-ui-button--danger");
		if (variant === "ghost") btn.classList.add("ym-ui-button--ghost");
		return btn;
	}
	function createCloseButton(onClick) {
		const btn = el("button", "ym-modal__close");
		btn.setAttribute("aria-label", "Закрыть");
		btn.type = "button";
		const svg = svgEl("svg", {
			viewBox: "0 0 20 20",
			"aria-hidden": "true"
		});
		svg.appendChild(svgEl("use", { href: "/icons/sprite.svg#close_xxs" }));
		btn.appendChild(svg);
		btn.addEventListener("click", onClick);
		return btn;
	}
	function createActions(extraClass = "") {
		return el("div", `ym-modal__actions ${extraClass}`.trim());
	}
	function fitModal(overlay, box, onCleanup, listenFn, requestFrame, cancelFrame) {
		let rafId = null;
		function measure() {
			rafId = null;
			if (!overlay.offsetHeight) return;
			const style = getComputedStyle(overlay);
			const w = overlay.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
			const h = overlay.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
			const scale = Math.max(0, Math.min(1, w / box.offsetWidth, h / box.offsetHeight));
			box.style.setProperty("--ym-modal-scale", String(scale));
		}
		function schedule() {
			if (rafId === null) rafId = requestFrame(measure);
		}
		if (typeof ResizeObserver !== "undefined") {
			const ro = new ResizeObserver(schedule);
			ro.observe(overlay);
			ro.observe(box);
			onCleanup(() => ro.disconnect());
		}
		listenFn(window, "resize", schedule);
		schedule();
	}
	function createModal(opts) {
		const modal = el("div", `ym-modal ${opts.modalClass || ""}`.trim());
		modal.id = opts.id;
		const box = el("div", `ym-modal__box ${opts.boxClass || ""}`.trim());
		box.setAttribute("role", "dialog");
		box.setAttribute("aria-modal", "true");
		box.setAttribute("aria-labelledby", `${opts.id}-title`);
		modal.addEventListener("click", (e) => {
			if (e.target === modal) opts.onClose();
		});
		const header = el("div", "ym-modal__header");
		const titleWrap = el("div", "ym-modal__title-wrap");
		const titleRow = el("div", "ym-modal__title-row");
		if (opts.icon) titleRow.appendChild(createTitleIcon(opts.icon));
		const titleEl = el("h3", "ym-modal__title", opts.title);
		titleEl.id = `${opts.id}-title`;
		titleRow.appendChild(titleEl);
		const subtitleEl = el("div", "ym-modal__subtitle", opts.subtitle || "");
		if (opts.subtitleId) subtitleEl.id = opts.subtitleId;
		titleWrap.appendChild(titleRow);
		if (opts.subtitle !== null) titleWrap.appendChild(subtitleEl);
		header.appendChild(titleWrap);
		header.appendChild(createCloseButton(opts.onClose));
		const content = el("div", "ym-modal__content");
		box.appendChild(header);
		box.appendChild(content);
		modal.appendChild(box);
		return {
			modal,
			box,
			content,
			title: titleEl,
			subtitle: subtitleEl
		};
	}
	function createStatsCard(label, value) {
		const card = el("div", "ym-stats-card");
		const left = el("div", "ym-stats-card__left");
		left.appendChild(el("div", "ym-stats-card__label", label));
		card.appendChild(left);
		card.appendChild(el("div", "ym-stats-card__value", value));
		return card;
	}
	function createWeekDayCard(day) {
		const card = el("div", "ym-week-day");
		if (day.isToday) card.classList.add("ym-week-day--today");
		const top = el("div", "ym-week-day__top");
		const left = el("div", "ym-week-day__left");
		const text = el("div", "ym-week-day__text");
		text.appendChild(el("div", "ym-week-day__title", `${day.label}${day.isToday ? " · сегодня" : ""}`));
		text.appendChild(el("div", "ym-week-day__date", day.dateLabel));
		left.appendChild(text);
		top.appendChild(left);
		top.appendChild(el("div", "ym-week-day__value", formatTimePadded(day.duration)));
		const progress = document.createElement("progress");
		progress.className = "ym-week-progress";
		progress.max = DAY_PROGRESS_MAX_SECONDS;
		progress.value = Math.min(DAY_PROGRESS_MAX_SECONDS, Math.max(0, Number(day.duration) || 0));
		progress.setAttribute("aria-label", `${day.label}: ${formatTimePadded(day.duration)} из 24 часов`);
		card.appendChild(top);
		card.appendChild(progress);
		return card;
	}
	var toastContainer = null;
	function getToastContainer() {
		if (!toastContainer) {
			toastContainer = el("div", "ym-toast-container");
			toastContainer.id = "ym-toast-container";
			document.body.appendChild(toastContainer);
		}
		return toastContainer;
	}
	function showToast(message, _variant = "default", requestFrame, scheduleTimeout) {
		const container = getToastContainer();
		const toast = el("div", `ym-toast ym-toast--${_variant}`, message);
		container.appendChild(toast);
		requestFrame(() => toast.classList.add("ym-toast--visible"));
		scheduleTimeout(() => {
			toast.classList.remove("ym-toast--visible");
			scheduleTimeout(() => {
				toast.remove();
				if (toastContainer && toastContainer.children.length === 0) {
					toastContainer.remove();
					toastContainer = null;
				}
			}, 220);
		}, 2600);
	}
	function setHidden(el, hidden) {
		if (el) el.hidden = hidden;
	}
	// src/navbar.ts
	init_constants();
	function createNavbarManager(onStatsClick, scheduleTimeout, clearScheduledTimeout, setInterval, clearIntervalFn, requestFrame, cancelFrame) {
		const navObservers = /* @__PURE__ */ new Map();
		let navObserver = null;
		let bodyObserver = null;
		let navRoot = null;
		let pollInterval = null;
		let ensureRafId = null;
		let isCollapsed = false;
		let tooltipEl = null;
		let tooltipHoverTarget = null;
		let showDelayId = null;
		let hideDelayId = null;
		function buildNavIcon() {
			const svg = document.createElementNS(SVG_NS, "svg");
			svg.setAttribute("viewBox", "0 0 24 24");
			svg.setAttribute("width", "24");
			svg.setAttribute("height", "24");
			svg.setAttribute("fill", "none");
			svg.setAttribute("stroke", "currentColor");
			svg.setAttribute("stroke-width", "2");
			svg.setAttribute("stroke-linecap", "round");
			svg.setAttribute("stroke-linejoin", "round");
			const topPath = document.createElementNS(SVG_NS, "path");
			topPath.setAttribute("d", "M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2");
			svg.appendChild(topPath);
			for (const [x, y, w, h] of [
				[
					"3",
					"12",
					"4",
					"8"
				],
				[
					"10",
					"8",
					"4",
					"12"
				],
				[
					"17",
					"10",
					"4",
					"10"
				]
			]) {
				const rect = document.createElementNS(SVG_NS, "rect");
				rect.setAttribute("x", x);
				rect.setAttribute("y", y);
				rect.setAttribute("width", w);
				rect.setAttribute("height", h);
				rect.setAttribute("rx", "1");
				svg.appendChild(rect);
			}
			return svg;
		}
		function findNavGroup() {
			return document.querySelector(".NavbarDesktop_navigationGroup__eexLF, ul[class*=\"NavbarDesktop_navigationGroup\"]") || document.querySelector("[class*=\"NavbarDesktop_root\"] ul");
		}
		function detectCollapsed(group, buttonLi) {
			const navbar = document.querySelector("[data-test-id=\"NAVBAR\"]");
			if (navbar) return navbar.className.includes("Navbar_root_collapsed");
			const other = [...group.children].find((c) => c !== buttonLi && c.querySelector("a .nxMXCBiVfgH4oxds3f2y span"));
			if (!other) return false;
			const anchor = other.querySelector("a");
			const span = other.querySelector(".nxMXCBiVfgH4oxds3f2y span");
			return !!(other.className.includes("e1KYSvMXXv0FD4s_yCuw") || anchor?.className.includes("uw57VJ37U4rAAHDs0zJR") || span?.className.includes("NavbarDesktop_title_collapsed"));
		}
		function applyCollapsed(anchor, collapsed) {
			const titleWrap = anchor.querySelector(".nxMXCBiVfgH4oxds3f2y");
			const titleSpan = titleWrap?.querySelector("span");
			anchor.dataset.ymCollapsed = collapsed ? "true" : "false";
			if (titleWrap) {
				if (collapsed) {
					titleWrap.style.marginInlineStart = "0px";
					titleWrap.style.maxWidth = "0px";
					titleWrap.style.opacity = "0";
					titleWrap.style.overflow = "hidden";
				} else {
					titleWrap.style.marginInlineStart = "";
					titleWrap.style.maxWidth = "";
					titleWrap.style.opacity = "";
					titleWrap.style.overflow = "";
				}
			}
			if (titleSpan) {
				titleSpan.classList.toggle("NavbarDesktop_title_collapsed__IH9Bc", collapsed);
				if (collapsed) {
					titleSpan.style.opacity = "0";
					titleSpan.style.visibility = "hidden";
					titleSpan.style.maxWidth = "0px";
					titleSpan.style.overflow = "hidden";
					titleSpan.style.pointerEvents = "none";
				} else {
					titleSpan.style.opacity = "";
					titleSpan.style.visibility = "";
					titleSpan.style.maxWidth = "";
					titleSpan.style.overflow = "";
					titleSpan.style.pointerEvents = "";
				}
			}
		}
		function getTooltip() {
			if (!tooltipEl) {
				tooltipEl = el("div", "ym-stats-tooltip");
				tooltipEl.id = "ym-stats-tooltip";
				tooltipEl.setAttribute("role", "tooltip");
				tooltipEl.textContent = "Статистика";
				document.body.appendChild(tooltipEl);
			}
			return tooltipEl;
		}
		function positionTooltip(anchor) {
			if (!tooltipEl || !anchor) return;
			const r = anchor.getBoundingClientRect();
			tooltipEl.style.left = `${Math.round(r.right + 6)}px`;
			tooltipEl.style.top = `${Math.round(r.top + r.height / 2)}px`;
		}
		function clearShowDelay() {
			if (showDelayId !== null) {
				clearScheduledTimeout(showDelayId);
				showDelayId = null;
			}
		}
		function hideTooltip() {
			clearShowDelay();
			tooltipHoverTarget = null;
			if (tooltipEl) {
				tooltipEl.classList.remove("ym-stats-tooltip--visible");
				if (hideDelayId !== null) clearScheduledTimeout(hideDelayId);
				hideDelayId = scheduleTimeout(() => {
					if (tooltipEl && !tooltipEl.classList.contains("ym-stats-tooltip--visible")) {
						tooltipEl.remove();
						tooltipEl = null;
					}
				}, 180);
			}
		}
		function showTooltipFor(anchor) {
			if (!anchor || anchor.offsetParent === null) return;
			if (hideDelayId !== null) {
				clearScheduledTimeout(hideDelayId);
				hideDelayId = null;
			}
			const tip = getTooltip();
			positionTooltip(anchor);
			tip.classList.add("ym-stats-tooltip--visible");
		}
		function scheduleShowTooltip(anchor) {
			clearShowDelay();
			tooltipHoverTarget = anchor;
			if (!isCollapsed || anchor.offsetParent === null) return;
			showDelayId = scheduleTimeout(() => {
				showDelayId = null;
				if (tooltipHoverTarget === anchor && isCollapsed && anchor.offsetParent !== null) showTooltipFor(anchor);
			}, 280);
		}
		function injectButton(group) {
			const existing = document.getElementById("ym-stats-button");
			if (existing) return existing.closest("li");
			const li = document.createElement("li");
			li.className = "HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT";
			li.setAttribute("aria-current", "false");
			const anchor = document.createElement("a");
			anchor.className = "buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk";
			anchor.setAttribute("role", "link");
			anchor.setAttribute("tabindex", "0");
			anchor.setAttribute("aria-disabled", "false");
			anchor.setAttribute("aria-label", "Статистика");
			anchor.setAttribute("data-ym-tooltip", "Статистика");
			anchor.id = "ym-stats-button";
			anchor.href = "#";
			anchor.addEventListener("click", (e) => {
				e.preventDefault();
				hideTooltip();
				onStatsClick();
			});
			anchor.addEventListener("mouseenter", () => scheduleShowTooltip(anchor));
			anchor.addEventListener("mouseleave", hideTooltip);
			anchor.addEventListener("focus", () => scheduleShowTooltip(anchor));
			anchor.addEventListener("blur", hideTooltip);
			const iconWrap = el("div", "_YzsXZGNK8KeaUFC4Ja1");
			iconWrap.appendChild(buildNavIcon());
			const textWrap = el("div", "nxMXCBiVfgH4oxds3f2y");
			const span = el("span", "_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR NavbarDesktop_title_animate__XLxaQ", "Статистика");
			span.setAttribute("title", "Статистика");
			textWrap.appendChild(span);
			anchor.appendChild(iconWrap);
			anchor.appendChild(textWrap);
			li.appendChild(anchor);
			const children = group.children;
			if (children.length > 0) group.insertBefore(li, children[children.length - 1]);
			else group.appendChild(li);
			syncSidebarState();
			return li;
		}
		function syncSidebarState() {
			const anchor = document.getElementById("ym-stats-button");
			if (!anchor) return;
			const li = anchor.closest("li");
			const group = li?.parentElement || navRoot || findNavGroup();
			if (!li || !group) return;
			const collapsed = detectCollapsed(group, li);
			if (isCollapsed !== collapsed || anchor.dataset.ymCollapsed !== String(collapsed)) {
				isCollapsed = collapsed;
				li.classList.toggle("e1KYSvMXXv0FD4s_yCuw", collapsed);
				anchor.classList.toggle("uw57VJ37U4rAAHDs0zJR", collapsed);
				anchor.classList.toggle("ym-sidebar-collapsed", collapsed);
				applyCollapsed(anchor, collapsed);
				if (!collapsed) hideTooltip();
			}
		}
		function observeNavGroup(group) {
			if (!group || group === navRoot) return;
			navObserver?.disconnect();
			navRoot = group;
			navObserver = new MutationObserver((mutations) => {
				if (!mutations.every((m) => {
					const t = m.target;
					const btn = document.getElementById("ym-stats-button");
					return t === btn || t === btn?.closest("li") || t === btn?.querySelector(".nxMXCBiVfgH4oxds3f2y") || t === btn?.querySelector(".nxMXCBiVfgH4oxds3f2y span");
				})) {
					ensureButton();
					syncSidebarState();
				}
			});
			navObserver.observe(group, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["class", "style"]
			});
			const navbar = document.querySelector("[data-test-id=\"NAVBAR\"]");
			if (navbar && !navObservers.has(navbar)) {
				const obs = new MutationObserver(() => syncSidebarState());
				obs.observe(navbar, {
					attributes: true,
					attributeFilter: ["class"]
				});
				navObservers.set(navbar, obs);
			}
		}
		function ensureButton() {
			const group = findNavGroup();
			if (!group) return;
			observeNavGroup(group);
			if (!document.getElementById("ym-stats-button")) injectButton(group);
			syncSidebarState();
			updateVisibility(_lastShowNavbarButton);
		}
		function scheduleEnsure() {
			if (ensureRafId === null) ensureRafId = requestFrame(() => {
				ensureRafId = null;
				ensureButton();
			});
		}
		function observeBody() {
			if (!document.body || bodyObserver) return;
			bodyObserver = new MutationObserver((mutations) => {
				if (!mutations.every((m) => {
					const t = m.target;
					return t === tooltipEl || !!t?.closest?.("#ym-stats-tooltip, #yandex-music-timer, .ym-modal, .ym-toast-container");
				})) scheduleEnsure();
			});
			bodyObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
		let _lastShowNavbarButton = true;
		function updateVisibility(show) {
			_lastShowNavbarButton = show;
			const anchor = document.getElementById("ym-stats-button");
			if (!anchor) return;
			const li = anchor.closest("li");
			if (!li) return;
			const display = show ? "" : "none";
			if (li.style.display !== display) li.style.display = display;
			if (!show) hideTooltip();
		}
		return {
			init() {
				observeBody();
				ensureButton();
				pollInterval = setInterval(() => ensureButton(), 2e3);
			},
			destroy() {
				for (const obs of navObservers.values()) obs.disconnect();
				navObservers.clear();
				navObserver?.disconnect();
				bodyObserver?.disconnect();
				if (pollInterval !== null) clearIntervalFn(pollInterval);
				if (ensureRafId !== null) cancelFrame(ensureRafId);
				hideTooltip();
				navObserver = null;
				bodyObserver = null;
				navRoot = null;
				pollInterval = null;
				ensureRafId = null;
			},
			ensureButton,
			syncSidebarState,
			updateVisibility
		};
	}
	// src/backup.ts
	var invalid = () => {
		throw new Error("Файл не является корректной резервной копией YandexMusicTime");
	};
	var requireNonNegInt = (v) => {
		if (!Number.isSafeInteger(v) || v < 0) invalid();
		return v;
	};
	var requireDateString = (v) => {
		if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) invalid();
		const d = /* @__PURE__ */ new Date(v + "T00:00:00Z");
		if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v) invalid();
		return v;
	};
	function validateV1Body(raw) {
		const e = raw;
		if (!e || e.format !== "YandexMusicTimeBackup" || e.version !== 1) invalid();
		if (typeof e.exportedAt !== "string" || !Number.isFinite(Date.parse(e.exportedAt))) invalid();
		if (!Array.isArray(e.sessions)) invalid();
		let totalDur = 0;
		const sessions = e.sessions.map((s) => {
			if (!s || !Number.isSafeInteger(s.timestamp) || s.timestamp < 0 || s.timestamp > 864e13) invalid();
			const dur = requireNonNegInt(s.duration);
			if (!dur) invalid();
			totalDur += dur;
			if (!Number.isSafeInteger(totalDur)) invalid();
			return {
				timestamp: s.timestamp,
				duration: dur,
				date: requireDateString(s.date)
			};
		});
		let streak = null;
		if (e.streak !== null) {
			const st = e.streak;
			if (!st || st.version !== 1 || requireNonNegInt(st.count) < 1 || requireNonNegInt(st.best) < st.count) invalid();
			streak = {
				version: 1,
				count: st.count,
				best: st.best,
				lastDate: requireDateString(st.lastDate)
			};
		}
		return {
			format: "YandexMusicTimeBackup",
			version: 1,
			exportedAt: e.exportedAt,
			sessions,
			streak,
			currentSessionSeconds: requireNonNegInt(e.currentSessionSeconds),
			previousSessionSeconds: requireNonNegInt(e.previousSessionSeconds)
		};
	}
	/** Serialises backup data as JSON string (v1, no owner binding) */
	function serializeBackupV1(data) {
		const body = validateV1Body({
			...data,
			format: "YandexMusicTimeBackup",
			version: 1,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		const json = JSON.stringify(body, null, 2);
		if (new TextEncoder().encode(json).byteLength > 104857600) throw new Error("Резервная копия превышает 100 МБ");
		return json;
	}
	var toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	function requireLogin(login) {
		if (typeof login !== "string" || !login.trim()) throw new Error("Войдите в аккаунт Яндекс Музыки, чтобы сохранить или восстановить копию");
		return login.trim().toLowerCase();
	}
	async function computeDigest(login, salt) {
		const canonical = requireLogin(login);
		const data = new TextEncoder().encode(`YandexMusicTime:backup-owner:v2\0${salt}\0${canonical}`);
		return toHex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", data)));
	}
	/** Creates a v2 backup JSON string with owner binding */
	async function exportBackup(data, login) {
		requireLogin(login);
		const v1 = JSON.parse(serializeBackupV1(data));
		const salt = toHex(globalThis.crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)));
		const digest = await computeDigest(login, salt);
		const v2 = JSON.stringify({
			...v1,
			version: 2,
			owner: {
				scheme: "ym-login-sha256-v1",
				salt,
				digest
			}
		}, null, 2);
		if (new TextEncoder().encode(v2).byteLength > 104857600) throw new Error("Резервная копия превышает 100 МБ");
		return v2;
	}
	async function verifyOwner(raw, login) {
		requireLogin(login);
		const e = raw;
		if (e?.format === "YandexMusicTimeBackup" && e.version === 1) throw new Error("Старая копия не привязана к аккаунту. Создайте новую копию в обновлённом аддоне");
		const owner = e?.owner;
		if (e?.format !== "YandexMusicTimeBackup" || e.version !== 2 || owner?.scheme !== "ym-login-sha256-v1" || typeof owner.salt !== "string" || !/^[0-9a-f]{64}$/.test(owner.salt) || typeof owner.digest !== "string" || !/^[0-9a-f]{64}$/.test(owner.digest)) invalid();
		const expected = await computeDigest(login, owner.salt);
		let diff = 0;
		for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ owner.digest.charCodeAt(i);
		if (diff) throw new Error("Эта резервная копия принадлежит другому аккаунту Яндекс Музыки");
	}
	/** Parses and validates a v2 backup JSON string, verifying owner */
	async function importBackup(jsonText, login) {
		let raw;
		try {
			raw = JSON.parse(jsonText);
		} catch {
			invalid();
		}
		await verifyOwner(raw, login);
		return {
			...validateV1Body({
				...raw,
				version: 1
			}),
			version: 2,
			owner: raw.owner
		};
	}
	// src/modals.ts
	init_stats();
	init_db();
	init_constants();
	async function copyToClipboard(text) {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}
		const ta = el("textarea", "ym-clipboard-fallback");
		ta.value = text;
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		document.execCommand("copy");
		ta.remove();
	}
	function buildStatsText(stats) {
		return [
			"Моя статистика Яндекс Музыки",
			"",
			`Прослушано всего: ${formatTimePadded(stats.total)}`,
			`За год: ${formatTimePadded(stats.year)}`,
			`За месяц: ${formatTimePadded(stats.month)}`,
			`За неделю: ${formatTimePadded(stats.week)}`,
			`За день: ${formatTimePadded(stats.day)}`,
			`В текущей сессии: ${formatTimePadded(stats.currentSession)}`,
			`В предыдущей сессии: ${formatTimePadded(stats.previousSession)}`,
			"",
			"Собрано через Yandex Music Time"
		].join("\n");
	}
	function buildWeekText(week) {
		const range = `${formatDateShort(week.startDate)} — ${formatDateShort(week.endDate)}`;
		const lines = week.days.map((d) => `${d.label}, ${d.dateLabel}: ${formatTimePadded(d.duration)}`);
		return [
			"Моя статистика Яндекс Музыки за неделю",
			`Неделя: ${range}`,
			"",
			...lines,
			"",
			`Итого за неделю: ${formatTimePadded(week.total)}`,
			"",
			"Собрано через Yandex Music Time"
		].join("\n");
	}
	function createShareHelpers(env) {
		async function shareStats() {
			try {
				await copyToClipboard(buildStatsText(await env.timer.getStats()));
				showToast("Статистика скопирована", "success", env.requestFrame, env.scheduleTimeout);
			} catch (e) {
				console.warn("[YandexMusicTime] Не удалось скопировать статистику:", e);
				showToast("Не удалось скопировать статистику", "error", env.requestFrame, env.scheduleTimeout);
			}
		}
		async function shareWeeklyStats() {
			try {
				await copyToClipboard(buildWeekText(await env.timer.getWeeklyStats()));
				showToast("Статистика за неделю скопирована", "success", env.requestFrame, env.scheduleTimeout);
			} catch (e) {
				console.warn("[YandexMusicTime] Не удалось скопировать статистику за неделю:", e);
				showToast("Не удалось скопировать статистику за неделю", "error", env.requestFrame, env.scheduleTimeout);
			}
		}
		return {
			shareStats,
			shareWeeklyStats
		};
	}
	function createWeeklyModal(env, share) {
		let modalEl = null;
		let subtitleEl = null;
		let listEl = null;
		let totalEl = null;
		let lastWeekStart = null;
		let updating = false;
		function close() {
			setHidden(modalEl, true);
		}
		async function update() {
			if (env.isRestoring() || !modalEl || modalEl.hidden || !listEl || !subtitleEl || !totalEl || updating) return;
			updating = true;
			try {
				const week = await env.timer.getWeeklyStats();
				if (env.isDestroyed() || env.isRestoring() || modalEl.hidden) return;
				const rangeText = `${formatDateShort(week.startDate)} — ${formatDateShort(week.endDate)} · Шкала дня — 24 часа`;
				if (subtitleEl.textContent !== rangeText) subtitleEl.textContent = rangeText;
				const weekStart = week.startDate.getTime();
				if (lastWeekStart === weekStart) week.days.forEach((day, i) => {
					const card = listEl.children[i];
					if (!card) return;
					card.classList.toggle("ym-week-day--today", day.isToday);
					const titleEl = card.querySelector(".ym-week-day__title");
					const newTitle = day.label + (day.isToday ? " · сегодня" : "");
					if (titleEl && titleEl.textContent !== newTitle) titleEl.textContent = newTitle;
					const valEl = card.querySelector(".ym-week-day__value");
					const valText = formatTimePadded(day.duration);
					if (valEl && valEl.textContent !== valText) valEl.textContent = valText;
					const progress = card.querySelector("progress");
					if (progress) {
						const val = Math.min(86400, Math.max(0, day.duration));
						if (progress.value !== val) {
							progress.value = val;
							progress.setAttribute("aria-label", `${day.label}: ${valText} из 24 часов`);
						}
					}
				});
				else {
					listEl.replaceChildren(...week.days.map((d) => createWeekDayCard(d)));
					lastWeekStart = weekStart;
				}
				const totalText = formatTimePadded(week.total);
				const totalValueEl = totalEl.querySelector(".ym-week-total__value");
				if (totalValueEl) {
					if (totalValueEl.textContent !== totalText) totalValueEl.textContent = totalText;
				} else {
					const labelEl = el("div", "ym-week-total__label", "Итого за неделю");
					const valEl = el("div", "ym-week-total__value", totalText);
					totalEl.replaceChildren(labelEl, valEl);
				}
			} finally {
				updating = false;
			}
		}
		function open() {
			if (modalEl) {
				setHidden(modalEl, false);
				update();
				return;
			}
			const refs = createModal({
				id: "ym-weekly-stats-modal",
				title: "Статистика за неделю",
				subtitle: "С понедельника по воскресенье",
				subtitleId: "ym-weekly-stats-subtitle",
				modalClass: "ym-modal--weekly",
				icon: "week",
				onClose: close
			});
			modalEl = refs.modal;
			subtitleEl = refs.subtitle;
			listEl = el("div", "ym-week-list");
			listEl.id = "ym-weekly-stats-content";
			refs.content.appendChild(listEl);
			totalEl = el("div", "ym-week-total");
			totalEl.id = "ym-weekly-stats-total";
			refs.content.appendChild(totalEl);
			const actions = createActions();
			const copyBtn = createButton("Скопировать");
			copyBtn.classList.add("ym-ui-button--wide");
			copyBtn.addEventListener("click", share.shareWeeklyStats);
			actions.appendChild(copyBtn);
			refs.box.appendChild(actions);
			document.body.appendChild(modalEl);
			fitModal(modalEl, refs.box, env.onCleanup, env.listen, env.requestFrame, env.cancelFrame);
			update();
		}
		return {
			open,
			close,
			update,
			isOpen: () => !(!modalEl || modalEl.hidden)
		};
	}
	function createBackupModal(env, weekly, statsModal) {
		let modalEl = null;
		let descEl = null;
		let fileInput = null;
		let actionsEl = null;
		let busy = false;
		const revokeSet = /* @__PURE__ */ new Set();
		env.onCleanup(() => {
			for (const url of revokeSet) URL.revokeObjectURL(url);
		});
		function setBusy(state) {
			busy = state;
			if (actionsEl) for (const b of actionsEl.querySelectorAll("button")) b.disabled = state;
		}
		async function collectBackupData() {
			await env.timer.flushForBackup();
			return {
				sessions: await (await Promise.resolve().then(() => (init_db(), db_exports))).readForBackup(),
				streak: env.streak.exportState(),
				currentSessionSeconds: env.timer.state.currentSessionTime,
				previousSessionSeconds: env.timer.state.previousSessionTime
			};
		}
		async function doRestore(backup) {
			await importBackup(JSON.stringify(backup), await env.getLogin());
			env.setRestoring(true);
			env.timer.stop();
			try {
				await (await Promise.resolve().then(() => (init_db(), db_exports))).waitForWrites();
				const prevSessions = await (await Promise.resolve().then(() => (init_db(), db_exports))).readForBackup();
				const prevStreak = env.streak.exportState();
				const prevItems = [LEGACY_KEY, PREV_SESSION_KEY].map((k) => [k, localStorage.getItem(k)]);
				const db = await openDB();
				await restoreSessionsToDB(db, backup.sessions);
				invalidateCache();
				try {
					localStorage.removeItem(LEGACY_KEY);
					localStorage.setItem(PREV_SESSION_KEY, String(backup.previousSessionSeconds));
					env.streak.restoreState(backup.streak);
				} catch (e) {
					await restoreSessionsToDB(db, prevSessions);
					invalidateCache();
					for (const [key, val] of prevItems) if (val === null) localStorage.removeItem(key);
					else localStorage.setItem(key, val);
					env.streak.restoreState(prevStreak);
					throw e;
				}
				const { getStatsFromSessions } = await Promise.resolve().then(() => (init_stats(), stats_exports));
				const agg = getStatsFromSessions(backup.sessions);
				env.timer.state.totalTime = agg.total;
				env.timer.state.statsCache = agg;
				env.timer.state.currentSessionTime = backup.currentSessionSeconds;
				env.timer.state.previousSessionTime = backup.previousSessionSeconds;
			} finally {
				env.setRestoring(false);
				if (!env.isDestroyed()) {
					env.timer.setPlayingFromUI(false);
					env.timer.updateDisplay(env.getSettings());
					env.onModalsUpdated();
				}
			}
		}
		function showConfirm(backup) {
			const n = backup.sessions.reduce((s, x) => s + x.duration, 0);
			descEl.textContent = `В копии: ${backup.sessions.length} записей, ${formatTime(n)} прослушивания. Рекорд стрика: ${backup.streak?.best ?? 0} дней.\n\nВосстановление заменит текущую историю и стрики данными из файла. Продолжить?`;
			const cancelBtn = createButton("Отмена", "ghost");
			cancelBtn.addEventListener("click", resetView);
			const confirmBtn = createButton("Восстановить", "danger");
			confirmBtn.dataset.action = "backupConfirm";
			confirmBtn.addEventListener("click", async () => {
				if (busy) return;
				setBusy(true);
				try {
					await doRestore(backup);
					if (env.isDestroyed()) return;
					resetView();
					descEl.textContent = "Статистика и стрики восстановлены. Повторный импорт этого файла не добавляет дубликаты.";
				} catch (e) {
					resetView();
					descEl.textContent = `Не удалось восстановить: ${e.message}`;
				} finally {
					setBusy(false);
				}
			});
			actionsEl.replaceChildren(cancelBtn, confirmBtn);
		}
		function resetView() {
			descEl.textContent = "Копия сохраняет историю и стрики и привязывается к текущему аккаунту Яндекс Музыки. Для восстановления войдите в тот же аккаунт. Настройки оформления не изменяются.";
			const exportBtn = createButton("Экспортировать");
			exportBtn.dataset.action = "backupExport";
			exportBtn.addEventListener("click", doExport);
			const importBtn = createButton("Восстановить из файла");
			importBtn.dataset.action = "backupImport";
			importBtn.addEventListener("click", () => {
				if (!busy) fileInput?.click();
			});
			actionsEl.replaceChildren(exportBtn, importBtn);
		}
		async function doExport() {
			if (busy) return;
			setBusy(true);
			try {
				const login = await env.getLogin();
				if (!login?.trim()) throw new Error("Войдите в аккаунт Яндекс Музыки перед экспортом");
				const data = await collectBackupData();
				if (env.isDestroyed()) return;
				const filename = `YandexMusicTime-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`;
				let fileHandle = null;
				if (typeof window.showSaveFilePicker === "function") try {
					fileHandle = await window.showSaveFilePicker({
						suggestedName: filename,
						types: [{
							description: "Резервная копия YandexMusicTime",
							accept: { "application/json": [".json"] }
						}]
					});
				} catch (e) {
					if (e.name === "AbortError") {
						descEl.textContent = "Экспорт отменён.";
						return;
					}
					if (![
						"SecurityError",
						"NotAllowedError",
						"NotSupportedError"
					].includes(e.name)) throw e;
				}
				const json = await exportBackup(data, login);
				if (env.isDestroyed()) return;
				if (fileHandle) {
					const writable = await fileHandle.createWritable();
					try {
						await writable.write(json);
						await writable.close();
					} catch (e) {
						await writable.abort().catch(() => {});
						throw e;
					}
					descEl.textContent = `Резервная копия сохранена: ${fileHandle.name}. Она содержит историю прослушивания и стрики.`;
					return;
				}
				const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
				revokeSet.add(url);
				const link = document.createElement("a");
				link.href = url;
				link.download = filename;
				link.hidden = true;
				document.body.appendChild(link);
				link.click();
				link.remove();
				env.scheduleTimeout(() => {
					URL.revokeObjectURL(url);
					revokeSet.delete(url);
				}, 6e4);
				descEl.textContent = "Файл резервной копии подготовлен. Сохраните его вне папки аддона: он содержит всю историю прослушивания, текущую сессию и рекорд стрика.";
			} catch (e) {
				descEl.textContent = `Не удалось экспортировать: ${e.message}`;
			} finally {
				setBusy(false);
			}
		}
		function open() {
			if (modalEl) {
				setHidden(modalEl, false);
				return;
			}
			const refs = createModal({
				id: "ym-backup-modal",
				title: "Резервная копия",
				subtitle: "Статистика и стрики",
				modalClass: "ym-modal--backup",
				onClose: () => setHidden(modalEl, true)
			});
			modalEl = refs.modal;
			descEl = el("div", "ym-backup-description");
			refs.content.appendChild(descEl);
			fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = ".json,application/json";
			fileInput.hidden = true;
			fileInput.dataset.action = "backupFile";
			refs.content.appendChild(fileInput);
			fileInput.addEventListener("change", async () => {
				const file = fileInput.files?.[0];
				if (!file || busy) return;
				setBusy(true);
				try {
					if (file.size > 104857600) throw new Error("Размер файла превышает 100 МБ");
					const backup = await importBackup(await file.text(), await env.getLogin());
					if (!env.isDestroyed()) showConfirm(backup);
				} catch (e) {
					descEl.textContent = `Файл не загружен: ${e.message}. Текущие данные не изменены.`;
				} finally {
					fileInput.value = "";
					setBusy(false);
				}
			});
			actionsEl = createActions();
			refs.box.appendChild(actionsEl);
			resetView();
			document.body.appendChild(modalEl);
		}
		return { open };
	}
	function createStatsModal(env, weekly, backup, share) {
		let modalEl = null;
		let listEl = null;
		let confirmModal = null;
		let updating = false;
		const cardCache = /* @__PURE__ */ new Map();
		function upsertCard(id, label, value) {
			let card = cardCache.get(id);
			if (!card) {
				card = createStatsCard(label, value);
				card.dataset.stat = id;
				cardCache.set(id, card);
			} else {
				const valEl = card.querySelector(".ym-stats-card__value");
				if (valEl?.firstChild && valEl.firstChild.nodeValue !== value) valEl.firstChild.nodeValue = value;
			}
			return card;
		}
		function close() {
			setHidden(modalEl, true);
		}
		async function updateStats() {
			if (env.isRestoring() || !modalEl || modalEl.hidden || !listEl || updating) return;
			updating = true;
			try {
				const stats = await env.timer.getStats();
				if (env.isDestroyed() || env.isRestoring() || modalEl.hidden) return;
				const cards = [
					[
						"total",
						"Прослушано всего",
						formatTimePadded(stats.total)
					],
					[
						"year",
						"Прослушано за год",
						formatTimePadded(stats.year)
					],
					[
						"month",
						"Прослушано за месяц",
						formatTimePadded(stats.month)
					],
					[
						"week",
						"Прослушано за неделю",
						formatTimePadded(stats.week)
					],
					[
						"day",
						"Прослушано за день",
						formatTimePadded(stats.day)
					],
					[
						"currentSession",
						"Прослушано в текущей сессии",
						formatTimePadded(stats.currentSession)
					],
					[
						"previousSession",
						"Прослушано в предыдущей сессии",
						formatTimePadded(stats.previousSession)
					]
				].map(([id, label, val]) => upsertCard(id, label, val));
				const streakStats = env.streak.getStats();
				const pluralDays = (n) => {
					const t = n % 100;
					const u = n % 10;
					return `${n} ${t >= 11 && t <= 14 ? "дней" : u === 1 ? "день" : u >= 2 && u <= 4 ? "дня" : "дней"}`;
				};
				const currentCard = upsertCard("streakCurrent", "Текущий стрик", pluralDays(streakStats.current));
				const bestCard = upsertCard("streakBest", "Рекорд стрика", pluralDays(streakStats.best));
				const showFlame = streakStats.best > 0 && env.getSettings().streakFormat === "flame";
				const valEl = bestCard.querySelector(".ym-stats-card__value");
				let iconEl = valEl.querySelector(".ym-stats-streak-icon");
				if (!showFlame) {
					iconEl?.remove();
					valEl.classList.remove("ym-stats-card__value--streak");
				} else if (iconEl?.dataset.best !== String(streakStats.best)) {
					iconEl?.remove();
					const lvl = getFlameLevel(streakStats.best);
					const wrap = el("span", "ym-stats-streak-icon");
					wrap.dataset.level = String(lvl.level);
					wrap.dataset.best = String(streakStats.best);
					wrap.setAttribute("role", "img");
					const ariaLabel = `Максимальный уровень огонька: ${lvl.level}. Рекорд: ${pluralDays(streakStats.best)}`;
					wrap.setAttribute("aria-label", ariaLabel);
					wrap.title = ariaLabel;
					wrap.appendChild(buildFlameIcon(document, streakStats.best));
					valEl.classList.add("ym-stats-card__value--streak");
					valEl.appendChild(wrap);
				}
				cards.push(currentCard, bestCard);
				if ([...cards].some((c, i) => listEl.children[i] !== c)) listEl.replaceChildren(...cards);
			} finally {
				updating = false;
			}
		}
		function openResetConfirm() {
			if (confirmModal) {
				setHidden(confirmModal, false);
				return;
			}
			const overlay = el("div", "ym-modal ym-modal--confirm");
			overlay.id = "ym-reset-confirm-modal";
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) closeResetConfirm();
			});
			const box = el("div", "ym-modal__box ym-modal__box--confirm");
			const title = el("h3", "ym-modal__title ym-modal__title--confirm", "Сбросить статистику?");
			const text = el("div", "ym-modal__text", "Это действие удалит всё накопленное время прослушивания. Отменить сброс после подтверждения не получится.");
			const actions = createActions("ym-modal__actions--confirm");
			const cancelBtn = createButton("Отмена", "ghost");
			const confirmBtn = createButton("Да, сбросить", "danger");
			confirmBtn.classList.add("ym-ui-button--confirm");
			cancelBtn.addEventListener("click", closeResetConfirm);
			confirmBtn.addEventListener("click", async () => {
				confirmBtn.disabled = true;
				confirmBtn.textContent = "Сбрасываю...";
				await env.timer.resetStats();
				env.timer.updateDisplay(env.getSettings());
				await updateStats();
				if (weekly.isOpen()) await weekly.update();
				closeResetConfirm();
				confirmBtn.disabled = false;
				confirmBtn.textContent = "Да, сбросить";
				showToast("Статистика сброшена", "success", env.requestFrame, env.scheduleTimeout);
			});
			actions.appendChild(cancelBtn);
			actions.appendChild(confirmBtn);
			box.appendChild(title);
			box.appendChild(text);
			box.appendChild(actions);
			overlay.appendChild(box);
			document.body.appendChild(overlay);
			fitModal(overlay, box, env.onCleanup, env.listen, env.requestFrame, env.cancelFrame);
			confirmModal = overlay;
		}
		function closeResetConfirm() {
			setHidden(confirmModal, true);
		}
		function open() {
			if (modalEl) {
				setHidden(modalEl, false);
				updateStats();
				return;
			}
			const refs = createModal({
				id: "ym-stats-modal",
				title: "Статистика прослушиваний",
				subtitle: "Твоё время в Яндекс Музыке",
				icon: "stats",
				onClose: close
			});
			modalEl = refs.modal;
			listEl = el("div", "ym-stats-list");
			listEl.id = "ym-stats-content";
			refs.content.appendChild(listEl);
			const actions = createActions();
			const weekBtn = createButton("За неделю");
			weekBtn.classList.add("ym-ui-button--wide");
			weekBtn.addEventListener("click", weekly.open);
			const copyBtn = createButton("Скопировать");
			copyBtn.classList.add("ym-ui-button--wide");
			copyBtn.addEventListener("click", share.shareStats);
			const backupBtn = createButton("Резервная копия");
			backupBtn.dataset.action = "backupOpen";
			backupBtn.addEventListener("click", backup.open);
			const resetBtn = createButton("Сбросить", "danger");
			resetBtn.addEventListener("click", openResetConfirm);
			actions.appendChild(weekBtn);
			actions.appendChild(copyBtn);
			actions.appendChild(backupBtn);
			actions.appendChild(resetBtn);
			refs.box.appendChild(actions);
			document.body.appendChild(modalEl);
			fitModal(modalEl, refs.box, env.onCleanup, env.listen, env.requestFrame, env.cancelFrame);
			updateStats();
		}
		return {
			open,
			close,
			updateStats,
			updateOpenModals() {
				updateStats();
				if (weekly.isOpen()) weekly.update();
			}
		};
	}
	
init_db();
async function start(api) {
			let destroyed = false;
			let restoring = false;
			const isDestroyed = () => destroyed;
			const isRestoring = () => restoring;
			const setRestoring = (v) => {
				restoring = v;
			};
			if (api.signal?.aborted) return () => {};
			api.signal?.addEventListener("abort", () => {
				destroyed = true;
			}, { once: true });
			const cleanups = [];
			function onCleanup(fn) {
				cleanups.push(fn);
			}
			const activeTimeouts = /* @__PURE__ */ new Set();
			const activeIntervals = /* @__PURE__ */ new Set();
			const activeRafs = /* @__PURE__ */ new Set();
			function scheduleTimeout(fn, ms) {
				const id = window.setTimeout(() => {
					activeTimeouts.delete(id);
					if (!destroyed) fn();
				}, ms);
				activeTimeouts.add(id);
				return id;
			}
			function clearScheduledTimeout(id) {
				window.clearTimeout(id);
				activeTimeouts.delete(id);
			}
			function addInterval(fn, ms) {
				const id = window.setInterval(() => {
					if (!destroyed) fn();
				}, ms);
				activeIntervals.add(id);
				return id;
			}
			function removeInterval(id) {
				window.clearInterval(id);
				activeIntervals.delete(id);
			}
			function requestFrame(cb) {
				const id = window.requestAnimationFrame((ts) => {
					activeRafs.delete(id);
					if (!destroyed) cb(ts);
				});
				activeRafs.add(id);
				return id;
			}
			function cancelFrame(id) {
				window.cancelAnimationFrame(id);
				activeRafs.delete(id);
			}
			function listen(target, event, cb) {
				target.addEventListener(event, cb);
				onCleanup(() => target.removeEventListener(event, cb));
			}
			function getSettings() {
				const raw = api.settings?.getCurrent() ?? {};
				const get = (key, def) => {
					const v = raw[key];
					if (v !== void 0) return typeof v === "object" && v !== null ? v.value ?? v.default ?? def : v;
					return def;
				};
				return {
					showTimer: Boolean(get("showTimer", true)),
					showStreak: Boolean(get("showStreak", true)),
					streakFormat: String(get("streakFormat", "text")) === "flame" ? "flame" : "text",
					timerPosition: Number(get("timerPosition", 1)),
					timerStatType: Number(get("timerStatType", 1)),
					showTimerLabel: Boolean(get("showTimerLabel", true)),
					timerColor: Boolean(get("timerColor", false)),
					customColor: String(get("customColor", "#ffffff")),
					fontSize: Number(get("fontSize", 12)),
					showSeconds: Boolean(get("showSeconds", true)),
					showIcon: Boolean(get("showIcon", false)),
					showNavbarButton: Boolean(get("showNavbarButton", true))
				};
			}
			const streak = createStreakManager(window, () => {
				if (!destroyed) timer.updateDisplay(getSettings());
			}, api.logger ?? console);
			const timer = createTimerManager(streak, api.logger ?? console, isDestroyed);
			const theme = createThemeDetector(requestFrame, cancelFrame, addInterval, removeInterval);
			let statsModal;
			const modalEnv = {
				isDestroyed,
				isRestoring,
				setRestoring,
				getSettings,
				getLogin: async () => {
					return await api.user?.getLogin?.() ?? "";
				},
				timer,
				streak,
				onCleanup,
				listen,
				scheduleTimeout,
				clearScheduledTimeout,
				requestFrame,
				cancelFrame,
				onModalsUpdated: () => statsModal?.updateOpenModals()
			};
			const share = createShareHelpers(modalEnv);
			const weekly = createWeeklyModal(modalEnv, share);
			statsModal = createStatsModal(modalEnv, weekly, createBackupModal(modalEnv, weekly, { updateStats: async () => statsModal?.updateStats() }), share);
			const navbar = createNavbarManager(() => statsModal.open(), scheduleTimeout, clearScheduledTimeout, addInterval, removeInterval, requestFrame, cancelFrame);
			let unsubPlayer = null;
			function initPlayer() {
				unsubPlayer = api.player.onChange((state) => {
					if (!destroyed && !restoring) timer.setPlayingFromUI(!!state?.isPlaying);
				});
				try {
					const snap = api.player.getSnapshot();
					if (!destroyed && !restoring) timer.setPlayingFromUI(!!snap?.isPlaying);
				} catch {}
			}
			function destroyPlayer() {
				unsubPlayer?.();
				unsubPlayer = null;
			}
			let unsubSettings = null;
			function initSettings() {
				unsubSettings = (api.settings ?? {
					getCurrent: () => ({}),
					onChange: () => () => {}
				}).onChange((raw) => {
					if (destroyed) return;
					const s = getSettings();
					timer.updateDisplay(s);
					navbar.updateVisibility(s.showNavbarButton);
					statsModal.updateOpenModals();
				});
			}
			let tickSecond = 0;
			let tickRefresh = 0;
			let tickModals = null;
			let tickMain = null;
			function startTickers() {
				tickMain = addInterval(() => {
					if (restoring) return;
					streak.visit();
					timer.updateDisplay(getSettings());
					tickSecond++;
					tickRefresh++;
					if (tickRefresh >= 30) {
						tickRefresh = 0;
						timer.autosaveCurrentSession();
					}
					if (tickSecond >= 10) {
						tickSecond = 0;
						timer.refreshStatsCache().then(() => {
							if (!destroyed) timer.updateDisplay(getSettings());
						});
					}
				}, 1e3);
				tickModals = addInterval(() => {
					if (!destroyed && !restoring) statsModal.updateOpenModals();
				}, 1e3);
			}
			function stopTickers() {
				if (tickMain !== null) {
					removeInterval(tickMain);
					tickMain = null;
				}
				if (tickModals !== null) {
					removeInterval(tickModals);
					tickModals = null;
				}
			}
			listen(window, "beforeunload", () => {
				timer.stop();
				timer.saveCurrentSessionAsPrevious();
			});
			listen(window, "pagehide", () => {
				timer.stop();
				timer.saveCurrentSessionAsPrevious();
			});
			function destroy() {
				if (destroyed) return;
				destroyed = true;
				streak.destroy();
				timer.stop();
				if (tickMain !== null || tickModals !== null) stopTickers();
				destroyPlayer();
				unsubSettings?.();
				navbar.destroy();
				theme.destroy();
				closeDB(api.logger ?? console);
				for (const id of activeTimeouts) window.clearTimeout(id);
				for (const id of activeIntervals) window.clearInterval(id);
				for (const id of activeRafs) window.cancelAnimationFrame(id);
				activeTimeouts.clear();
				activeIntervals.clear();
				activeRafs.clear();
				for (const fn of cleanups) try {
					fn();
				} catch {}
				cleanups.length = 0;
				for (const id of [
					"yandex-music-timer",
					"ym-stats-modal",
					"ym-weekly-stats-modal",
					"ym-reset-confirm-modal",
					"ym-backup-modal",
					"ym-toast-container",
					"ym-stats-tooltip"
				]) document.getElementById(id)?.remove();
				document.getElementById("ym-stats-button")?.closest("li")?.remove();
			}
			try {
				theme.init();
				initSettings();
				await migrateLegacyTime();
				if (destroyed) return destroy;
				await timer.loadTotalTime();
				if (destroyed) return destroy;
				streak.start();
				initPlayer();
				navbar.init();
				timer.updateDisplay(getSettings());
				navbar.updateVisibility(getSettings().showNavbarButton);
				startTickers();
				return destroy;
			} catch (e) {
				destroy();
				throw e;
			}
		}
window.__yandexMusicTimeCore = start;
})();
