/* global dscc */
(() => {
  'use strict';

  // --- A personnaliser ---
  const TRACKING_URL = 'https://script.google.com/macros/s/AKfycbwIlQXJFs8JV_qhB29tHuCD_QYtBOUYgbvC7DiTa9KA8BwxNoHcD3TvewH-OfaCER-b/exec';
  const DEFAULT_UID  = 'hexagone-solar';

  // utilitaires
  const rid = () => (crypto?.randomUUID?.() ? crypto.randomUUID() :
                    `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const nowMs = () => Date.now();

  const toQS = (obj) => {
    const u = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') u.set(k, String(v));
    });
    return u.toString();
  };

  // Envoi GET “sans préflight” (no headers) via balise Image (fiable et évite CORS)
  const pingViaImage = (urlStr) => {
    try {
      const img = new Image(1, 1);
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = urlStr;
    } catch (_) { /* silencieux */ }
  };

  // Fallback GET fetch keepalive sans headers (simple request)
  const pingViaFetch = (urlStr) => {
    try {
      fetch(urlStr, { method: 'GET', keepalive: true, cache: 'no-store' })
        .catch(() => {});
    } catch (_) { /* silencieux */ }
  };

  const extractUid = (data) =>
    data?.style?.client_uid?.value?.trim?.() || DEFAULT_UID;

  const buildUrl = (base, params) => {
    const u = new URL(base);
    // merge params dans l'URL existante
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  };

  const draw = (data) => {
    const uid = extractUid(data);
    const href = (typeof window !== 'undefined' && window.location) ? window.location.href : '';
    const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
    const tz = (Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone) || '';

    const payload = {
      v: '1',
      ts: String(nowMs()),
      uid,
      href,
      lang,
      tz,
      rid: rid(),            // anti-cache + corrélation
      // champ “easter egg” pour debug éventuel :
      dv: 'ls-tracker/1.0.0'
    };

    const url = buildUrl(TRACKING_URL, payload);

    // 1) image “pixel” (prend quasi toujours)
    pingViaImage(url);
    // 2) petit filet de sécurité
    pingViaFetch(url);

    // garder un nœud invisible (certains thèmes veulent du DOM)
    const host = document.body || document.documentElement;
    const marker = document.createElement('div');
    Object.assign(marker.style, { width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
    host.appendChild(marker);
  };

  dscc.subscribeToData(draw, { transform: dscc.transformNone });
})();

