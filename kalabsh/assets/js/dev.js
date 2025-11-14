// Developer inline editing mode for content pages
(function(){
  // Preferences keys
  const PREF_AUTO = 'devAutoEnable';
  const PREF_POS = 'devBarPos'; // 'start' | 'end'

  const slugFromPath = () => {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    const base = file.endsWith('.html') ? file.slice(0, -5) : (file || 'index');
    return base || 'index';
  };

  const page = slugFromPath();

  const setNested = (obj, path, value) => {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  };

  const createBar = () => {
    const bar = document.createElement('div');
    bar.id = 'devBar';
    bar.style.position = 'fixed';
    // position applied later via applyBarPosition
    bar.style.insetBlockStart = '10px';
    bar.style.zIndex = '9999';
    bar.style.background = 'rgba(255,255,255,0.95)';
    bar.style.border = '2px solid #2b7';
    bar.style.borderRadius = '10px';
    bar.style.padding = '10px';
    bar.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
    bar.style.fontFamily = 'inherit';

    const tokenLabel = document.createElement('label');
    tokenLabel.textContent = 'رمز الإدارة:';
    tokenLabel.style.marginInlineEnd = '8px';

    const tokenInput = document.createElement('input');
    tokenInput.type = 'text';
    tokenInput.id = 'devTokenInput';
    tokenInput.placeholder = 'أدخل رمز الإدارة';
    tokenInput.value = localStorage.getItem('adminToken') || '';
    tokenInput.style.minWidth = '220px';
    tokenInput.style.marginInlineEnd = '8px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'حفظ الصفحة';
    saveBtn.id = 'devSaveBtn';
    saveBtn.style.marginInlineEnd = '8px';

    const advBtn = document.createElement('button');
    advBtn.textContent = 'تحرير متقدّم';
    advBtn.id = 'devAdvancedEditBtn';
    advBtn.style.marginInlineEnd = '8px';

    const prefsWrap = document.createElement('span');
    prefsWrap.style.marginInlineStart = '10px';

    const autoLabel = document.createElement('label');
    autoLabel.style.marginInlineStart = '6px';
    const autoEnable = document.createElement('input');
    autoEnable.type = 'checkbox';
    autoEnable.id = 'devAutoEnable';
    autoEnable.checked = (localStorage.getItem(PREF_AUTO) === '1');
    autoLabel.append(' تشغيل تلقائي');

    const posLabel = document.createElement('label');
    posLabel.style.marginInlineStart = '10px';
    posLabel.textContent = 'موضع الشريط:';
    const posSelect = document.createElement('select');
    posSelect.id = 'devBarPos';
    ['start','end'].forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = (v === 'start') ? 'أعلى يسار' : 'أعلى يمين';
      posSelect.appendChild(opt);
    });
    posSelect.value = localStorage.getItem(PREF_POS) || 'start';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'إغلاق الوضع';

    bar.appendChild(tokenLabel);
    bar.appendChild(tokenInput);
    bar.appendChild(saveBtn);
    bar.appendChild(advBtn);
    bar.appendChild(closeBtn);
    prefsWrap.appendChild(autoEnable);
    prefsWrap.appendChild(autoLabel);
    prefsWrap.appendChild(posLabel);
    prefsWrap.appendChild(posSelect);
    bar.appendChild(prefsWrap);

    document.body.appendChild(bar);

    const applyBarPosition = () => {
      const pos = posSelect.value || 'start';
      bar.style.insetInlineStart = '';
      bar.style.insetInlineEnd = '';
      if (pos === 'start') bar.style.insetInlineStart = '10px';
      else bar.style.insetInlineEnd = '10px';
    };
    applyBarPosition();

    tokenInput.addEventListener('change', () => {
      localStorage.setItem('adminToken', tokenInput.value.trim());
    });

    autoEnable.addEventListener('change', () => {
      localStorage.setItem(PREF_AUTO, autoEnable.checked ? '1' : '0');
    });

    posSelect.addEventListener('change', () => {
      localStorage.setItem(PREF_POS, posSelect.value);
      applyBarPosition();
    });

    saveBtn.addEventListener('click', async () => {
      const adminToken = localStorage.getItem('adminToken') || '';
      if (!adminToken) { alert('يرجى إدخال رمز الإدارة'); return; }
      let data = {};
      try {
        const resp = await fetch(`content.php?page=${page}`);
        data = await resp.json();
      } catch {}

      document.querySelectorAll('[data-editable]').forEach(el => {
        const path = el.getAttribute('data-editable');
        const val = (el.textContent || '').trim();
        if (path) setNested(data, path, val);
      });

      // Gallery repeater support
      if (page === 'gallery') {
        const grid = document.querySelector('.gallery-grid');
        if (grid) {
          const items = [];
          grid.querySelectorAll('.photo').forEach(photo => {
            const img = photo.querySelector('img');
            const src = img ? img.src : '';
            const alt = img ? img.alt : (photo.getAttribute('aria-label') || '');
            if (src) items.push({ src, alt });
          });
          data.gallery_images = items;
        }
      }

      try {
        const resp = await fetch(`save_content.php?page=${page}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-ADMIN-TOKEN': adminToken },
          body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        alert('تم حفظ الصفحة بنجاح');
      } catch (e) {
        console.error(e);
        alert('فشل حفظ الصفحة');
      }
    });

    closeBtn.addEventListener('click', () => {
      disableDevMode();
      // remove hash
      if (location.hash === '#dev') {
        history.replaceState(null, '', location.pathname + location.search);
      }
    });

    advBtn.addEventListener('click', () => {
      toggleAdvancedEdit();
    });
  };

  const enableHighlights = () => {
    const style = document.createElement('style');
    style.id = 'devHighlightStyle';
    style.textContent = '[data-editable]{outline:2px dashed #2b7; padding:2px; border-radius:6px;}';
    document.head.appendChild(style);
  };

  const enableDevMode = () => {
    if (document.getElementById('devBar')) return;
    // make text nodes editable
    document.querySelectorAll('[data-editable]').forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
    });
    // Allow editing alt/src via prompt for items with hints
    document.querySelectorAll('[data-editable-src], [data-editable-aria-label]').forEach(el => {
      el.addEventListener('dblclick', () => {
        const img = el.querySelector('img');
        if (img && el.hasAttribute('data-editable-src')) {
          const nextSrc = prompt('رابط الصورة (src):', img.src || '');
          if (nextSrc !== null) img.src = nextSrc.trim();
        }
        if (img && el.hasAttribute('data-editable-aria-label')) {
          const nextAlt = prompt('نص بديل (alt):', img.alt || el.getAttribute('aria-label') || '');
          if (nextAlt !== null) { img.alt = nextAlt.trim(); el.setAttribute('aria-label', nextAlt.trim()); }
        }
      });
    });
    enableHighlights();
    createBar();
    wireGalleryControls();
  };

  const disableDevMode = () => {
    document.querySelectorAll('[data-editable]').forEach(el => {
      el.removeAttribute('contenteditable');
    });
    document.getElementById('devBar')?.remove();
    document.getElementById('devHighlightStyle')?.remove();
    document.querySelectorAll('.dev-photo-controls').forEach(el => el.remove());
    disableAdvancedEdit();
  };

  const shouldEnable = () => {
    const params = new URLSearchParams(location.search);
    // إزالة أي تفعيل تلقائي قبل المصادقة؛ التفعيل فقط بطلب صريح (#dev أو ?dev=1)
    return location.hash === '#dev' || params.get('dev') === '1';
  };

  const checkAuthStatus = async () => {
    try {
      const resp = await fetch('assets/php/admin_gate.php?action=status', { credentials: 'include' });
      const json = await resp.json();
      return !!(json && json.authenticated);
    } catch { return false; }
  };

  const showAuthModal = () => {
    if (document.getElementById('devAuthModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'devAuthModal';
    wrap.style.position = 'fixed';
    wrap.style.inset = '0';
    wrap.style.background = 'rgba(0,0,0,0.4)';
    wrap.style.zIndex = '10000';
    const card = document.createElement('div');
    card.style.background = '#fff';
    card.style.borderRadius = '8px';
    card.style.minWidth = '320px';
    card.style.maxWidth = '90vw';
    card.style.margin = '10vh auto';
    card.style.padding = '16px';
    card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
    const title = document.createElement('h4'); title.textContent = 'دخول المطوّر';
    const info = document.createElement('p'); info.textContent = 'سيتم إرسال رمز التحقق عبر تيليجرام إلى المطوّر.';
    const sendBtn = document.createElement('button'); sendBtn.textContent = 'إرسال رمز التحقق'; sendBtn.style.marginInlineEnd = '8px';
    const codeInput = document.createElement('input'); codeInput.type = 'text'; codeInput.placeholder = 'أدخل الرمز'; codeInput.style.marginInlineEnd = '8px';
    const verifyBtn = document.createElement('button'); verifyBtn.textContent = 'تأكيد';
    const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'إلغاء'; cancelBtn.style.marginInlineStart = '8px';
    const actions = document.createElement('div'); actions.style.marginTop = '10px'; actions.append(sendBtn, codeInput, verifyBtn, cancelBtn);
    card.append(title, info, actions);
    wrap.appendChild(card);
    document.body.appendChild(wrap);

    sendBtn.addEventListener('click', async () => {
      sendBtn.disabled = true; sendBtn.textContent = 'يتم الإرسال...';
      try {
        const resp = await fetch('assets/php/admin_gate.php?action=start_otp', { credentials: 'include' });
        const json = await resp.json();
        if (json && json.ok) {
          const ch = json.channel ? ` (القناة: ${json.channel})` : '';
          sendBtn.textContent = 'تم إرسال الرمز' + ch;
        } else {
          const err = json && json.error ? `: ${json.error}` : '';
          sendBtn.textContent = 'فشل الإرسال' + err;
          sendBtn.disabled = false;
        }
      } catch (e) {
        sendBtn.textContent = 'خطأ أثناء الإرسال';
        sendBtn.disabled = false;
      }
    });

    verifyBtn.addEventListener('click', async () => {
      const code = (codeInput.value || '').trim(); if (!code) return;
      verifyBtn.disabled = true; verifyBtn.textContent = 'جاري التحقق...';
      try {
        const resp = await fetch('assets/php/admin_gate.php?action=verify_otp', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
        });
        const json = await resp.json();
        if (json && json.ok) { wrap.remove(); enableDevMode(); }
        else { verifyBtn.textContent = 'رمز غير صحيح'; verifyBtn.disabled = false; }
      } catch { verifyBtn.textContent = 'خطأ بالتحقق'; verifyBtn.disabled = false; }
    });

    cancelBtn.addEventListener('click', () => wrap.remove());
  };

  window.addEventListener('hashchange', () => {
    if (location.hash === '#dev') enableDevMode(); else disableDevMode();
  });

  const maybeEnable = async () => {
    if (!shouldEnable()) return;
    const authed = await checkAuthStatus();
    if (authed) enableDevMode(); else showAuthModal();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // إخفاء أي روابط مطوّر من الواجهة العامة
      try { document.querySelectorAll('a[href="#dev"]').forEach(a => a.style.display = 'none'); } catch {}
      maybeEnable();
    });
  } else {
    try { document.querySelectorAll('a[href="#dev"]').forEach(a => a.style.display = 'none'); } catch {}
    maybeEnable();
  }

  // اختصار لوحة مفاتيح لفتح نافذة دخول المطوّر بدون إظهار أدوات التعديل
  window.addEventListener('keydown', async (e) => {
    // Ctrl + Alt + D أو Ctrl + Shift + D
    const isTrigger = (e.ctrlKey && (e.altKey || e.shiftKey) && (e.key || '').toLowerCase() === 'd');
    if (!isTrigger) return;
    e.preventDefault();
    const authed = await checkAuthStatus();
    if (authed) { enableDevMode(); }
    else { showAuthModal(); }
  });

  // Advanced edit dialog
  let advancedMode = false;
  const toggleAdvancedEdit = () => {
    advancedMode = !advancedMode;
    if (advancedMode) {
      wireAdvancedEdit();
      document.getElementById('devAdvancedEditBtn')?.classList.add('active');
    } else {
      disableAdvancedEdit();
      document.getElementById('devAdvancedEditBtn')?.classList.remove('active');
    }
  };

  const wireAdvancedEdit = () => {
    document.querySelectorAll('[data-editable]').forEach(el => {
      el.addEventListener('click', onEditableClick);
      el.style.cursor = 'text';
    });
  };

  const disableAdvancedEdit = () => {
    document.querySelectorAll('[data-editable]').forEach(el => {
      el.removeEventListener('click', onEditableClick);
      el.style.cursor = '';
    });
    document.getElementById('devModal')?.remove();
    document.getElementById('devModalStyle')?.remove();
  };

  const onEditableClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openEditModal(e.currentTarget);
  };

  const ensureModalStyles = () => {
    if (document.getElementById('devModalStyle')) return;
    const style = document.createElement('style');
    style.id = 'devModalStyle';
    style.textContent = `#devModal{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center}#devModal .card{background:#fff;border-radius:8px;min-width:320px;max-width:80vw;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.25)}#devModal .actions{margin-top:10px;display:flex;gap:8px;justify-content:flex-end}`;
    document.head.appendChild(style);
  };

  const openEditModal = (targetEl) => {
    ensureModalStyles();
    const modal = document.createElement('div');
    modal.id = 'devModal';
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('h4');
    title.textContent = 'تحرير المحتوى';
    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.minHeight = '120px';
    textarea.value = (targetEl.textContent || '').trim();
    const actions = document.createElement('div');
    actions.className = 'actions';
    const cancel = document.createElement('button');
    cancel.textContent = 'إلغاء';
    const ok = document.createElement('button');
    ok.textContent = 'حفظ';
    actions.append(cancel, ok);
    card.append(title, textarea, actions);
    modal.appendChild(card);
    document.body.appendChild(modal);
    cancel.addEventListener('click', () => modal.remove());
    ok.addEventListener('click', () => { targetEl.textContent = textarea.value; modal.remove(); });
  };

  // Gallery item controls (up/down/delete)
  const wireGalleryControls = () => {
    if (page !== 'gallery') return;
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    grid.querySelectorAll('.photo').forEach(photo => {
      if (photo.querySelector('.dev-photo-controls')) return;
      const ctrl = document.createElement('div');
      ctrl.className = 'dev-photo-controls';
      ctrl.style.position = 'absolute';
      ctrl.style.insetInlineEnd = '6px';
      ctrl.style.insetBlockStart = '6px';
      ctrl.style.background = 'rgba(0,0,0,0.6)';
      ctrl.style.color = '#fff';
      ctrl.style.borderRadius = '6px';
      ctrl.style.padding = '2px 4px';
      ctrl.style.display = 'flex';
      ctrl.style.gap = '4px';
      ctrl.style.fontSize = '12px';
      ctrl.style.pointerEvents = 'auto';

      const btnUp = document.createElement('button'); btnUp.textContent = '▲';
      const btnDown = document.createElement('button'); btnDown.textContent = '▼';
      const btnDel = document.createElement('button'); btnDel.textContent = '✖';
      [btnUp, btnDown, btnDel].forEach(b => { b.style.background='transparent'; b.style.color='#fff'; b.style.border='none'; b.style.cursor='pointer'; });
      ctrl.append(btnUp, btnDown, btnDel);
      photo.style.position = 'relative';
      photo.appendChild(ctrl);

      btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        const prev = photo.previousElementSibling;
        if (prev && prev.classList.contains('photo')) {
          photo.parentElement.insertBefore(photo, prev);
        }
      });
      btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = photo.nextElementSibling;
        if (next && next.classList.contains('photo')) {
          photo.parentElement.insertBefore(next, photo);
        }
      });
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        photo.remove();
      });
    });
  };
})();