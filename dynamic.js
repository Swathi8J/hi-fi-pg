/* ============================================================
   DYNAMIC.JS — All-page animations & interactions
   ============================================================ */

// ── 1. TYPING EFFECT on login subtitle ──────────────────────
function initTypingEffect() {
  const el = document.querySelector('.login-sub');
  if (!el) return;
  const texts = ['Sign in to manage your PG', 'Welcome to Hi-Fi PG', 'Your smart PG manager'];
  let ti = 0, ci = 0, deleting = false;
  function type() {
    const current = texts[ti];
    el.textContent = deleting ? current.slice(0, ci--) : current.slice(0, ci++);
    if (!deleting && ci > current.length)      { deleting = true; setTimeout(type, 1200); return; }
    if (deleting && ci < 0)                    { deleting = false; ti = (ti + 1) % texts.length; }
    setTimeout(type, deleting ? 40 : 80);
  }
  type();
}

// ── 2. RIPPLE EFFECT on buttons ─────────────────────────────
function addRipple(e) {
  const btn  = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const r    = document.createElement('span');
  r.className = 'ripple';
  r.style.cssText = `left:${e.clientX-rect.left}px;top:${e.clientY-rect.top}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
}
function initRipples() {
  document.querySelectorAll('.btn-primary,.btn-secondary,.login-btn,.nav-btn,.pg-card,.branch-card,.auth-tab').forEach(btn => {
    btn.addEventListener('click', addRipple);
  });
}

// ── 3. FORM FIELD FLOAT LABELS ───────────────────────────────
function initFloatLabels() {
  document.querySelectorAll('.form-group input, .form-group textarea, .form-group select').forEach(input => {
    const label = input.previousElementSibling;
    if (!label || label.tagName !== 'LABEL') return;
    input.addEventListener('focus',  () => label.classList.add('float-up'));
    input.addEventListener('blur',   () => { if (!input.value) label.classList.remove('float-up'); });
    if (input.value) label.classList.add('float-up');
  });
}

// ── 4. STAGGER ANIMATE form fieldsets on page load ──────────
function animateFormIn() {
  const items = document.querySelectorAll('#page-admission.active fieldset, #page-admission.active .card > *');
  items.forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(20px)';
    el.style.transition = `opacity 0.4s ${i * 0.08}s ease, transform 0.4s ${i * 0.08}s ease`;
    requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    });
  });
}

// ── 5. TABLE ROW STAGGER on students list ───────────────────
function animateTableRows() {
  document.querySelectorAll('#studentsBody tr').forEach((row, i) => {
    row.style.opacity   = '0';
    row.style.transform = 'translateX(-16px)';
    row.style.transition = `opacity 0.3s ${i * 0.04}s ease, transform 0.3s ${i * 0.04}s ease`;
    requestAnimationFrame(() => {
      row.style.opacity   = '1';
      row.style.transform = 'translateX(0)';
    });
  });
}

// ── 6. HEADER SCROLL EFFECT ──────────────────────────────────
function initHeaderScroll() {
  const header = document.querySelector('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.style.backdropFilter = 'blur(20px)';
      header.style.boxShadow      = '0 4px 24px rgba(0,0,0,0.4)';
    } else {
      header.style.backdropFilter = '';
      header.style.boxShadow      = '0 2px 8px rgba(0,0,0,0.2)';
    }
  }, { passive: true });
}

// ── 7. SMOOTH PAGE TRANSITIONS ───────────────────────────────
function pageTransition(showId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => {
    if (p.classList.contains('active') && p.id !== showId) {
      p.style.animation = 'pageOut 0.25s ease forwards';
      setTimeout(() => { p.classList.remove('active'); p.style.animation = ''; }, 250);
    }
  });
  const next = document.getElementById(showId);
  if (next) {
    setTimeout(() => {
      next.classList.add('active');
      next.style.animation = 'pageIn 0.35s ease forwards';
      if (showId === 'page-admission') animateFormIn();
      if (showId === 'page-students')  setTimeout(animateTableRows, 300);
    }, 200);
  }
}

// ── 8. CARD TILT EFFECT on pg-cards ─────────────────────────
function initCardTilt() {
  document.querySelectorAll('.pg-card, .branch-card, .svc-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-8px) scale(1.03)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s ease';
    });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease';
    });
  });
}

// ── 9. LIVE CLOCK in header ──────────────────────────────────
function initClock() {
  const nav = document.querySelector('header nav');
  if (!nav) return;
  const clock = document.createElement('div');
  clock.id = 'liveClock';
  clock.style.cssText = 'color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:1px;margin-right:8px;font-variant-numeric:tabular-nums;';
  nav.insertBefore(clock, nav.firstChild);
  function tick() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

// ── 10. TOAST PROGRESS BAR ───────────────────────────────────
function enhanceToast() {
  const orig = window.showToast;
  if (!orig) return;
  window.showToast = function(msg, isError = false) {
    orig(msg, isError);
    const t = document.getElementById('toast');
    if (!t) return;
    let bar = t.querySelector('.toast-bar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'toast-bar'; t.appendChild(bar); }
    bar.style.animation = 'none';
    requestAnimationFrame(() => { bar.style.animation = 'toastProgress 3.5s linear forwards'; });
  };
}

// ── 11. INPUT SHAKE on validation error ─────────────────────
function shakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

// ── 12. PARTICLE MOUSE INTERACTION ──────────────────────────
function initMouseParticles() {
  const canvas = document.getElementById('loginCanvas') || document.getElementById('particleCanvas');
  if (!canvas) return;
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    window._mouseX = e.clientX - rect.left;
    window._mouseY = e.clientY - rect.top;
  });
}

// ── 13. SUMMARY BAR COUNT-UP ────────────────────────────────
function animateSummaryNumbers() {
  document.querySelectorAll('.summary-value').forEach(el => {
    const text = el.textContent;
    const num  = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num === 0) return;
    const prefix = text.startsWith('₹') ? '₹' : '';
    let start = 0;
    const step = num / 30;
    const timer = setInterval(() => {
      start = Math.min(start + step, num);
      el.textContent = prefix + Math.round(start).toLocaleString('en-IN');
      if (start >= num) clearInterval(timer);
    }, 30);
  });
}

// ── 14. INIT ALL ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTypingEffect();
  initRipples();
  initHeaderScroll();
  initMouseParticles();
  enhanceToast();

  // Re-init ripples when DOM changes (new buttons added)
  const observer = new MutationObserver(() => initRipples());
  observer.observe(document.body, { childList: true, subtree: true });
});

// Re-init tilt when landing page shown
const _origSelectGender = window.selectGender;
document.addEventListener('landingShown', () => {
  initCardTilt();
  initClock();
});

// Patch enterApp to add clock + tilt
const _patchEnterApp = setInterval(() => {
  if (typeof enterApp !== 'undefined') {
    clearInterval(_patchEnterApp);
    const _orig = enterApp;
    window.enterApp = function() {
      _orig();
      setTimeout(() => { initClock(); animateFormIn(); }, 100);
    };
  }
}, 100);

// Patch loadAndRender to animate rows
const _patchRender = setInterval(() => {
  if (typeof loadAndRender !== 'undefined') {
    clearInterval(_patchRender);
    const _orig = loadAndRender;
    window.loadAndRender = async function() {
      await _orig();
      animateTableRows();
      animateSummaryNumbers();
    };
  }
}, 100);

// Patch showPage for transitions
const _patchShowPage = setInterval(() => {
  if (typeof showPage !== 'undefined') {
    clearInterval(_patchShowPage);
    const _orig = showPage;
    window.showPage = function(page) {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      pageTransition('page-' + page);
      if (page === 'students') setTimeout(() => { loadAndRender(); }, 250);
    };
  }
}, 100);
