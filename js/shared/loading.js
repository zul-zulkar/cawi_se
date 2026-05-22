/* ====== Loading UX helpers — overlay + button spinner ====== */
(function () {
  // Full-screen loading overlay (uses #submitLoadingOverlay if present)
  window.showLoadingOverlay = function (msg, sub) {
    let el = document.getElementById('submitLoadingOverlay');
    if (!el) return;
    const txt = document.getElementById('submitLoadingText');
    if (txt && msg) txt.textContent = msg;
    const subEl = el.querySelector('.cawi-loading-sub');
    if (subEl && sub != null) subEl.textContent = sub;
    el.style.display = 'flex';
    requestAnimationFrame(() => el.classList.add('show'));
  };
  window.hideLoadingOverlay = function () {
    const el = document.getElementById('submitLoadingOverlay');
    if (!el) return;
    el.classList.remove('show');
    setTimeout(() => { el.style.display = 'none'; }, 220);
  };

  // Inline button loading state: replaces label with spinner + text
  // Usage: const restore = setButtonLoading(btn, 'Mengirim…'); ...; restore();
  window.setButtonLoading = function (btn, label) {
    if (!btn) return () => {};
    if (btn.dataset.loading === '1') return () => {};
    btn.dataset.loading = '1';
    btn.dataset.prevLabel = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span class="btn-label">' +
      (label || 'Memproses…') + '</span>';
    return function restore() {
      if (btn.dataset.loading !== '1') return;
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.innerHTML = btn.dataset.prevLabel || '';
      delete btn.dataset.loading;
      delete btn.dataset.prevLabel;
    };
  };

  // Toast (used by settings reset, draft save, etc.)
  window.showToast = function (msg, kind) {
    let stack = document.getElementById('cawiToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'cawiToastStack';
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || 'ok');
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-6px)';
      setTimeout(() => t.remove(), 250);
    }, 2400);
  };
})();
