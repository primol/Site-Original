/* =============================================================
   Google Tag Manager + Consent Mode (LGPD)

   CONFIRMAR: cole abaixo o ID do contêiner do Google Tag Manager
   da conta NOVA da empresa (formato GTM-XXXXXXX).

   NÃO use os IDs do site antigo (GTM-PTMKFJJ e GTM-TSGQRHM9):
   eles pertencem à conta antiga e são bloqueados aqui.

   Enquanto o ID estiver vazio, o GTM não carrega e o aviso de
   cookies não aparece. Os cliques continuam sendo registrados no
   dataLayer (ver js/main.js) e passam a ir para o GTM assim que
   o ID for preenchido.
   ============================================================= */
(function () {
  var GTM_ID = ''; // ex.: 'GTM-ABC1234'

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var antigos = ['GTM-PTMKFJJ', 'GTM-TSGQRHM9'];
  if (!/^GTM-[A-Z0-9]+$/.test(GTM_ID) || antigos.indexOf(GTM_ID) !== -1) return;

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
  window.OABC_GTM_ATIVO = true;

  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
  document.head.appendChild(s);
})();
