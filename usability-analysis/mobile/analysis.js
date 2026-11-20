/* Usability Studio · หน้าวิเคราะห์ผลรวมผู้ใช้จริง (เจ้าของเท่านั้น · bma-docs › Usability testing หลังล็อกอิน Google · ผู้ใช้ 20 พ.ย. 69)
   ผู้ทดสอบส่งไฟล์ผล (.txt/.json จากหน้าผู้ทดสอบ) → ลากมาวางที่นี่ → คำนวณตัวชี้วัดมาตรฐานด้วย metrics.js
   ไฟล์อ่านในเบราว์เซอร์นี้เท่านั้น ไม่อัปโหลดไปไหน · จำไว้ในเครื่องนี้ (ตัดเสียง/พิกัดคลิกออก) */
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

  /* อ่านไฟล์ผล: array ของ payload · เก็บเฉพาะที่ใช้คำนวณ (ไม่เก็บเสียง/พิกัด) · ไฟล์เดิมซ้ำ = แทนของเดิม */
  async function addFiles(files) {
    let ok = 0; let bad = 0;
    for (const f of files) {
      try {
        const data = JSON.parse(await f.text());
        const list = (Array.isArray(data) ? data : [data]).filter((r) => r && r.session && ['participant', 'task', 'sus', 'wrapup', 'note', 'end'].includes(r.kind));
        if (!list.length) throw new Error('empty');
        const ids = new Set(list.map((r) => r.session));
        rows = rows.filter((r) => !ids.has(r.session)).concat(list.map(({ b64, rows: _ev, ...r }) => r));
        ok += ids.size;
      } catch { bad += 1; }
    }
    msg = [ok && `นำเข้า ${ok} คน`, bad && `อ่านไม่ได้ ${bad} ไฟล์`].filter(Boolean).join(' · ');
    save();
    render();
  }
  function clearAll() { rows = []; msg = 'ล้างข้อมูลแล้ว'; save(); render(); }
  function removeSession(id) { rows = rows.filter((r) => r.session !== id); save(); render(); }

  const picker = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', multiple: true, hidden: true, onchange: (e) => { addFiles([...e.target.files]); e.target.value = ''; } });
  document.body.append(picker);

  function dropZone(compact) {
    const z = h('div', { class: 'drop' },
      !compact && ms('upload_file'),
      h('p', { class: 't-strong' }, compact ? 'เพิ่มไฟล์ผล' : 'ลากไฟล์ผลมาวางที่นี่'),
      !compact && h('p', { class: 't-xs t-muted' }, 'ไฟล์ .txt / .json ที่ผู้ทดสอบส่งกลับ (เลือกหลายไฟล์พร้อมกันได้) · อ่านในเครื่องนี้เท่านั้น ไม่อัปโหลด'),
      h('button', { class: 'btn btn-outline', type: 'button', onclick: () => picker.click() }, ms('folder_open'), 'เลือกไฟล์'));
    z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('is-over'); });
    z.addEventListener('dragleave', () => z.classList.remove('is-over'));
    z.addEventListener('drop', (e) => { e.preventDefault(); z.classList.remove('is-over'); addFiles([...e.dataTransfer.files]); });
    return z;
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
      h('p', { class: 't-sum' }, 'รวมไฟล์ผลของผู้ทดสอบทุกคน · ตัวชี้วัดมาตรฐาน usability testing'));
    const bar = h('div', { class: 'row' }, h('span', { class: 'badge badge-brand' }, `${list.length} คน`), msg ? h('span', { class: 't-xs t-muted', role: 'status' }, msg) : null,
      h('span', { class: 'grow' }),
      list.length > 0 && h('button', { class: 'btn btn-outline', type: 'button', onclick: () => picker.click() }, ms('upload_file'), 'เพิ่มไฟล์ผล'),
      list.length > 0 && h('button', { class: 'btn btn-ghost', type: 'button', onclick: clearAll }, ms('delete'), 'ล้างข้อมูล'));
    if (!list.length) return [head, bar, dropZone(false), criteria()];

    const o = M.overview(list, defs);
    const kpis = h('section', { class: 'kpis', 'aria-label': 'ภาพรวม' },
      kpi('อัตราสำเร็จ', M.pct(o.success), `95% CI ${ci(o.successCI)}`, M.level.success(o.success)),
      kpi('สำเร็จตรงทาง', M.pct(o.direct), 'ไม่แตะเกิน · ไม่แตะพลาด'),
      kpi('ความง่าย SEQ', `${M.fix(o.seq)}/7`, o.seq >= M.SEQ_AVG ? 'สูงกว่าค่าเฉลี่ย 5.5' : 'ต่ำกว่าค่าเฉลี่ย 5.5', M.level.seq(o.seq)),
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
        h('thead', {}, h('tr', {}, ['ผู้ทดสอบ', 'สำเร็จ', 'SEQ เฉลี่ย', 'SUS', 'เกรด', ''].map((x, i) => h('th', { class: i && i < 5 ? 't-num' : null }, x)))),
        h('tbody', {}, list.map((s) => {
          const sus = M.susScore(s.sus); const seq = M.avg(s.tasks.map((t) => t.ease || null));
          return h('tr', {}, h('td', {}, who(s.participant)),
            h('td', { class: 't-num' }, `${s.tasks.filter((t) => t.outcome === 'success').length}/${s.tasks.length}`),
            h('td', { class: 't-num' }, M.fix(seq)), h('td', { class: 't-num' }, M.fix(sus)),
            h('td', { class: 't-num' }, sus == null ? '–' : chip(M.level.sus(sus), `${M.susGrade(sus)} · ${M.susWord(sus)}`)),
            h('td', {}, h('button', { class: 'btn btn-ghost btn-icon', type: 'button', 'aria-label': `เอาผลของ ${who(s.participant)} ออก`, title: 'เอาออก', onclick: () => removeSession(s.id) }, ms('close'))));
        })))));

    /* ความเห็น: คำตอบช่วงสรุปจัดกลุ่มตามคำถาม · ความเห็นรายโจทย์ */
    const groups = new Map();
    list.forEach((s) => s.wrapup.forEach((a) => { if (a.text) { if (!groups.has(a.group)) groups.set(a.group, []); groups.get(a.group).push(a.text); } }));
    const voice = h('section', { class: 'card stack' }, h('div', { class: 'stack-sm' }, h('h2', { class: 't-title' }, 'เสียงจากผู้ทดสอบ'), h('p', { class: 't-sum' }, 'คำตอบช่วงสรุป · ความเห็นหลังแต่ละโจทย์')),
      [...groups].map(([g, qs], i) => [i ? h('hr', { class: 'divider' }) : null, h('div', { class: 'stack-sm' }, h('h3', { class: 't-group' }, g), quoteList(qs))]),
      o.tasks.filter((t) => t.comments.length).map((t) => [h('hr', { class: 'divider' }), h('div', { class: 'stack-sm' }, h('h3', { class: 't-group' }, `โจทย์: ${t.title}`), quoteList(t.comments))]),
      !groups.size && !o.tasks.some((t) => t.comments.length) && h('p', { class: 't-xs t-muted' }, 'ยังไม่มีความเห็น'));

    return [head, bar, kpis, fixes, byTask, byPerson, voice, criteria()];
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
  fetch('study.json').then((r) => (r.ok ? r.json() : null)).then((s) => { if (s && s.tasks) { study = s; defs = s.tasks; document.title = `วิเคราะห์ผลผู้ใช้จริง · ${s.name}`; } }).catch(() => {}).finally(render);
})();
