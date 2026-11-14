/* ตัวเลือก "คลินิก" + "วันที่" บนหัวหน้าทะเบียนรายการปรับปรุง UI/UX (ผู้ใช้ 11 พ.ย. 69)
   เพิ่มรอบใหม่ = เพิ่มแถวใน TOR_UPDATES (href = หน้า + #รอบ) · หน้าไหนมี <div id="tor-nav"></div> ก็ได้ตัวเลือกนี้ */
(function () {
  var TOR_UPDATES = [
    { clinic: 'งานการเงิน (คอมเมนต์ลูกค้า)', date: '14 พ.ย. 2569', note: '18 ข้อ · ปิดสิทธิ · ใบเสร็จ · ตัดยอด · นำเข้ารายจ่าย/รายรับอื่นๆ', href: 'tor-k9-addiction.html#round-2569-11-14-finance' },
    { clinic: 'คลินิกบำบัดสารเสพติด (คทง.9)', date: '12 พ.ย. 2569', note: 'Design system ข้อ 4–14', href: 'tor-k9-addiction.html#round-2569-11-12-ds' },
    { clinic: 'คลินิกสุขภาพจิต (คทง.9)', date: '12 พ.ย. 2569', note: 'เสนอแก้ไข คลินิกสุขภาพจิต 12 ต.ค. 69 · 9 แถบตามบทบาท', href: 'tor-k9-addiction.html#mh-clinic' },
    { clinic: 'งานสุขภาพจิตทั่วไป (คทง.9)', date: '12 พ.ย. 2569', note: 'เสนอแก้ไข งานสุขภาพจิตทั่วไป 12 ต.ค. 69 · เชิงรับ/เชิงรุก', href: 'tor-k9-addiction.html#mh-general' },
    { clinic: 'งานพัฒนาการ สุขภาพจิต (คทง.9)', date: '12 พ.ย. 2569', note: 'เสนอแก้ไข งานพัฒนาการ 12 ต.ค. 69 · DSPM รายข้อ', href: 'tor-k9-addiction.html#round-2569-11-12' },
    { clinic: 'คลินิกบำบัดสารเสพติด (คทง.9)', date: '11 พ.ย. 2569', note: 'SUD-01–18 · Drive คณะ 9', href: 'tor-k9-addiction.html#round-2569-11-11' },
    { clinic: 'คลินิกบำบัดสารเสพติด (คทง.9)', date: '1 พ.ย. 2569', note: 'SUD-01–13 รอบแรก', href: 'tor-k9-addiction.html#round-2569-11-01' },
    { clinic: 'คลินิกเบาหวาน/ความดัน + จุดคัดกรองกลาง (คทง.3)', date: '9 พ.ย. 2569', note: 'ลำดับ 101–136', href: 'tor-ncd-101-136.html' },
  ];
  /* state ทุกแบบ alias token input ของ design system (ผู้ใช้ 12 พ.ย. 69 "state ของ field ให้ alias from design system"):
     ปกติ --border-input-filled · hover --border-input-hover + --focus-ring-input-hover · เปิด/โฟกัส --border-input-typing + --focus-ring-input-typing
     ข้อความ --text-input-filled · ไอคอน --icon-input-filled · ป้าย --text-input-label
     dropdown = หน้าตา Select ของ design system PHCIS (ผู้ใช้ 12 พ.ย. 69 "dropdown ใช้ design system") — ไม่ใช้ <select> ของเบราว์เซอร์
     trigger 44 · ขอบ --border-neutral-tertiary · เมนูขาว + --shadow-dropdown · แถว hover --surface-brandPrimary-quaternary · ค่าที่เลือก = ตัวเขียว + ✓ */
  var CHEV = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';
  var CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
  var css = '.tn{display:flex;flex-wrap:wrap;gap:var(--dim-space-300,12px);align-items:flex-end;margin-bottom:var(--dim-space-500,20px)}'
    + '.tn-f{display:flex;flex-direction:column;gap:var(--dim-space-100,4px);min-width:min(100%,240px);flex:1 1 240px;max-width:440px;position:relative}'
    + '.tn-l{font-size:var(--type-size-sm,14px);color:var(--text-input-label,#4D5358);font-weight:var(--type-weight-medium,500)}'
    + '.tn-t{display:flex;align-items:center;gap:var(--dim-space-200,8px);width:100%;min-height:44px;padding:0 var(--dim-space-300,12px);font:inherit;font-size:var(--type-size-sm,14px);color:var(--text-input-filled,#4D5358);background:var(--surface-input-default,#FFFFFF);border:var(--dim-stroke-100,1px) solid var(--border-input-filled,#E2E4E6);border-radius:var(--dim-radius-300,8px);cursor:pointer;text-align:left;transition:border-color .15s,box-shadow .15s}'
    + '.tn-t:hover{border-color:var(--border-input-hover);box-shadow:0 0 0 var(--dim-stroke-400,4px) var(--focus-ring-input-hover)}'
    + '.tn-t[aria-expanded="true"],.tn-t:focus-visible{outline:none;border-color:var(--border-input-typing);box-shadow:0 0 0 var(--dim-stroke-400,4px) var(--focus-ring-input-typing)}'
    + '.tn-t span{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.tn-t svg{flex:none;color:var(--icon-input-filled,#4D5358);transition:transform .15s}'
    + '.tn-t[aria-expanded="true"] svg{transform:rotate(180deg)}'
    + '.tn-m{position:absolute;left:0;right:0;top:calc(100% + var(--dim-space-100,4px));z-index:50;margin:0;padding:var(--dim-space-100,4px);list-style:none;background:var(--surface-card-100,#FFFFFF);border:var(--dim-stroke-100,1px) solid var(--border-neutral-quaternary,#F4F5F5);border-radius:var(--dim-radius-300,8px);box-shadow:var(--shadow-dropdown);max-height:320px;overflow:auto}'
    + '.tn-m[hidden]{display:none}'
    + '.tn-o{display:flex;align-items:center;gap:var(--dim-space-200,8px);min-height:44px;padding:0 var(--dim-space-300,12px);border-radius:var(--dim-radius-200,6px);font-size:var(--type-size-sm,14px);color:var(--text-content-default,#363B3F);cursor:pointer}'
    + '.tn-o span{flex:1 1 auto}'
    + '.tn-o:hover,.tn-o.is-active{background:var(--surface-brandPrimary-quaternary,#F4FBF8)}'
    + '.tn-o[aria-selected="true"]{color:var(--text-brandPrimary-default,#007549);font-weight:var(--type-weight-medium,500)}'
    + '.tn-o svg{flex:none;visibility:hidden;color:var(--text-brandPrimary-default,#007549)}'
    + '.tn-o[aria-selected="true"] svg{visibility:visible}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var host = document.getElementById('tor-nav'); if (!host) return;
  /* ตัวเลือกอยู่บนสุดของหัวหน้า เหนือชื่อเรื่อง (ผู้ใช้ 12 พ.ย. 69 "สลับเอา dropdown ขึ้นก่อน") */
  var hd = host.closest('header'); if (hd && hd.firstElementChild !== host) hd.insertBefore(host, hd.firstElementChild);
  var page = function () { return location.pathname.split('/').pop(); };
  var here = page() + location.hash;
  var current = TOR_UPDATES.filter(function (r) { return r.href === here; })[0]
    || TOR_UPDATES.filter(function (r) { return r.href.split('#')[0] === page(); })[0] || TOR_UPDATES[0];
  var clinics = TOR_UPDATES.map(function (r) { return r.clinic; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
  host.className = 'tn';
  var all = [];
  var makeSelect = function (label, id) {
    var f = document.createElement('div'); f.className = 'tn-f';
    f.innerHTML = '<span class="tn-l" id="' + id + '-l">' + label + '</span>'
      + '<button type="button" class="tn-t" id="' + id + '" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="' + id + '-l ' + id + '"><span></span>' + CHEV + '</button>'
      + '<ul class="tn-m" role="listbox" aria-labelledby="' + id + '-l" hidden></ul>';
    host.appendChild(f);
    var t = f.querySelector('.tn-t'); var m = f.querySelector('.tn-m');
    var api = { value: null, items: [], onChange: null };
    var close = function () { m.hidden = true; t.setAttribute('aria-expanded', 'false'); };
    var open = function () { all.forEach(function (o) { o.close(); }); m.hidden = false; t.setAttribute('aria-expanded', 'true'); var s = m.querySelector('[aria-selected="true"]') || m.firstChild; if (s) { s.classList.add('is-active'); s.scrollIntoView({ block: 'nearest' }); } };
    api.close = close;
    api.set = function (items, value) {
      api.items = items; api.value = value; m.innerHTML = '';
      items.forEach(function (it) {
        var li = document.createElement('li'); li.className = 'tn-o'; li.setAttribute('role', 'option'); li.dataset.value = it.value;
        li.setAttribute('aria-selected', it.value === value ? 'true' : 'false');
        li.innerHTML = '<span></span>' + CHECK; li.firstChild.textContent = it.label;
        li.addEventListener('click', function () { close(); t.focus(); if (it.value !== api.value) { api.value = it.value; api.set(api.items, it.value); if (api.onChange) api.onChange(it.value); } });
        m.appendChild(li);
      });
      var cur = items.filter(function (it) { return it.value === value; })[0] || items[0];
      if (cur) { api.value = cur.value; t.firstChild.textContent = cur.label; }
    };
    t.addEventListener('click', function () { if (m.hidden) open(); else close(); });
    t.addEventListener('keydown', function (e) {
      var opts = [].slice.call(m.children); var i = opts.findIndex(function (o) { return o.classList.contains('is-active'); });
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (m.hidden) { open(); return; } if (i >= 0) opts[i].classList.remove('is-active'); i = e.key === 'ArrowDown' ? Math.min(opts.length - 1, i + 1) : Math.max(0, i - 1); opts[i].classList.add('is-active'); opts[i].scrollIntoView({ block: 'nearest' }); }
      if ((e.key === 'Enter' || e.key === ' ') && !m.hidden && i >= 0) { e.preventDefault(); opts[i].click(); }
    });
    m.addEventListener('mousemove', function (e) { var li = e.target.closest('.tn-o'); if (!li) return; [].forEach.call(m.children, function (o) { o.classList.toggle('is-active', o === li); }); });
    all.push(api);
    return api;
  };
  document.addEventListener('click', function (e) { if (!host.contains(e.target)) all.forEach(function (o) { o.close(); }); });
  var sc = makeSelect('คลินิก', 'tn-clinic');
  var sd = makeSelect('วันที่ปรับปรุง', 'tn-date');
  var datesOf = function (clinic) { return TOR_UPDATES.filter(function (r) { return r.clinic === clinic; }).map(function (r) { return { value: r.href, label: r.date + ' · ' + r.note }; }); };
  sc.set(clinics.map(function (c) { return { value: c, label: c }; }), current.clinic);
  sd.set(datesOf(current.clinic), current.href);
  var go = function (href) {
    var pg = href.split('#')[0];
    if (pg === page()) { location.hash = href.split('#')[1] || ''; if (window.torShowRound) window.torShowRound(); }
    else location.href = href;
  };
  sc.onChange = function (c) { var d = datesOf(c); sd.set(d, d[0] && d[0].value); if (d[0]) go(d[0].value); };
  sd.onChange = function (href) { go(href); };
  window.addEventListener('hashchange', function () {
    var h = page() + location.hash;
    var r = TOR_UPDATES.filter(function (x) { return x.href === h; })[0]; if (r) { sc.set(sc.items, r.clinic); sd.set(datesOf(r.clinic), r.href); }
  });
})();
