/* Usability Studio · หน้าวิเคราะห์ผลรวมผู้ใช้จริง (เจ้าของเท่านั้น · bma-docs › Usability testing หลังล็อกอิน Google · ผู้ใช้ 20 พ.ย. 69)
   หน้าผู้ทดสอบบันทึกเข้า Google Sheet อัตโนมัติ → หน้านี้ดึงด้วยรหัสดึงผล → คำนวณตัวชี้วัดมาตรฐานด้วย metrics.js
   จำผลล่าสุดไว้ในเครื่องนี้ (ตัดเสียง/พิกัดคลิกออก) */
(() => {
  const M = window.UTMetrics;
  const root = document.getElementById('root');
  const KEY = 'ut-analysis-rows-v1';
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  };
  const ms = (name) => h('span', { class: 'ms', 'aria-hidden': 'true' }, name);
  const tone = { good: 'badge-ok', mid: 'badge-warn', bad: 'badge-danger' };
  const chip = (lv, text) => h('span', { class: `badge ${tone[lv] || ''}` }, text);

  let rows = [];
  let defs = [];
  let study = null;
  let msg = '';
  try { rows = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { rows = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* เก็บไม่ได้ก็ใช้ต่อในแท็บนี้ */ } };

  /* ดึงผลจาก Google Sheet ที่หน้าผู้ทดสอบบันทึกอัตโนมัติ (ผู้ใช้ 21 พ.ย. 69 — ผู้ทดสอบไม่ต้องส่งไฟล์)
     ที่อยู่ = study.collect (Apps Script) · รหัสดึงผล EXPORT_KEY กรอกครั้งเดียว จำไว้ในเครื่องนี้ (ไม่อยู่ในหน้าเว็บสาธารณะ) */
  const KEY_STORE = 'ut-export-key-v1';
  let exportKey = ''; try { exportKey = localStorage.getItem(KEY_STORE) || ''; } catch { /* */ }
  let loading = false; let pulledAt = '';
  const KINDS = ['participant', 'screenout', 'task', 'sus', 'wrapup', 'note', 'end'];
  async function pull() {
    if (!study || !study.collect || !exportKey) return;
    loading = true; msg = ''; render();
    try {
      const res = await fetch(`${study.collect}?${new URLSearchParams({ export: '1', key: exportKey, study: study.id })}`, { cache: 'no-store' });
      const body = await res.json();
      /* รหัสผิด = ตัวรับตอบข้อความทักทายแทนข้อมูล → ล้างรหัส ให้กรอกใหม่ */
      if (!Array.isArray(body.rows)) { exportKey = ''; try { localStorage.removeItem(KEY_STORE); } catch { /* */ } throw new Error('key'); }
      rows = body.rows.filter((r) => r && r.session && KINDS.includes(r.kind)).map(({ b64, rows: _ev, ...r }) => r);
      pulledAt = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      save();
    } catch { msg = 'ดึงผลไม่ได้ — ตรวจรหัสดึงผล หรืออินเทอร์เน็ต'; }
    loading = false; render();
  }
  function setKey(v) { exportKey = v.trim(); try { if (exportKey) localStorage.setItem(KEY_STORE, exportKey); else localStorage.removeItem(KEY_STORE); } catch { /* */ } pull(); }
  function forgetKey() { rows = []; save(); setKey(''); msg = 'ลืมรหัสในเครื่องนี้แล้ว'; render(); }

  function connectCard() {
    if (!study || !study.collect) return h('div', { class: 'notice notice-warn' }, ms('cloud_off'), h('span', {}, 'ชุดทดสอบนี้ยังไม่ได้ตั้งที่บันทึกผล (Google Sheet)'));
    let typed = '';
    const go = () => { if (typed.trim()) setKey(typed); };
    return h('section', { class: 'card stack' }, h('div', { class: 'stack-sm' }, h('h2', { class: 't-title' }, 'เชื่อมผลจาก Google Sheet'), h('p', { class: 't-sum' }, 'ผลผู้ทดสอบบันทึกเข้าชีตอัตโนมัติ · กรอกรหัสดึงผลครั้งเดียว')),
      h('label', { class: 'label' }, 'รหัสดึงผล (EXPORT_KEY)', h('input', { class: 'field', type: 'password', id: 'export-key', autocomplete: 'off', oninput: (e) => { typed = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') go(); } })),
      h('p', { class: 't-xs t-muted' }, 'ดูได้ใน Apps Script ของชีต › Project Settings › Script properties · จำไว้ในเครื่องนี้เท่านั้น'),
      h('div', { class: 'row-end row' }, h('button', { class: 'btn btn-fill', type: 'button', onclick: go }, ms('sync'), 'ดึงผล')));
  }

  const kpi = (label, value, note, lv) => h('div', { class: 'card kpi' }, h('span', { class: 't-group' }, label), h('b', {}, value), h('span', { class: 'row' }, lv ? chip(lv, note) : h('span', { class: 't-xs t-muted' }, note)));
  const ci = (c) => (c ? `${M.pct(c[0])}–${M.pct(c[1])}` : '');
  /* ข้อความซ้ำกันรวมเป็นแถวเดียว + จำนวนคน */
  const quoteList = (qs) => { const c = new Map(); qs.forEach((q) => c.set(q, (c.get(q) || 0) + 1)); return h('ul', { class: 'quotes' }, [...c].sort((a, b) => b[1] - a[1]).map(([q, n]) => h('li', {}, q, n > 1 && h('span', { class: 't-muted' }, ` · ${n} คน`)))); };
  const who = (p) => { p = p || {}; return [p.nickname, p.occupation, p.age && `${p.age} ปี`, p.role].filter(Boolean).join(' · ') || 'ไม่ระบุ'; };

  function view() {
    const list = M.sessions(rows);
    const head = h('header', { class: 'stack-sm' },
      h('h1', { class: 't-page' }, `วิเคราะห์ผลผู้ใช้จริง${study ? ` · ${study.name}` : ''}`),
      h('p', { class: 't-sum' }, 'ผลผู้ทดสอบทุกคนจาก Google Sheet · ตัวชี้วัดมาตรฐาน usability testing'));
    const bar = h('div', { class: 'row' }, h('span', { class: 'badge badge-brand' }, `${list.length} คน`), msg ? h('span', { class: 't-xs t-muted', role: 'status' }, msg) : null,
      pulledAt && !loading ? h('span', { class: 't-xs t-muted' }, `ดึงล่าสุด ${pulledAt} น.`) : null,
      h('span', { class: 'grow' }),
      exportKey && h('button', { class: 'btn btn-outline', type: 'button', disabled: loading, onclick: pull }, ms('sync'), loading ? 'กำลังดึงผล…' : 'ดึงผลล่าสุด'),
      exportKey && h('button', { class: 'btn btn-ghost', type: 'button', onclick: forgetKey }, ms('key_off'), 'ลืมรหัส'));
    if (!exportKey) return [head, bar, connectCard(), criteria()];
    if (!list.length) return [head, bar, h('div', { class: 'notice' }, ms('hourglass_empty'), h('span', {}, loading ? 'กำลังดึงผล…' : 'ยังไม่มีผู้ทดสอบทำครบ · ส่งลิงก์ทดสอบแล้วกด "ดึงผลล่าสุด"')), criteria()];

    const o = M.overview(list, defs);
    const kpis = h('section', { class: 'kpis', 'aria-label': 'ภาพรวม' },
      kpi('อัตราสำเร็จ', M.pct(o.success), `95% CI ${ci(o.successCI)}`, M.level.success(o.success)),
      kpi('สำเร็จตรงทาง', M.pct(o.direct), 'ไม่แตะเกิน · ไม่แตะพลาด'),
      kpi('ความง่าย SEQ', `${M.fix(o.seq)}/7`, `${M.vs(o.seq, M.SEQ_AVG)}ค่าเฉลี่ย 5.5`, M.level.seq(o.seq)),
      kpi('แตะพลาด', M.pct(o.misclick), 'ของการแตะทั้งหมด', M.level.misclick(o.misclick)),
      kpi(`SUS (${o.susN} คน)`, M.fix(o.sus), o.sus == null ? 'ยังไม่มีคนตอบครบ' : `เกรด ${o.susGrade} · ${o.susWord}`, M.level.sus(o.sus)));

    const fixes = h('section', { class: 'card stack' }, h('div', { class: 'stack-sm' }, h('h2', { class: 't-title' }, 'ควรแก้ก่อน'), h('p', { class: 't-sum' }, 'โจทย์ที่ต่ำกว่าเกณฑ์ เรียงจากรุนแรงที่สุด')),
      o.worst.length
        ? h('ul', { class: 'fix-list' }, o.worst.map(({ t, f }) => h('li', {}, h('span', { class: 't-strong' }, t.title), h('span', { class: 'row' }, f.map((x) => chip(x.lv, x.text))))))
        : h('div', { class: 'notice notice-ok' }, ms('check_circle'), h('span', {}, 'ทุกโจทย์ผ่านเกณฑ์ค่าเฉลี่ย')));

    const byTask = h('section', { class: 'stack-sm' }, h('h2', { class: 't-title' }, 'รายโจทย์'),
      h('p', { class: 't-xs t-muted' }, 'เวลา · แตะ = ค่ามัธยฐาน (เวลานับเฉพาะคนที่สำเร็จ) · SEQ · มั่นใจ = ค่าเฉลี่ย'),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, ['โจทย์', 'คน', 'สำเร็จ', '95% CI', 'ตรงทาง', 'เวลา', 'แตะ / ที่ควร', 'ประสิทธิภาพ', 'แตะพลาด', 'SEQ (1–7)', 'มั่นใจ (1–5)'].map((x, i) => h('th', { class: i ? 't-num' : null }, x)))),
        h('tbody', {}, o.tasks.filter((t) => t.n).map((t) => h('tr', {},
          h('td', {}, t.title), h('td', { class: 't-num' }, t.n),
          h('td', { class: 't-num' }, chip(M.level.success(t.success), M.pct(t.success))), h('td', { class: 't-num' }, ci(t.successCI)),
          h('td', { class: 't-num' }, M.pct(t.direct)), h('td', { class: 't-num' }, M.secs(t.time)),
          h('td', { class: 't-num' }, t.ideal ? `${M.fix(t.clicks)} / ${t.ideal}` : M.fix(t.clicks)),
          h('td', { class: 't-num' }, t.efficiency == null ? '–' : chip(M.level.efficiency(t.efficiency), M.pct(t.efficiency))),
          h('td', { class: 't-num' }, t.misclick == null ? '–' : chip(M.level.misclick(t.misclick), M.pct(t.misclick))),
          h('td', { class: 't-num' }, t.seq == null ? '–' : chip(M.level.seq(t.seq), M.fix(t.seq))),
          h('td', { class: 't-num' }, M.fix(t.confidence))))))));

    const byPerson = h('section', { class: 'stack-sm' }, h('h2', { class: 't-title' }, 'รายคน'),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, ['ผู้ทดสอบ', 'สำเร็จ', 'SEQ เฉลี่ย', 'SUS', 'เกรด'].map((x, i) => h('th', { class: i ? 't-num' : null }, x)))),
        h('tbody', {}, list.map((s) => {
          const sus = M.susScore(s.sus); const seq = M.avg(s.tasks.map((t) => t.ease || null));
          return h('tr', {}, h('td', {}, who(s.participant)),
            h('td', { class: 't-num' }, `${s.tasks.filter((t) => t.outcome === 'success').length}/${s.tasks.length}`),
            h('td', { class: 't-num' }, M.fix(seq)), h('td', { class: 't-num' }, M.fix(sus)),
            h('td', { class: 't-num' }, sus == null ? '–' : chip(M.level.sus(sus), `${M.susGrade(sus)} · ${M.susWord(sus)}`)));
        })))));

    /* ความเห็น: คำตอบช่วงสรุปจัดกลุ่มตามคำถาม · ความเห็นรายโจทย์ */
    const groups = new Map();
    list.forEach((s) => s.wrapup.forEach((a) => { if (a.text) { if (!groups.has(a.group)) groups.set(a.group, []); groups.get(a.group).push(a.text); } }));
    const voice = h('section', { class: 'card stack' }, h('div', { class: 'stack-sm' }, h('h2', { class: 't-title' }, 'เสียงจากผู้ทดสอบ'), h('p', { class: 't-sum' }, 'คำตอบช่วงสรุป · ความเห็นหลังแต่ละโจทย์')),
      [...groups].map(([g, qs], i) => [i ? h('hr', { class: 'divider' }) : null, h('div', { class: 'stack-sm' }, h('h3', { class: 't-group' }, g), quoteList(qs))]),
      o.tasks.filter((t) => t.comments.length).map((t) => [h('hr', { class: 'divider' }), h('div', { class: 'stack-sm' }, h('h3', { class: 't-group' }, `โจทย์: ${t.title}`), quoteList(t.comments))]),
      !groups.size && !o.tasks.some((t) => t.comments.length) && h('p', { class: 't-xs t-muted' }, 'ยังไม่มีความเห็น'));

    return [head, bar, kpis, coverage(list), fixes, byTask, byPerson, voice, criteria()];
  }

  /* กลุ่มผู้ทดสอบ: เทียบโควตาใน study.recruit (เกณฑ์กระจาย) + จำนวนที่ไม่ผ่านเกณฑ์บังคับ (ผู้ใช้ 21 พ.ย. 69) */
  function coverage(list) {
    const rc = study && study.recruit;
    if (!rc) return null;
    const val = (p, f) => { p = p || {}; return p[f] != null && p[f] !== '' ? p[f] : (p.screener || {})[f]; };
    const out = new Set(rows.filter((r) => r && r.kind === 'screenout').map((r) => r.session)).size;
    const dims = rc.quota.map((q) => ({ dim: q.dim, lines: q.groups.map((g) => ({ g, n: list.filter((x) => val(x.participant, q.field) === g.v).length })) }));
    const short = dims.flatMap((d) => d.lines).filter((l) => l.n < l.g.min).length;
    return h('section', { class: 'card stack' },
      h('div', { class: 'stack-sm' }, h('h2', { class: 't-title' }, 'กลุ่มผู้ทดสอบ'),
        h('p', { class: 't-sum' }, `ทำครบ ${list.length} จากเป้า ${rc.target} คน · ไม่ผ่านเกณฑ์บังคับ ${out} คน · ${short ? `ยังขาด ${short} กลุ่ม` : 'ครบทุกกลุ่ม'}`)),
      h('p', { class: 't-xs t-muted' }, 'ตัวเลข = ได้แล้ว / ขั้นต่ำที่ต้องมี'),
      /* การ์ดต่อมิติ: จอกว้างเรียงหลายคอลัมน์ จอแคบเหลือคอลัมน์เดียว (ไม่ใช้ตาราง — บนมือถือคอลัมน์สถานะตกขอบ) */
      h('div', { class: 'grid-form' }, dims.map((d) => h('div', { class: 'stack-sm' }, h('h3', { class: 't-group' }, d.dim),
        h('ul', { class: 'quota-list' }, d.lines.map((l) => h('li', {}, h('span', { class: 'grow' }, l.g.label), h('span', { class: 't-num' }, `${l.n} / ${l.g.min}`),
          chip(l.n >= l.g.min ? 'good' : l.n ? 'mid' : 'bad', l.n >= l.g.min ? 'ครบ' : `ขาด ${l.g.min - l.n}`))))))),
      h('hr', { class: 'divider' }),
      h('div', { class: 'stack-sm' }, h('h3', { class: 't-group' }, 'เกณฑ์บังคับ (ต้องผ่านทุกข้อ)'), h('ul', { class: 'quotes' }, rc.mandatory.map((m) => h('li', {}, m)))));
  }

  function criteria() {
    const row = (k, v) => [h('dt', {}, k), h('dd', {}, v)];
    return h('section', { class: 'card stack-sm' }, h('h2', { class: 't-group' }, 'เกณฑ์ที่ใช้'),
      h('dl', { class: 'kv t-xs' },
        row('อัตราสำเร็จ', 'ทำโจทย์สำเร็จ ÷ ครั้งที่ทำ · ค่าเฉลี่ยงานวิจัย 78% (Sauro) · CI แบบ Adjusted Wald'),
        row('สำเร็จตรงทาง', 'สำเร็จโดยแตะไม่เกินจำนวนที่ควร และไม่แตะพลาด'),
        row('ประสิทธิภาพ', 'จำนวนแตะที่ควร ÷ แตะจริง · ≥ 80% ดี'),
        row('แตะพลาด', 'แตะโดนที่กดไม่ได้ ÷ แตะทั้งหมด · ≤ 10% ดี'),
        row('SEQ', 'ความง่ายหลังแต่ละโจทย์ 1–7 · ค่าเฉลี่ย 5.5'),
        row('SUS', '10 ข้อ 0–100 · ค่าเฉลี่ย 68 · เกรด Sauro-Lewis · คำบรรยาย Bangor')));
  }

  function render() { root.replaceChildren(...view().filter(Boolean)); }

  /* ชื่อโจทย์ + จำนวนแตะที่ควร จาก study.json ข้างหน้านี้ (ไม่มี = ใช้รหัสโจทย์) */
  fetch('study.json').then((r) => (r.ok ? r.json() : null)).then((s) => { if (s && s.tasks) { study = s; defs = s.tasks; document.title = `วิเคราะห์ผลผู้ใช้จริง · ${s.name}`; } }).catch(() => {}).finally(() => { render(); pull(); });
})();
