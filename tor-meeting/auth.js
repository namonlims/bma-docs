/* bma-docs · TOR checklist — เข้าสู่ระบบด้วย Google + ถอดรหัสรายงานการประชุม + บันทึกประวัติ (ผู้ใช้ 3 พ.ย. 69)
   - ข้อความรายงานการประชุมและไฟล์ PDF เก็บแบบเข้ารหัส (AES-256-GCM) ใน bma-docs
   - กุญแจถอดรหัสได้จาก Apps Script หลังตรวจ Google ID token เท่านั้น (ทุกบัญชี Google)
   - ล็อกอินครั้งเดียวต่อเบราว์เซอร์ (เก็บเซสชันของสคริปต์ไว้) · ออกจากระบบได้ที่ปุ่มบน Header
   - window.TOR_SECURE = { script, client, enc? }  ตั้งค่าก่อนโหลดไฟล์นี้ */
(function () {
  const CFG = window.TOR_SECURE || {};
  const SESS = 'bma-tor:sess';
  const A = { user: null, st: '', key: null, ready: null, _res: null };
  window.TORAUTH = A;
  A.ready = new Promise((r) => (A._res = r));

  const css = `#torGate{position:fixed;inset:0;z-index:100000;background:#F4F5F5;display:flex;align-items:center;justify-content:center;padding:16px}
#torGate[hidden]{display:none}
#torGate .tg{background:#FFF;border:1px solid #E2E4E6;border-radius:12px;padding:24px;max-width:380px;width:100%;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Sarabun","Noto Sans Thai",sans-serif}
#torGate h2{margin:8px 0 4px;font-size:18px;color:#171A1F}
#torGate p{margin:4px 0;font-size:13px;color:#6E757C}
#torGate .tgb{display:flex;justify-content:center;margin:16px 0 8px;min-height:44px}
#torGate .tgm{color:#B91C1C;min-height:18px}
#torGate .tgn{font-size:11px}
html.torlock body{overflow:hidden}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function gate(show, msg) {
    let g = document.getElementById('torGate');
    if (!g) {
      g = document.createElement('div'); g.id = 'torGate';
      g.innerHTML = `<div class="tg"><div style="font-size:28px">🔒</div><h2>${CFG.title || 'PHCIS · TOR Compliance Checklist'}</h2><p>เข้าสู่ระบบด้วยบัญชี Google ก่อนเข้าใช้หน้านี้</p><div class="tgb" id="tgBtn"></div><p class="tgm" id="tgMsg" role="status"></p><p class="tgn">ระบบเก็บชื่อและอีเมลไว้ในประวัติการเข้าดูและประวัติการแก้ไข</p></div>`;
      document.body.appendChild(g);
    }
    g.hidden = !show; document.documentElement.classList.toggle('torlock', !!show);
    if (msg != null) document.getElementById('tgMsg').textContent = msg;
    if (show && window.google?.accounts?.id) google.accounts.id.renderButton(document.getElementById('tgBtn'), { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'th', width: 280 });
  }

  const b64ToBytes = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  async function importKey(b) { return crypto.subtle.importKey('raw', b64ToBytes(b), 'AES-GCM', false, ['decrypt']); }
  A.decrypt = async (buf) => {
    await A.ready;
    const u = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, A.key, u.slice(12));
  };
  A.fetchEnc = async (url) => {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('โหลดไฟล์ไม่ได้ ' + r.status);
    return A.decrypt(await r.arrayBuffer());
  };

  async function call(params, body) {
    const q = new URLSearchParams(params);
    if (A.st) q.set('st', A.st);
    const url = CFG.script + '?' + q.toString();
    const r = body
      ? await fetch(CFG.script, { method: 'POST', body: JSON.stringify({ st: A.st, ...body }) })
      : await fetch(url);
    const j = await r.json();
    if (j && j.auth) { A.signOut(true); throw new Error('auth'); }
    return j;
  }
  A.call = call;

  async function useSession(s) {
    A.st = s.st; A.user = s.user; A.key = await importKey(s.key);
    gate(false, ''); A._res(); renderUser();
  }
  function renderUser() {
    const slot = document.getElementById('torUser');
    if (slot && A.user) slot.innerHTML = `<span class="tu-name" title="${A.user.email}">${A.user.name}</span><button type="button" id="torSignOut" class="tu-out">ออกจากระบบ</button>`;
    const b = document.getElementById('torSignOut');
    if (b) b.onclick = () => A.signOut();
  }
  A.signOut = (expired) => {
    try { localStorage.removeItem(SESS); } catch (e) {}
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    if (expired) { A.st = ''; gate(true, 'เซสชันหมดอายุ · เข้าสู่ระบบอีกครั้ง'); } else location.reload();
  };

  async function onCred(r) {
    if (!r?.credential) { gate(true, 'เข้าสู่ระบบไม่สำเร็จ · ลองใหม่อีกครั้ง'); return; }
    gate(true, 'กำลังเข้าสู่ระบบ…');
    try {
      const j = await (await fetch(CFG.script + '?a=login&tk=' + encodeURIComponent(r.credential))).json();
      if (!j.ok) throw new Error(j.error || 'เข้าสู่ระบบไม่สำเร็จ');
      const s = { st: j.st, user: j.user, key: j.key };
      try { localStorage.setItem(SESS, JSON.stringify(s)); } catch (e) {}
      await useSession(s);
    } catch (e) { gate(true, String(e.message || e)); }
  }

  function start() {
    if (!CFG.script || !CFG.client) { gate(true, 'ยังไม่ได้ตั้งค่าระบบเข้าสู่ระบบ (Apps Script) · ติดต่อผู้ดูแลหน้า'); return; }
    let saved = null; try { saved = JSON.parse(localStorage.getItem(SESS) || 'null'); } catch (e) {}
    if (saved && saved.st && saved.key) useSession(saved).catch(() => gate(true, ''));
    else gate(true, 'กำลังโหลด…');
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => {
      google.accounts.id.initialize({ client_id: CFG.client, callback: onCred, auto_select: true, cancel_on_tap_outside: false, use_fedcm_for_prompt: true });
      if (!A.key) { gate(true, ''); google.accounts.id.prompt(); }
    };
    s.onerror = () => { if (!A.key) gate(true, 'โหลดระบบเข้าสู่ระบบของ Google ไม่ได้ · ตรวจอินเทอร์เน็ตแล้วรีเฟรช'); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* ---- ประวัติการแก้ไข (Note / ผลตรวจ) — เก็บในชีตของ Apps Script ---- */
  const queue = [];
  let flushing = false;
  A.log = (ev) => { queue.push({ ...ev, at: Date.now() }); flush(); };
  async function flush() {
    if (flushing || !queue.length) return;
    flushing = true;
    try { await A.ready; while (queue.length) { const ev = queue[0]; await call({}, { a: 'log', ev }); queue.shift(); } }
    catch (e) { /* ลองใหม่รอบหน้า */ }
    finally { flushing = false; }
  }
  setInterval(flush, 15000);
  A.history = async (since) => (await call({ a: 'history', since: String(since || 0) })).events || [];
})();
