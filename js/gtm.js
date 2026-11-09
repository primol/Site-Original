/* =============================================================
   Medição do Google Ads + Consent Mode (LGPD)

   GOOGLE_TAG_ID: tag do Google da conta do Google Ads (123-362-9550).
   Ela inclui o Google Ads AW-16569561213 e usa a mesma conversão
   "Pixel Zap" de antes, então o histórico de conversões continua.

   ADS_WHATSAPP: conversão "Pixel Zap" do Google Ads. É enviada a cada
   clique em WhatsApp no site (ver track() em js/main.js).

   GTM_ID (opcional): contêiner do Google Tag Manager. Fica vazio
   enquanto a medição é feita direto pela tag do Google. NÃO use os
   IDs do site antigo (GTM-PTMKFJJ e GTM-TSGQRHM9): são bloqueados.

   Sem nenhum ID, nada carrega e o aviso de cookies não aparece.
   ============================================================= */
(function () {
  var GOOGLE_TAG_ID = 'GT-WV8X3T9D';
  var ADS_WHATSAPP = 'AW-16569561213/BYECCPupzIwaEP3g_dw9';
  var GTM_ID = '';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var antigos = ['GTM-PTMKFJJ', 'GTM-TSGQRHM9'];
  var usaGTM = /^GTM-[A-Z0-9]+$/.test(GTM_ID) && antigos.indexOf(GTM_ID) === -1;
  var usaTag = /^(GT|AW|G)-[A-Z0-9]+$/.test(GOOGLE_TAG_ID);
  if (!usaGTM && !usaTag) return;

  // Consentimento: começa negado até o visitante clicar em "Aceitar" no aviso de cookies
  var salvo = null;
  try { salvo = window.localStorage.getItem('oabc_consent'); } catch (e) { /* navegação privada */ }
  var v = salvo === 'granted' ? 'granted' : 'denied';
  window.gtag('consent', 'default', {
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
    analytics_storage: v,
    wait_for_update: 500
  });
  window.OABC_GTM_ATIVO = true; // libera o aviso de cookies (js/main.js)

  var carregar = function (src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };

  if (usaTag) {
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_TAG_ID);
    if (/^AW-\d+\/[\w-]+$/.test(ADS_WHATSAPP)) window.OABC_ADS_WHATSAPP = ADS_WHATSAPP;
    carregar('https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_TAG_ID);
  }

  if (usaGTM) {
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    carregar('https://www.googletagmanager.com/gtm.js?id=' + GTM_ID);
  }
})();
