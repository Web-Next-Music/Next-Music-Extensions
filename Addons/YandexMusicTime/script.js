(async function () {
    const key = '__yandexMusicTimeNext';
    if (window[key]) await window[key].stop();
    let stopped = false;
    let dispose = null;
    let activation = null;
    let poll = null;
    let wait = null;
    let resolveWait = null;
    let request = null;
    const listeners = new Set();
    let current = {};
    let previous = '';
    const state = {
        async stop() {
            if (stopped) return;
            stopped = true;
            clearTimeout(poll);
            clearTimeout(wait);
            resolveWait?.();
            request?.abort();
            window.removeEventListener('pagehide', onPageHide);
            if (activation) await activation.catch(() => {});
            if (dispose) { dispose(); dispose = null; }
            listeners.clear();
            if (window[key] === state) delete window[key];
        }
    };
    window[key] = state;
    function onPageHide() { state.stop(); }
    window.addEventListener('pagehide', onPageHide, { once: true });
    while (!stopped && (!window.nextmusicApi || !window.__yandexMusicTimeCore)) {
        await new Promise(resolve => { resolveWait = resolve; wait = setTimeout(resolve, 250); });
        resolveWait = null;
    }
    if (stopped) return;
    const next = window.nextmusicApi;
    async function readSettings() {
        request = new AbortController();
        const timeout = setTimeout(() => request?.abort(), 5000);
        try {
            const port = window.__nextmusicApiAssetPort ?? 2007;
            const response = await fetch(`http://127.0.0.1:${port}/get_handle?name=YandexMusicTime`, { signal: request.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = (await response.json()).data;
            const result = {};
            for (const section of data?.sections ?? []) for (const item of section.items ?? []) {
                let value = item.type === 'button' ? item.bool : item.type === 'selector' ? item.selected : item.type === 'color' ? item.input : item.value;
                value ??= item.defaultParameter;
                if (item.id === 'streakFormat') value = Number(value) === 2 ? 'flame' : 'text';
                result[item.id] = value;
            }
            const json = JSON.stringify(result);
            if (!stopped && json !== previous) {
                previous = json;
                current = result;
                for (const listener of listeners) listener(current);
            }
        } catch (error) {
            if (!stopped && error.name !== 'AbortError') console.warn('[YandexMusicTime] settings:', error);
        } finally {
            clearTimeout(timeout);
            request = null;
            if (!stopped) poll = setTimeout(readSettings, 1000);
        }
    }
    await readSettings();
    if (stopped) return;
    const settings = {
        getCurrent: () => current,
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    };
    const snapshot = () => ({ isPlaying: next.getState?.()?.status === 'playing' });
    const player = {
        getSnapshot: snapshot,
        onChange(fn) {
            let last = snapshot().isPlaying;
            const update = () => {
                const value = snapshot();
                if (last !== value.isPlaying) { last = value.isPlaying; fn(value); }
            };
            const offStatus = next.onStatusChange?.(update);
            const offPlayer = next.onActivePlayerChange?.(update);
            const interval = setInterval(update, 1000);
            return () => { clearInterval(interval); offStatus?.(); offPlayer?.(); };
        }
    };
    try {
        activation = Promise.resolve(window.__yandexMusicTimeCore({
            addonId: '708d64df-6691-4659-acdc-4351765e2d12',
            settings,
            player,
            user: { getLogin: async () => {
                try { return await next.getUserLogin?.() ?? ''; }
                catch { return ''; }
            } },
            logger: console
        }));
        dispose = await activation;
        if (stopped && dispose) { dispose(); dispose = null; }
        activation = null;
    } catch (error) {
        console.error('[YandexMusicTime] activation failed:', error);
        await state.stop();
    }
})().catch(error => console.error('[YandexMusicTime] startup failed:', error));
