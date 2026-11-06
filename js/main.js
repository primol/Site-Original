/* =============================================================
   Original ABC – Reparos Express e Estética Automotiva
   Interações do site + rastreamento de cliques (Google Tag Manager)
   JavaScript puro, sem dependências.
   ============================================================= */
(() => {
  'use strict';

  /* ===========================================================
     CONFIGURAÇÃO — edite aqui
     =========================================================== */
  const CONFIG = {
    // Número do WhatsApp com DDI + DDD, só dígitos
    whatsapp: '5511983980583',
    // Dificulta o "Inspecionar" (clique direito e atalhos do DevTools). Mude para false para desligar.
    bloquearInspecionar: true,
  };

  // Horário de atendimento (0 = domingo … 6 = sábado), no fuso de São Paulo
  const HORARIO = {
    1: ['08:30', '18:00'], 2: ['08:30', '18:00'], 3: ['08:30', '18:00'],
    4: ['08:30', '18:00'], 5: ['08:30', '18:00'], 6: ['08:00', '12:00'],
  };

  // Problema escolhido no orçamento → serviços indicados
  const PROBLEMAS = {
    amassado:   { label: 'Amassado', servicos: ['Martelinho de Ouro'] },
    risco:      { label: 'Risco ou arranhão', servicos: ['Polimento Técnico', 'Micropintura'] },
    parachoque: { label: 'Para-choque raspado ou trincado', servicos: ['Funilaria e Para-choques'] },
    opaca:      { label: 'Pintura sem brilho ou manchada', servicos: ['Polimento Técnico'] },
    proteger:   { label: 'Quero proteger a pintura', servicos: ['Vitrificação de Pintura', 'PPF – Película de Proteção'] },
    interior:   { label: 'Interior sujo ou com odor', servicos: ['Higienização Interna'] },
    lavagem:    { label: 'Lavagem completa', servicos: ['Lavagem a Vapor'] },
    outro:      { label: 'Não sei / outro', servicos: ['Avaliação do especialista'] },
  };

  /* ===========================================================
     Utilitários
     =========================================================== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
  const openWhatsApp = (text) => {
    const url = waLink(text);
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url;
  };
  const lockScroll = (on) => document.body.classList.toggle('is-locked', on);

  /* ===========================================================
     RASTREAMENTO DE CONVERSÕES (Google Tag Manager)
     Cada clique em WhatsApp, telefone, "Como chegar" e redes sociais
     envia um evento para o dataLayer. No GTM, crie acionadores do tipo
     "Evento personalizado" com estes nomes:
       whatsapp_click · phone_click · directions_click · instagram_click · facebook_click
     Parâmetros enviados: click_location, service, link_url, page_path
     =========================================================== */
  window.dataLayer = window.dataLayer || [];
  const track = (event, params = {}) => {
    window.dataLayer.push({ event, page_path: window.location.pathname, ...params });
  };
  const clickLocation = (el) => el.dataset.track || el.closest('section[id], header, footer, nav')?.id || el.closest('header, footer, nav')?.tagName.toLowerCase() || '';
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    const base = { link_url: href, click_location: clickLocation(a) };
    if (/wa\.me|api\.whatsapp\.com/.test(href)) {
      track('whatsapp_click', { ...base, service: a.dataset.service || document.body.dataset.service || '' });
    } else if (href.startsWith('tel:')) {
      track('phone_click', { ...base, service: document.body.dataset.service || '' });
    } else if (a.hasAttribute('data-directions') || /google\.[^/]+\/maps\/dir/.test(href)) {
      track('directions_click', base);
    } else if (/instagram\.com/.test(href)) {
      track('instagram_click', base);
    } else if (/facebook\.com/.test(href)) {
      track('facebook_click', base);
    }
  }, true);

  /* ===========================================================
     Aviso de cookies (Consent Mode) — só aparece com o GTM configurado
     =========================================================== */
  const cookieBox = $('[data-cookie]');
  if (cookieBox && window.OABC_GTM_ATIVO) {
    let choice = null;
    try { choice = localStorage.getItem('oabc_consent'); } catch (err) { /* navegação privada */ }
    if (!choice) cookieBox.hidden = false;
    $$('[data-consent]', cookieBox).forEach((b) => b.addEventListener('click', () => {
      const value = b.dataset.consent === 'granted' ? 'granted' : 'denied';
      try { localStorage.setItem('oabc_consent', value); } catch (err) { /* ignora */ }
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { ad_storage: value, ad_user_data: value, ad_personalization: value, analytics_storage: value });
      }
      track('consent_update', { consent: value });
      cookieBox.hidden = true;
    }));
  }

  /* ===========================================================
     "Aberto agora" a partir do horário de atendimento
     =========================================================== */
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const nowSP = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, min: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  };
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const updateOpen = () => {
    let state;
    try { state = nowSP(); } catch (err) { return; }
    const today = HORARIO[state.day];
    let open = false, text = '';
    if (today && state.min >= toMin(today[0]) && state.min < toMin(today[1])) {
      open = true;
      text = `Aberto agora · fecha às ${today[1].replace(':', 'h')}`;
    } else {
      for (let i = 0; i < 8; i += 1) {
        const d = (state.day + i) % 7;
        const h = HORARIO[d];
        if (!h) continue;
        if (i === 0 && state.min >= toMin(h[0])) continue;
        const when = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : DIAS[d];
        text = `Fechado agora · abre ${when} às ${h[0].replace(':', 'h')}`;
        break;
      }
    }
    $$('[data-open-status]').forEach((el) => {
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-closed', !open);
      const t = $('[data-open-text]', el);
      if (t) t.textContent = text;
    });
  };
  updateOpen();
  setInterval(updateOpen, 60000);

  /* ===========================================================
     Dificulta o "Inspecionar"
     Bloqueia o clique direito (menos em campos de texto), os atalhos
     do DevTools e o arrastar das fotos.
     Atenção: nenhum site consegue impedir isso 100% — o código de
     qualquer página pública continua acessível pelo menu do navegador.
     Isto só desestimula o visitante comum.
     =========================================================== */
  if (CONFIG.bloquearInspecionar) {
    const editavel = (el) => el instanceof Element && !!el.closest('input, textarea, select, [contenteditable="true"]');
    document.addEventListener('contextmenu', (e) => { if (!editavel(e.target)) e.preventDefault(); });
    document.addEventListener('keydown', (e) => {
      const c = e.code;
      const mod = e.ctrlKey || e.metaKey;
      const bloqueia =
        c === 'F12' ||
        (mod && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyK'].includes(c)) || // Ctrl+Shift+I/J/C/K
        (e.metaKey && e.altKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyU'].includes(c)) || // Mac: Cmd+Option+I/J/C/U
        (mod && !e.shiftKey && !e.altKey && c === 'KeyU'); // Ctrl+U (ver código-fonte)
      if (bloqueia) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.addEventListener('dragstart', (e) => { if (e.target instanceof HTMLImageElement) e.preventDefault(); });
  }

  /* ===========================================================
     Ano no rodapé
     =========================================================== */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ===========================================================
     Header: estado ao rolar, esconder/mostrar e barra de progresso
     =========================================================== */
  const header = $('[data-header]');
  const progress = $('[data-progress]');
  const menu = $('[data-menu]');
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (header) {
      header.classList.toggle('is-scrolled', y > 20);
      const menuOpen = menu && menu.classList.contains('is-open');
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (!menuOpen && goingDown && y > 400) header.classList.add('is-hidden');
      else if (goingUp || y < 400) header.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ===========================================================
     Menu mobile
     =========================================================== */
  const burger = $('[data-burger]');
  const setMenu = (open) => {
    if (!menu || !burger) return;
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (open) { menu.removeAttribute('inert'); header.classList.remove('is-hidden'); }
    else menu.setAttribute('inert', '');
    lockScroll(open);
  };
  burger?.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu || document.createElement('div')).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu?.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1321px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ===========================================================
     Revelação ao rolar (com efeito cascata)
     =========================================================== */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      visible.forEach((entry, i) => {
        entry.target.style.setProperty('--delay', `${Math.min(i * 0.08, 0.4)}s`);
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ===========================================================
     Contadores animados
     =========================================================== */
  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = target.toFixed(decimals).replace('.', ','); return; }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = (target * eased).toFixed(decimals).replace('.', ',');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ===========================================================
     Link ativo na navegação
     =========================================================== */
  const navLinks = $$('.nav__link').filter((a) => a.getAttribute('href').startsWith('#'));
  const sectionsForNav = navLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if ('IntersectionObserver' in window && sectionsForNav.length) {
    const nio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sectionsForNav.forEach((s) => nio.observe(s));
  }

  /* ===========================================================
     Linha do tempo "Como funciona"
     =========================================================== */
  const stepsEl = $('[data-steps]');
  if (stepsEl) {
    const stepItems = $$('.step', stepsEl);
    const vertical = () => window.matchMedia('(max-width: 860px)').matches;
    const updateSteps = () => {
      const r = stepsEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.65 - r.top) / (r.height || 1), 0, 1);
      stepsEl.style.setProperty('--progress', p.toFixed(3));
      stepItems.forEach((item, i) => {
        const lit = vertical() ? p >= (i / Math.max(stepItems.length - 1, 1)) - 0.02 : p >= (i / stepItems.length) + 0.02;
        item.classList.toggle('is-lit', lit || reduceMotion);
      });
    };
    window.addEventListener('scroll', () => requestAnimationFrame(updateSteps), { passive: true });
    window.addEventListener('resize', updateSteps);
    updateSteps();
  }

  /* ===========================================================
     Filtros (serviços e resultados) com pílula deslizante
     =========================================================== */
  const filterGroups = $$('[data-filters]');
  const placePill = (group) => {
    const pill = $('.filters__pill', group);
    const active = $('.filter.is-active', group);
    if (!pill || !active) return;
    pill.style.setProperty('--pw', `${active.offsetWidth}px`);
    pill.style.setProperty('--ph', `${active.offsetHeight}px`);
    pill.style.setProperty('--px', `${active.offsetLeft}px`);
    pill.style.setProperty('--py', `${active.offsetTop}px`);
  };
  filterGroups.forEach((group) => {
    const name = group.dataset.filters;
    const grid = $(`[data-filter-grid="${name}"]`);
    const items = grid ? Array.from(grid.children) : [];
    $$('.filter', group).forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.filter', group).forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        placePill(group);
        btn.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        const f = btn.dataset.filter;
        let n = 0;
        items.forEach((item) => {
          const show = f === 'all' || item.dataset.cat === f;
          item.classList.remove('is-filter-in');
          item.classList.toggle('is-filtered-out', !show);
          if (show) {
            item.classList.add('is-in');
            if (!reduceMotion) {
              void item.offsetWidth; // reinicia a animação
              item.style.setProperty('--fd', `${Math.min(n * 0.06, 0.36)}s`);
              item.classList.add('is-filter-in');
            }
            n += 1;
          }
        });
        if (grid) { grid.scrollTo({ left: 0, behavior: 'auto' }); grid.dispatchEvent(new Event('filtered')); }
      });
    });
    requestAnimationFrame(() => placePill(group));
  });
  window.addEventListener('resize', () => filterGroups.forEach(placePill));
  document.fonts?.ready.then(() => filterGroups.forEach(placePill));

  /* ===========================================================
     Carrossel de avaliações: setas, arraste e barra de progresso
     =========================================================== */
  $$('[data-tcarousel]').forEach((wrap) => {
    const trackEl = $('[data-ttrack]', wrap);
    const prev = $('[data-tprev]', wrap);
    const next = $('[data-tnext]', wrap);
    const thumb = $('[data-tprogress] .swipe__thumb', wrap);
    if (!trackEl) return;
    const step = () => {
      const card = trackEl.firstElementChild;
      const gap = parseFloat(getComputedStyle(trackEl).columnGap) || 16;
      return card ? card.getBoundingClientRect().width + gap : trackEl.clientWidth;
    };
    const update = () => {
      const max = trackEl.scrollWidth - trackEl.clientWidth;
      if (prev) prev.disabled = trackEl.scrollLeft <= 2;
      if (next) next.disabled = trackEl.scrollLeft >= max - 2;
      if (thumb) {
        const w = clamp((trackEl.clientWidth / trackEl.scrollWidth) * 100, 12, 100);
        thumb.style.setProperty('--sw-w', `${w}%`);
        thumb.style.setProperty('--sw-x', `${((max > 0 ? trackEl.scrollLeft / max : 0) * (100 - w) / w) * 100}%`);
      }
    };
    prev?.addEventListener('click', () => trackEl.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    next?.addEventListener('click', () => trackEl.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    trackEl.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    // Arrastar com o mouse (no celular o dedo já arrasta)
    if (finePointer) {
      let down = false, sx = 0, sl = 0, moved = false;
      trackEl.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = trackEl.scrollLeft; trackEl.style.scrollSnapType = 'none'; trackEl.style.scrollBehavior = 'auto'; });
      window.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; trackEl.scrollLeft = sl - dx; });
      window.addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        trackEl.style.scrollSnapType = '';
        trackEl.style.scrollBehavior = '';
        if (moved) { const i = Math.round(trackEl.scrollLeft / step()); trackEl.scrollTo({ left: i * step(), behavior: 'smooth' }); }
      });
    }
    update();
  });

  /* ===========================================================
     Carrosséis no celular: barra de progresso do arraste
     =========================================================== */
  $$('[data-swipe]').forEach((sw) => {
    const grid = $(`[data-filter-grid="${sw.dataset.swipe}"]`);
    const thumb = $('.swipe__thumb', sw);
    if (!grid || !thumb) return;
    const update = () => {
      const max = grid.scrollWidth - grid.clientWidth;
      const ratio = grid.scrollWidth ? grid.clientWidth / grid.scrollWidth : 1;
      const w = clamp(ratio * 100, 12, 100);
      thumb.style.setProperty('--sw-w', `${w}%`);
      const p = max > 0 ? grid.scrollLeft / max : 0;
      thumb.style.setProperty('--sw-x', `${(p * (100 - w) / w) * 100}%`);
      sw.style.visibility = max > 4 ? 'visible' : 'hidden';
    };
    grid.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    grid.addEventListener('filtered', update);
    update();
  });

  /* ===========================================================
     Cards com inclinação 3D + luz que segue o mouse
     =========================================================== */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((card) => {
      let raf = 0;
      card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
      card.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          card.style.setProperty('--mx', `${x * 100}%`);
          card.style.setProperty('--my', `${y * 100}%`);
          card.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
          card.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  } else {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });
  }

  /* ===========================================================
     Botões magnéticos
     =========================================================== */
  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach((el) => {
      const strength = 0.28;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = `${dx * strength}px ${dy * strength}px`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition += ', translate .5s cubic-bezier(.2,.7,.2,1)';
        el.style.translate = '0 0';
        setTimeout(() => { el.style.transition = ''; }, 500);
      });
    });
  }

  /* Título do hero: libera o brilho depois da animação de entrada */
  const heroTitle = $('.hero__title');
  if (heroTitle) setTimeout(() => heroTitle.classList.add('is-done'), reduceMotion ? 0 : 1800);

  /* ===========================================================
     HERO: lanterna, parallax e partículas
     =========================================================== */
  const hero = $('[data-hero]');
  if (hero) {
    const layers = $$('[data-depth]', hero).map((el) => ({ el, d: parseFloat(el.dataset.depth) || 0 }));
    const car = $('.hero__car', hero);
    let mx = 0, my = 0, cx = 0, cy = 0;
    let heroVisible = true;
    let heroRaf = 0;

    // Partículas de poeira na luz
    const canvas = $('[data-dust]', hero);
    const ctx = canvas?.getContext('2d');
    let particles = [];
    let W = 0, H = 0, dpr = 1;
    const pointer = { x: -9999, y: -9999, active: false };

    const resizeDust = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((W * H) / 16000, 30, 110));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.18,
        r: 0.4 + Math.random() * 1.5,
        a: 0.12 + Math.random() * 0.45,
        t: Math.random() * Math.PI * 2,
        red: Math.random() < 0.14,
        ox: 0, oy: 0,
      }));
    };

    const drawDust = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.t += 0.02;
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        let glow = 0;
        if (pointer.active) {
          const dx = p.x + p.ox - pointer.x;
          const dy = p.y + p.oy - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 160) {
            const f = (1 - dist / 160);
            p.ox += (dx / (dist || 1)) * f * 2.2;
            p.oy += (dy / (dist || 1)) * f * 2.2;
            glow = f;
          }
        }
        p.ox *= 0.94; p.oy *= 0.94;
        const alpha = clamp(p.a * (0.6 + 0.4 * Math.sin(p.t)) + glow * 0.6, 0, 1);
        ctx.beginPath();
        ctx.fillStyle = p.red ? `rgba(255,70,55,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.arc(p.x + p.ox, p.y + p.oy, p.r + glow * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      cx = lerp(cx, mx, 0.06);
      cy = lerp(cy, my, 0.06);
      layers.forEach(({ el, d }) => {
        if (el === car) return;
        el.style.translate = `${(cx * d * 22).toFixed(2)}px ${(cy * d * 14).toFixed(2)}px`;
      });
      if (car) {
        const scrollShift = Math.min(window.scrollY, H) * 0.18;
        car.style.translate = `${(cx * 26).toFixed(2)}px ${(cy * 16 + scrollShift).toFixed(2)}px`;
      }
      if (ctx) drawDust();
      heroRaf = heroVisible ? requestAnimationFrame(loop) : 0;
    };

    if (!reduceMotion) {
      resizeDust();
      window.addEventListener('resize', resizeDust);
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        my = ((e.clientY - r.top) / r.height - 0.5) * 2;
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.active = true;
        hero.style.setProperty('--lx', `${pointer.x}px`);
        hero.style.setProperty('--ly', `${pointer.y}px`);
        hero.style.setProperty('--lo', '1');
      });
      hero.addEventListener('pointerleave', () => {
        mx = 0; my = 0; pointer.active = false;
        hero.style.setProperty('--lo', '0');
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          heroVisible = entry.isIntersecting && !document.hidden;
          if (heroVisible && !heroRaf) heroRaf = requestAnimationFrame(loop);
        }).observe(hero);
      }
      document.addEventListener('visibilitychange', () => {
        heroVisible = !document.hidden && hero.getBoundingClientRect().bottom > 0;
        if (heroVisible && !heroRaf) heroRaf = requestAnimationFrame(loop);
      });
      heroRaf = requestAnimationFrame(loop);
    }
  }

  /* ===========================================================
     Faixa (ticker) que acelera com a rolagem
     =========================================================== */
  const ticker = $('[data-ticker]');
  const tickerTrack = $('[data-ticker-track]');
  if (ticker && tickerTrack && !reduceMotion) {
    ticker.classList.add('is-js');
    let x = 0, extra = 0, dir = -1, last = performance.now(), visible = true, raf = 0, prevScroll = window.scrollY;
    const base = 55; // px por segundo
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      extra *= 0.93;
      x += dir * (base + extra) * dt;
      const half = tickerTrack.scrollWidth / 2;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      tickerTrack.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const v = y - prevScroll;
      prevScroll = y;
      if (Math.abs(v) > 0) {
        dir = v > 0 ? -1 : 1;
        extra = Math.min(extra + Math.abs(v) * 6, 1100);
      }
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      }).observe(ticker);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ===========================================================
     Diálogos (abrir/fechar com animação)
     =========================================================== */
  const openDialog = (dlg) => {
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    lockScroll(true);
  };
  const closeDialog = (dlg, cb) => {
    if (!dlg || !dlg.open) { cb?.(); return; }
    const done = () => {
      dlg.classList.remove('is-closing');
      if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
      lockScroll(false);
      cb?.();
    };
    if (reduceMotion) { done(); return; }
    dlg.classList.add('is-closing');
    dlg.addEventListener('animationend', done, { once: true });
  };
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => closeDialog(dlg)));
  });

  /* ===========================================================
     Resultados: cards que viram + lightbox
     =========================================================== */
  const results = $$('.result');
  const setFlip = (media, flipped) => {
    media.classList.toggle('is-flipped', flipped);
    media.setAttribute('aria-pressed', String(flipped));
    const title = $('.result__title', media.closest('.result'))?.textContent.trim() || '';
    media.setAttribute('aria-label', `${title}: mostrar o ${flipped ? 'antes' : 'depois'}`);
    const hint = $('[data-hint]', media);
    if (hint) hint.textContent = flipped ? 'Ver antes' : 'Ver depois';
  };
  let userFlipped = false;
  $$('[data-flip]').forEach((media) => {
    const toggle = () => { userFlipped = true; setFlip(media, !media.classList.contains('is-flipped')); };
    media.addEventListener('click', toggle);
    media.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // Demonstração automática: o primeiro card vira sozinho uma vez
  const gallery = $('.gallery') || $('.result--hero');
  if (gallery && !reduceMotion && 'IntersectionObserver' in window) {
    const gio = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      gio.disconnect();
      const first = $('.result:not(.is-filtered-out) [data-flip]', gallery);
      if (!first) return;
      setTimeout(() => { if (!userFlipped) setFlip(first, true); }, 900);
      setTimeout(() => { if (!userFlipped) setFlip(first, false); }, 2900);
    }, { threshold: 0.45 });
    gio.observe(gallery);
  }

  const lb = $('[data-lightbox]');
  let lbIndex = 0;
  const visibleResults = () => results.filter((r) => !r.classList.contains('is-filtered-out'));
  const renderLightbox = (dir = 0) => {
    const list = visibleResults();
    if (!lb || !list.length) return;
    lbIndex = (lbIndex + list.length) % list.length;
    const item = list[lbIndex];
    const front = $('.result__face--front', item);
    const back = $('.result__face--back', item);
    const before = $('[data-lb-before]', lb);
    const after = $('[data-lb-after]', lb);
    before.src = front.currentSrc || front.src; before.alt = front.alt;
    after.src = back.currentSrc || back.src; after.alt = back.alt;
    $('[data-lb-title]', lb).textContent = $('.result__title', item).textContent.trim();
    const descEl = $('.result__desc', item);
    $('[data-lb-desc]', lb).textContent = (descEl.firstChild?.nodeType === 3 ? descEl.firstChild.textContent : descEl.textContent).trim();
    $('[data-lb-count]', lb).textContent = `${lbIndex + 1}/${list.length}`;
    const pair = $('[data-lb-pair]', lb);
    if (dir && !reduceMotion) {
      pair.style.setProperty('--sw', `${dir * 40}px`);
      pair.classList.remove('is-swap'); void pair.offsetWidth; pair.classList.add('is-swap');
    }
    const multi = list.length > 1;
    $('[data-lb-prev]', lb).hidden = !multi;
    $('[data-lb-next]', lb).hidden = !multi;
  };
  $$('[data-zoom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lbIndex = visibleResults().indexOf(btn.closest('.result'));
      renderLightbox();
      openDialog(lb);
    });
  });
  if (lb) {
    $('[data-lb-prev]', lb).addEventListener('click', () => { lbIndex -= 1; renderLightbox(-1); });
    $('[data-lb-next]', lb).addEventListener('click', () => { lbIndex += 1; renderLightbox(1); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { lbIndex -= 1; renderLightbox(-1); }
      if (e.key === 'ArrowRight') { lbIndex += 1; renderLightbox(1); }
    });
    const pair = $('[data-lb-pair]', lb);
    let sx = null;
    pair.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    pair.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50 && visibleResults().length > 1) { lbIndex += dx < 0 ? 1 : -1; renderLightbox(dx < 0 ? 1 : -1); }
    });
  }

  /* ===========================================================
     ORÇAMENTO INTERATIVO
     Passo 1: o cliente toca na peça do carro e diz o que aconteceu.
     Passo 2: problemas gerais (já vem marcado o que foi dito no mapa).
     Passo 3: dados e envio pelo WhatsApp.
     =========================================================== */
  const qb = $('[data-qb]');
  if (qb) {
    // Tipo de dano marcado na peça → problema do passo 2
    const DANOS = {
      amassado: { label: 'Amassado', problema: 'amassado' },
      risco: { label: 'Risco', problema: 'risco' },
      trinca: { label: 'Trincado / quebrado', problema: 'parachoque' },
      opaca: { label: 'Sem brilho / manchado', problema: 'opaca' },
      naosei: { label: 'Não sei dizer', problema: 'outro' },
    };
    const state = { step: 1, zones: new Map(), order: [], extras: new Set(), problems: new Set() };
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const zones = $$('.zone', qb);
    const zoneEl = (id) => zones.find((z) => z.dataset.zone === id);
    const zoneLabel = (id) => zoneEl(id)?.dataset.label || id;
    const tip = $('[data-carmap-tip]', qb);
    const carmap = $('[data-carmap]', qb);
    const svg = $('.carmap__svg', qb);
    const pop = $('[data-dmg-pop]', qb);
    const hint = $('[data-carmap-hint]', qb);
    const panels = $$('[data-panel]', qb);
    const stepBtns = $$('[data-goto]', qb);
    const bar = $('[data-qb-bar]', qb);
    const zoneList = $('[data-zone-list]', qb);
    const zoneEmpty = $('[data-zone-empty]', qb);
    const zoneCount = $('[data-zone-count]', qb);
    const sumZones = $('[data-sum-zones]', qb);
    const sumProblems = $('[data-sum-problems]', qb);
    const sumReco = $('[data-sum-reco]', qb);
    const status = $('[data-qb-status]', qb);
    const form = $('[data-qb-form]', qb);
    let popZone = null;

    const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) { /* sem vibração */ } };
    const flash = (el) => { el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); };
    const typesOf = (id) => [...(state.zones.get(id) || [])];
    const typesText = (id) => typesOf(id).map((t) => DANOS[t].label).join(' · ');
    const derivedProblems = () => {
      const out = new Set();
      state.zones.forEach((set) => set.forEach((t) => out.add(DANOS[t].problema)));
      return out;
    };
    const allProblems = () => new Set([...derivedProblems(), ...state.problems]);
    const recommended = () => {
      const out = [];
      allProblems().forEach((p) => (PROBLEMAS[p]?.servicos || []).forEach((sv) => { if (!out.includes(sv)) out.push(sv); }));
      if (state.extras.has('Interior do carro') && !out.includes('Higienização Interna')) out.push('Higienização Interna');
      return out;
    };
    const placesText = () => [
      ...state.order.map((id) => (typesOf(id).length ? `${zoneLabel(id)} (${typesText(id).toLowerCase().replace(/ · /g, ', ')})` : zoneLabel(id))),
      ...state.extras,
    ];

    // Marcadores numerados no desenho do carro
    const markers = document.createElementNS(SVG_NS, 'g');
    markers.setAttribute('class', 'carmap__markers');
    markers.setAttribute('aria-hidden', 'true');
    svg?.appendChild(markers);
    const centerOf = (id) => {
      const bb = zoneEl(id).getBBox();
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    };

    // Altura do mapa (animação do "scanner")
    const setMapH = () => carmap && carmap.style.setProperty('--map-h', `${carmap.offsetHeight}px`);
    setMapH();
    window.addEventListener('resize', setMapH);

    const highlight = (id, on) => {
      zoneEl(id)?.classList.toggle('is-hl', on);
      $$(`.dmg-item[data-id="${id}"]`, qb).forEach((li) => li.classList.toggle('is-hl', on));
      $$(`.mk[data-id="${id}"]`, markers).forEach((m) => m.classList.toggle('is-hl', on));
    };

    const iconSvg = (name) => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;

    const render = () => {
      // Peças no mapa
      zones.forEach((z) => z.setAttribute('aria-pressed', String(state.zones.has(z.dataset.zone))));

      // Marcadores
      markers.textContent = '';
      state.order.forEach((id, i) => {
        const c = centerOf(id);
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', `mk${typesOf(id).length ? '' : ' mk--pending'}`);
        g.setAttribute('data-id', id);
        g.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`);
        g.innerHTML = `<circle class="mk__pulse" r="11"/><circle class="mk__dot" r="9"/><text class="mk__n" y="3.6">${i + 1}</text>`;
        markers.appendChild(g);
      });

      // Lista ao lado do mapa
      zoneList.textContent = '';
      state.order.forEach((id, i) => {
        const li = document.createElement('li');
        li.className = 'dmg-item';
        li.dataset.id = id;
        const t = typesText(id);
        li.innerHTML = `<button type="button" class="dmg-item__main" aria-label="Editar ${zoneLabel(id)}">
            <span class="dmg-item__n">${i + 1}</span>
            <span class="dmg-item__body"><strong>${zoneLabel(id)}</strong><small class="${t ? '' : 'is-pending'}">${t || 'Toque para dizer o que houve'}</small></span>
            ${iconSvg('i-edit')}
          </button>
          <button type="button" class="dmg-item__x" aria-label="Remover ${zoneLabel(id)}">${iconSvg('i-x')}</button>`;
        $('.dmg-item__main', li).addEventListener('click', () => openPop(id, { focus: true }));
        $('.dmg-item__x', li).addEventListener('click', () => removeZone(id));
        li.addEventListener('pointerenter', () => highlight(id, true));
        li.addEventListener('pointerleave', () => highlight(id, false));
        zoneList.appendChild(li);
      });
      state.extras.forEach((label) => {
        const li = document.createElement('li');
        li.className = 'dmg-item dmg-item--extra';
        li.innerHTML = `<span class="dmg-item__main"><span class="dmg-item__n">+</span><span class="dmg-item__body"><strong>${label}</strong></span></span>
          <button type="button" class="dmg-item__x" aria-label="Remover ${label}">${iconSvg('i-x')}</button>`;
        $('.dmg-item__x', li).addEventListener('click', () => toggleExtra(label, false));
        zoneList.appendChild(li);
      });
      const count = state.order.length + state.extras.size;
      zoneEmpty.hidden = count > 0;
      zoneCount.textContent = count;
      zoneCount.classList.toggle('has-items', count > 0);

      // Resumo ao vivo
      const places = placesText();
      const zText = places.length ? places.join(', ') : '—';
      if (sumZones.textContent !== zText) { sumZones.textContent = zText; flash(sumZones); }
      const probs = [...allProblems()];
      const pText = probs.length ? probs.map((p) => PROBLEMAS[p].label).join(', ') : '—';
      if (sumProblems.textContent !== pText) { sumProblems.textContent = pText; flash(sumProblems); }
      const reco = recommended();
      const recoKey = reco.join('|');
      if (sumReco.dataset.key !== recoKey) {
        sumReco.dataset.key = recoKey;
        sumReco.textContent = '';
        if (!reco.length) {
          const li = document.createElement('li');
          li.className = 'reco__empty';
          li.textContent = 'Marque uma peça no carro para começar';
          sumReco.appendChild(li);
        } else {
          reco.forEach((sv, i) => {
            const li = document.createElement('li');
            li.textContent = sv;
            li.style.animationDelay = `${i * 0.07}s`;
            sumReco.appendChild(li);
          });
        }
      }
    };

    // Painel "O que aconteceu aqui?"
    const placePop = (id) => {
      const scale = carmap.clientWidth / 240;
      const c = centerOf(id);
      const py = c.y * scale;
      const ph = pop.offsetHeight;
      const mapH = carmap.offsetHeight;
      let top = py + 22;
      if (top + ph > mapH + 8) top = py - 22 - ph;
      pop.style.top = `${clamp(top, -8, Math.max(-8, mapH - ph + 8))}px`;
    };
    const syncPop = () => {
      if (!popZone) return;
      $('[data-dmg-title]', pop).textContent = zoneLabel(popZone);
      $('[data-dmg-num]', pop).textContent = state.order.indexOf(popZone) + 1;
      const set = state.zones.get(popZone);
      $$('[data-dmg]', pop).forEach((b) => b.setAttribute('aria-pressed', String(set.has(b.dataset.dmg))));
      pop.classList.toggle('has-choice', set.size > 0);
    };
    const openPop = (id, { focus = false } = {}) => {
      if (!state.zones.has(id)) {
        state.zones.set(id, new Set());
        state.order.push(id);
        buzz();
        const z = zoneEl(id);
        if (z && !reduceMotion) { z.style.animation = 'none'; void z.getBBox(); z.style.animation = ''; }
      }
      if (popZone && popZone !== id) zoneEl(popZone)?.classList.remove('is-editing');
      popZone = id;
      zoneEl(id)?.classList.add('is-editing');
      hint?.classList.add('is-hidden');
      tip.hidden = true;
      status.textContent = '';
      render();
      syncPop();
      pop.hidden = false;
      placePop(id);
      pop.classList.remove('is-in'); void pop.offsetWidth; pop.classList.add('is-in');
      if (focus) $('[data-dmg]', pop)?.focus({ preventScroll: true });
    };
    const closePop = ({ refocus = false } = {}) => {
      if (!popZone) return;
      const id = popZone;
      popZone = null;
      pop.hidden = true;
      zoneEl(id)?.classList.remove('is-editing');
      render();
      if (refocus) zoneEl(id)?.focus({ preventScroll: true });
    };
    const removeZone = (id) => {
      state.zones.delete(id);
      state.order = state.order.filter((z) => z !== id);
      if (popZone === id) { popZone = null; pop.hidden = true; zoneEl(id)?.classList.remove('is-editing'); }
      highlight(id, false);
      render();
    };

    $$('[data-dmg]', pop).forEach((b) => b.addEventListener('click', () => {
      if (!popZone) return;
      const set = state.zones.get(popZone);
      const k = b.dataset.dmg;
      if (set.has(k)) set.delete(k);
      else {
        if (k === 'naosei') set.clear(); else set.delete('naosei');
        set.add(k);
        buzz();
      }
      syncPop();
      render();
    }));
    $('[data-dmg-ok]', pop)?.addEventListener('click', () => closePop({ refocus: true }));
    $('[data-dmg-close]', pop)?.addEventListener('click', () => closePop({ refocus: true }));
    $('[data-dmg-remove]', pop)?.addEventListener('click', () => { const id = popZone; removeZone(id); zoneEl(id)?.focus({ preventScroll: true }); });
    pop?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closePop({ refocus: true }); } });
    document.addEventListener('pointerdown', (e) => {
      if (!popZone) return;
      if (pop.contains(e.target) || e.target.closest('.zone') || e.target.closest('.dmg-item')) return;
      closePop();
    });
    window.addEventListener('resize', () => { if (popZone) placePop(popZone); });

    // Peças do carro: clique, teclado, dica flutuante e destaque
    const showTip = (zone, x, y) => {
      if (!tip || !carmap || popZone) return;
      const r = carmap.getBoundingClientRect();
      const t = typesText(zone.dataset.zone);
      tip.textContent = state.zones.has(zone.dataset.zone) ? `${zone.dataset.label}${t ? ` · ${t}` : ''}` : `${zone.dataset.label} · toque para marcar`;
      tip.style.left = `${clamp(x - r.left, 60, r.width - 60)}px`;
      tip.style.top = `${y - r.top}px`;
      tip.hidden = false;
    };
    zones.forEach((z) => {
      const id = z.dataset.zone;
      z.addEventListener('click', () => openPop(id));
      z.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop(id, { focus: true }); }
      });
      z.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') showTip(z, e.clientX, e.clientY); });
      z.addEventListener('pointerenter', () => highlight(id, true));
      z.addEventListener('pointerleave', () => { tip.hidden = true; highlight(id, false); });
      z.addEventListener('blur', () => { tip.hidden = true; });
    });

    // Inclinação 3D do carro acompanhando o mouse
    if (finePointer && !reduceMotion && carmap && svg) {
      carmap.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || popZone) return;
        const r = carmap.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        carmap.classList.add('is-tilting');
        svg.style.setProperty('--ty', `${(x * 14).toFixed(2)}deg`);
        svg.style.setProperty('--tx', `${(-y * 10).toFixed(2)}deg`);
      });
      carmap.addEventListener('pointerleave', () => {
        carmap.classList.remove('is-tilting');
        svg.style.setProperty('--ty', '0deg');
        svg.style.setProperty('--tx', '0deg');
      });
    }

    const toggleExtra = (label, force) => {
      const on = typeof force === 'boolean' ? force : !state.extras.has(label);
      if (on) { state.extras.add(label); buzz(); } else state.extras.delete(label);
      $$('[data-extra-zone]', qb).forEach((b) => { if (b.dataset.extraZone === label) b.setAttribute('aria-pressed', String(on)); });
      hint?.classList.add('is-hidden');
      status.textContent = '';
      render();
    };
    const toggleProblem = (id, force) => {
      const on = typeof force === 'boolean' ? force : !state.problems.has(id);
      if (on) state.problems.add(id); else state.problems.delete(id);
      $$('.problem[data-problem]', qb).forEach((b) => { if (b.dataset.problem === id) b.setAttribute('aria-pressed', String(on)); });
      status.textContent = '';
      render();
    };
    $$('[data-extra-zone]', qb).forEach((b) => b.addEventListener('click', () => toggleExtra(b.dataset.extraZone)));
    $$('.problem[data-problem]', qb).forEach((b) => b.addEventListener('click', () => toggleProblem(b.dataset.problem)));
    $('[data-clear-zones]', qb)?.addEventListener('click', () => {
      popZone = null;
      pop.hidden = true;
      zones.forEach((z) => z.classList.remove('is-editing', 'is-hl'));
      state.zones.clear();
      state.order = [];
      [...state.extras].forEach((l) => toggleExtra(l, false));
      render();
    });

    // Navegação entre passos
    const goTo = (n, { scroll = true } = {}) => {
      n = clamp(n, 1, panels.length);
      if (n !== 1) closePop();
      if (n === 2) derivedProblems().forEach((p) => toggleProblem(p, true));
      const back = n < state.step;
      state.step = n;
      panels.forEach((p) => {
        const on = Number(p.dataset.panel) === n;
        p.classList.toggle('is-active', on);
        p.classList.toggle('is-back', on && back);
      });
      stepBtns.forEach((b) => {
        const s = Number(b.dataset.goto);
        b.classList.toggle('is-active', s === n);
        b.classList.toggle('is-done', s < n);
        if (s === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      bar?.style.setProperty('--qb', (n / panels.length).toFixed(4));
      if (n === 1) setMapH();
      if (scroll) {
        const top = qb.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) {
          window.scrollTo({ top: window.scrollY + top - 90, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }
      if (n === 3) setTimeout(() => $('#f-nome')?.focus({ preventScroll: true }), 350);
    };
    stepBtns.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.goto))));
    $$('[data-next]', qb).forEach((b) => b.addEventListener('click', () => {
      if (state.step === 1 && !state.order.length && !state.extras.size) {
        status.textContent = 'Dica: marcar onde está o dano ajuda o especialista — mas você pode seguir assim mesmo.';
      }
      goTo(state.step + 1);
    }));
    $$('[data-prev]', qb).forEach((b) => b.addEventListener('click', () => goTo(state.step - 1)));

    // Envio pelo WhatsApp
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = form.nome.value.trim();
      const carro = form.carro.value.trim();
      const detalhes = form.mensagem.value.trim();
      const nomeField = form.nome.closest('.field');
      if (!nome) {
        nomeField.classList.remove('is-invalid'); void nomeField.offsetWidth; nomeField.classList.add('is-invalid');
        status.textContent = 'Por favor, informe seu nome.';
        form.nome.focus();
        return;
      }
      nomeField.classList.remove('is-invalid');
      const reco = recommended();
      const probs = [...allProblems()];
      const pecas = state.order.map((id, i) => `${i + 1}. ${zoneLabel(id)}${typesOf(id).length ? ` — ${typesText(id).toLowerCase().replace(/ · /g, ', ')}` : ''}`);
      const lines = [
        'Olá! Vim pelo site e montei meu orçamento:',
        '',
        `*Nome:* ${nome}`,
        carro ? `*Carro:* ${carro}` : null,
        pecas.length ? '*Onde está o dano:*' : null,
        ...pecas,
        state.extras.size ? `*Também:* ${[...state.extras].join(', ')}` : null,
        probs.length ? `*Problema:* ${probs.map((p) => PROBLEMAS[p].label).join(', ')}` : null,
        reco.length ? `*Serviço de interesse:* ${reco.join(', ')}` : null,
        detalhes ? `*Detalhes:* ${detalhes}` : null,
        '',
        'Vou enviar as fotos aqui na conversa.',
      ].filter((l) => l !== null);
      status.textContent = 'Abrindo o WhatsApp…';
      track('whatsapp_click', { click_location: 'orcamento-interativo', service: reco.join(', '), link_url: 'wa.me' });
      openWhatsApp(lines.join('\n'));
      setTimeout(() => { status.textContent = ''; }, 4000);
    });

    // Permite pré-selecionar um problema pelo endereço: index.html?problema=amassado#orcamento
    const pre = new URLSearchParams(window.location.search).get('problema');
    if (pre && PROBLEMAS[pre]) toggleProblem(pre, true);

    render();
  }

  /* ===========================================================
     WhatsApp flutuante: recolhe sobre o rodapé
     =========================================================== */
  const waFloat = $('.wa-float');
  if (waFloat && 'IntersectionObserver' in window) {
    const hideOn = new Set();
    const targets = [$('.footer')].filter(Boolean);
    const wio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) hideOn.add(e.target); else hideOn.delete(e.target); });
      waFloat.classList.toggle('is-tucked', hideOn.size > 0);
    }, { threshold: 0.15 });
    targets.forEach((t) => wio.observe(t));
  }

  /* ===========================================================
     Cursor personalizado (apenas mouse)
     =========================================================== */
  const cursor = $('[data-cursor]');
  if (cursor && finePointer && !reduceMotion) {
    const label = $('[data-cursor-label]', cursor);
    let tx = -100, ty = -100, x = -100, y = -100;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add('is-visible');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => {
      const flip = e.target.closest('[data-flip]');
      const interactive = e.target.closest('a, button, summary, .zone, input, textarea, select, label');
      cursor.classList.toggle('is-label', !!flip);
      cursor.classList.toggle('is-link', !flip && !!interactive);
      if (label) label.textContent = flip ? (flip.classList.contains('is-flipped') ? 'Ver antes' : 'Ver depois') : '';
    });
    document.addEventListener('click', (e) => {
      const flip = e.target.closest('[data-flip]');
      if (flip && label) label.textContent = flip.classList.contains('is-flipped') ? 'Ver antes' : 'Ver depois';
    });
    const follow = () => {
      x = lerp(x, tx, 0.2);
      y = lerp(y, ty, 0.2);
      cursor.style.setProperty('--cx', `${x.toFixed(1)}px`);
      cursor.style.setProperty('--cy', `${y.toFixed(1)}px`);
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }
})();
