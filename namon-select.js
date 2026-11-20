/* Namon Select — แทน <select class="nd-input"> ด้วยปุ่ม + รายการเลือกของ design system
   ค่าอยู่ที่ <select> เดิม (ส่งฟอร์ม/อ่านค่า/ฟัง change ได้เหมือนเดิม) · คีย์บอร์ด: ↑ ↓ Enter Esc Home End พิมพ์ตัวอักษร
   ใช้: <script src="namon-select.js"></script> — จับ select.nd-input ที่เพิ่มทีหลังด้วย MutationObserver เอง */
(function () {
  var open = null;
  function close() { if (!open) return; open.menu.remove(); open.wrap.setAttribute('data-open', 'false'); open.btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', outside, true); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', close); open = null; }
  function outside(e) { if (open && !open.wrap.contains(e.target) && !open.menu.contains(e.target)) close(); }
  function onScroll(e) { if (open && !open.menu.contains(e.target)) close(); }
  function label(sel) { var o = sel.options[sel.selectedIndex]; return o ? o.text : ''; }
  function paint(st) { var t = label(st.sel), ph = !t || (st.sel.selectedIndex === 0 && st.sel.options[0] && st.sel.options[0].value === '' && st.sel.options[0].disabled); st.val.textContent = t || ' '; st.val.setAttribute('data-ph', String(!!ph)); st.btn.disabled = st.sel.disabled; }
  function openMenu(st) {
    if (open && open.sel === st.sel) { close(); return; } close(); var sel = st.sel, menu = document.createElement('ul'); menu.className = 'nd-select__menu'; menu.setAttribute('role', 'listbox'); menu.tabIndex = -1;
    var act = sel.selectedIndex; [].forEach.call(sel.options, function (o, i) { var li = document.createElement('li'); li.className = 'nd-select__opt'; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel.selectedIndex)); li.setAttribute('data-i', i); if (o.disabled) li.setAttribute('aria-disabled', 'true'); li.setAttribute('data-active', String(i === act)); li.textContent = o.text; menu.appendChild(li); });
    document.body.appendChild(menu); var r = st.btn.getBoundingClientRect(), mh = Math.min(menu.scrollHeight, 280), below = innerHeight - r.bottom - 8, up = below < mh && r.top > below;
    menu.style.width = r.width + 'px'; menu.style.left = Math.max(8, Math.min(r.left, innerWidth - r.width - 8)) + 'px'; menu.style.maxHeight = Math.min(280, Math.max(120, up ? r.top - 8 : below)) + 'px'; menu.style[up ? 'bottom' : 'top'] = up ? (innerHeight - r.top + 4) + 'px' : (r.bottom + 4) + 'px';
    st.wrap.setAttribute('data-open', 'true'); st.btn.setAttribute('aria-expanded', 'true'); open = { sel: sel, wrap: st.wrap, btn: st.btn, menu: menu, act: act, st: st };
    var sw = menu.querySelector('[aria-selected="true"]'); if (sw) sw.scrollIntoView({ block: 'nearest' });
    menu.addEventListener('mousemove', function (e) { var li = e.target.closest('.nd-select__opt'); if (li) setActive(+li.getAttribute('data-i')); });
    menu.addEventListener('mousedown', function (e) { e.preventDefault(); var li = e.target.closest('.nd-select__opt'); if (li && !li.hasAttribute('aria-disabled')) choose(+li.getAttribute('data-i')); });
    document.addEventListener('mousedown', outside, true); window.addEventListener('scroll', onScroll, true); window.addEventListener('resize', close);
  }
  function setActive(i) { if (!open) return; open.act = i; [].forEach.call(open.menu.children, function (li, k) { li.setAttribute('data-active', String(k === i)); }); var a = open.menu.children[i]; if (a) a.scrollIntoView({ block: 'nearest' }); }
  function choose(i) { var st = open.st, sel = st.sel; close(); if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } paint(st); st.btn.focus(); }
  function step(d) { var n = open.st.sel.options.length, i = open.act; for (var k = 0; k < n; k++) { i = (i + d + n) % n; if (!open.st.sel.options[i].disabled) break; } setActive(i); }
  function enhance(sel) {
    if (sel.__nd || sel.multiple || sel.size > 1) return; var wrap = document.createElement('span'); wrap.className = 'nd-select'; sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'nd-select__btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    var val = document.createElement('span'); val.className = 'nd-select__val'; var ch = document.createElement('span'); ch.className = 'nd-select__chev'; ch.setAttribute('aria-hidden', 'true'); btn.appendChild(val); btn.appendChild(ch); wrap.appendChild(btn);
    sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true'); var st = { sel: sel, wrap: wrap, btn: btn, val: val }; sel.__nd = st; paint(st);
    btn.addEventListener('click', function () { openMenu(st); });
    btn.addEventListener('keydown', function (e) { var k = e.key;
      if (!open) { if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); openMenu(st); } return; }
      if (k === 'Escape') { e.preventDefault(); close(); } else if (k === 'ArrowDown') { e.preventDefault(); step(1); } else if (k === 'ArrowUp') { e.preventDefault(); step(-1); } else if (k === 'Home') { e.preventDefault(); setActive(0); } else if (k === 'End') { e.preventDefault(); setActive(sel.options.length - 1); } else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(open.act); } else if (k === 'Tab') { close(); }
      else if (k.length === 1) { var q = k.toLowerCase(); for (var j = 1; j <= sel.options.length; j++) { var i = (open.act + j) % sel.options.length; if (sel.options[i].text.toLowerCase().indexOf(q) === 0) { setActive(i); break; } } } });
    sel.addEventListener('change', function () { paint(st); });
    var lab = sel.closest('label'); if (lab) lab.addEventListener('click', function (e) { if (e.target !== btn && !btn.disabled) { e.preventDefault(); btn.focus(); } });
  }
  function scan(root) { [].forEach.call((root || document).querySelectorAll('select.nd-input'), enhance); }
  function start() { scan(); new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) { if (n.matches && n.matches('select.nd-input')) enhance(n); else scan(n); } }); }); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.ndSelect = { enhance: enhance, scan: scan, repaint: function (sel) { if (sel.__nd) paint(sel.__nd); } };
})();
