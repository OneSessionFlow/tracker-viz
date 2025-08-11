/* global dscc */
'use strict';

// -- À personnaliser --
const TRACKING_URL = 'https://script.google.com/macros/s/AKfycbwIlQXJFs8JV_qhB29tHuCD_QYtBOUYgbvC7DiTa9KA8BwxNoHcD3TvewH-OfaCER-b/exec';
const DEFAULT_UID  = 'hexagone-solar';       // fallback si non fourni via styles
const TIMEOUT_MS   = 3000;

// Util: sérialisation d'objets en querystring (pour GET)
const toQuery = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

// Envoi fiable (POST JSON via sendBeacon si possible, sinon fetch)
const sendTracking = async (payload) => {
  try {
    const body = JSON.stringify(payload);

    // 1) sendBeacon (POST, asynchrone, très fiable)
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(TRACKING_URL, new Blob([body], { type: 'application/json' }));
      if (ok) return;
      // sinon, on tente fetch derrière
    }

    // 2) fetch (fallback)
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    // keepalive → permet de ne pas “couper” la requête si l’utilisateur change de page
    await fetch(TRACKING_URL, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: ctrl.signal,
    }).catch(() => {/* silence: on ne casse pas le rendu */});
    clearTimeout(t);
  } catch {
    // ne rien jeter dans la console finale pour garder la viz “silencieuse”
  }
};

// Récupère des infos utiles du contexte Looker Studio (quand dispo)
const extractContext = (data) => {
  // UID configurable depuis le panneau de style (si tu ajoutes un contrôle plus tard)
  const styleUid =
    data?.style?.uid?.value ||
    data?.style?.client_uid?.value ||
    null;

  // Dimensions du composant (utile si tu veux détecter visibilité)
  const width  = data?.theme?.themeStyle?.width  ?? null;
  const height = data?.theme?.themeStyle?.height ?? null;

  // Page/rapport (pas toujours exposé → on met l’URL d’affichage)
  const href = (typeof window !== 'undefined' && window.location) ? window.location.href : null;

  return {
    uid: styleUid || DEFAULT_UID,
    width,
    height,
    href,
  };
};

// Rendu principal (appelé à chaque draw)
const draw = async (data) => {
  const ctx = extractContext(data);

  // Charge utile de tracking
  const now = Date.now();
  const payload = {
    v: 1,
    ts: now,                  // horodatage ms
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
    href: ctx.href,
    uid: ctx.uid,
    // anti-cache côté serveur facultatif: un identifiant volatile
    rid: crypto?.randomUUID?.() ? crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`,
  };

  // Envoi
  await sendTracking(payload);

  // Optionnel: un “pixel” invisible pour occuper le DOM (certains thèmes aiment avoir un nœud)
  const host = document.body || document.documentElement;
  const marker = document.createElement('div');
  Object.assign(marker.style, { width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
  host.appendChild(marker);
};

// Abonnement aux données (aucune transformation, on veut juste le hook de rendu)
dscc.subscribeToData(draw, { transform: dscc.transformNone });
