/**
 * Capacitor Mobile Bridge – replaces Electron preload.
 * Uses the built-in Capacitor Http plugin (when available) and localStorage
 * for the same API surface as the desktop app.
 */
(function () {
  'use strict';

  function generateRequestId() {
    return 'req_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Fetch Telegram data via the companion server.
   * Desktop: Express server on localhost.
   * Mobile: remote companion server (set via TELEMIRROR_SERVER_URL env or defaults).
   * The companion server must be hosted on a public instance (e.g. Heroku, VPS) and
   * exposes the /fetch and /progress endpoints exactly like the desktop Electron server.
   */
  const MOBILE_SERVER_URL = (function () {
    // Allow override via meta tag or global variable
    if (window.__TELEMIRROR_SERVER_URL__) return window.__TELEMIRROR_SERVER_URL__;
    return 'http://YOUR_SERVER_IP:9876';  // placeholder – must be replaced at build time
  })();

  async function getServerPort() {
    return 9876; // hard-coded for mobile; the actual port is part of the server URL
  }

  async function fetchUrl(url, requestId) {
    const lang = localStorage.getItem('appLanguage') || 'en';
    const versionMode = localStorage.getItem('versionMode') || 'light';
    try {
      const res = await fetch(`${MOBILE_SERVER_URL}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, requestId, lang, versionMode })
      });
      return res.json();
    } catch (e) {
      console.error('fetchUrl error:', e);
      return { success: false, error: e.message, code: 'MOBILE_FETCH_ERROR' };
    }
  }

  /**
   * Progress SSE connection – identical to desktop.
   */
  async function connectProgress(requestId, onProgress) {
    const lang = localStorage.getItem('appLanguage') || 'en';
    const eventSource = new EventSource(
      `${MOBILE_SERVER_URL}/progress/${requestId}?lang=${lang}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onProgress(data);
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => eventSource.close();
  }

  /**
   * Download file – uses Capacitor Browser/Share sheet or direct download link.
   * On Android WebView, we open the URL in the system browser for download.
   */
  async function downloadFile(url, defaultFilename) {
    try {
      // On mobile, we cannot use Electron's dialog, so we open in browser
      window.open(url, '_system');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Expose the same API as the Electron preload
  window.api = {
    generateRequestId,
    getServerPort,
    fetchUrl,
    connectProgress,
    downloadFile,
    minimizeWindow: () => {},
    closeWindow: () => {},
    getAppConfig: () => ({ name: 'TeleMirror', version: '3.0.0' }),
    getAdsConfig: async () => ({ ads: [] })
  };
})();
