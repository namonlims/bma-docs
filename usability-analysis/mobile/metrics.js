/* Usability Studio · ตัวชี้วัด usability มาตรฐาน — ใช้ร่วมกัน: หน้าผู้ทดสอบ (สรุปตอนจบ) · หน้าวิเคราะห์ผลรวมของเจ้าของ (bma-docs)
   ข้อมูลเข้า = payload ที่ run.js เก็บ (S.all / ไฟล์ผล .json/.txt): { session, kind: participant | task | sus | wrapup | note | events | audio | end, … }
   เกณฑ์อ้างอิง (ผู้ใช้ 20 พ.ย. 69 "ใช้ metric การวัดจาก usability testing"):
   - อัตราสำเร็จ (Completion rate) เฉลี่ยงานวิจัย 78% · Sauro 2011
   - SEQ ความง่ายต่อโจทย์ 1–7 เฉลี่ย 5.5 · Sauro & Dumas 2009
   - SUS 0–100 เฉลี่ย 68 · เกรดตาม Sauro-Lewis curved grading scale · คำบรรยายตาม Bangor 2009
   - ประสิทธิภาพเส้นทาง (Path efficiency) = จำนวนแตะที่ควร ÷ จำนวนแตะจริง · แตะพลาด (Misclick rate) = แตะโดนที่กดไม่ได้ ÷ แตะทั้งหมด
   - สำเร็จตรงทาง (Direct success) = สำเร็จโดยแตะไม่เกินที่ควร และไม่แตะพลาด (แบบ Useberry / Maze) */
(function (root) {
  const SEQ_AVG = 5.5;
  const SUCCESS_AVG = 0.78;
  const SUS_AVG = 68;
  const SUS_GRADES = [[84.1, 'A+'], [80.8, 'A'], [78.9, 'A-'], [77.2, 'B+'], [74.1, 'B'], [72.6, 'B-'], [71.1, 'C+'], [65, 'C'], [62.7, 'C-'], [51.7, 'D'], [0, 'F']];
  const SUS_WORDS = [[85, 'ดีเยี่ยม'], [72.75, 'ดี'], [52, 'พอใช้'], [39, 'แย่'], [0, 'แย่มาก']];

  const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const avg = (a) => { const v = a.map(num).filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const median = (a) => { const v = a.map(num).filter((x) => x != null).sort((x, y) => x - y); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
  const susScore = (a) => (Array.isArray(a) && a.length === 10 && !a.includes(0) ? a.reduce((s, x, i) => s + (i % 2 === 0 ? x - 1 : 5 - x), 0) * 2.5 : null);
  const susGrade = (s) => (s == null ? null : SUS_GRADES.find(([min]) => s >= min)[1]);
  const susWord = (s) => (s == null ? null : SUS_WORDS.find(([min]) => s >= min)[1]);

  /* ช่วงความเชื่อมั่น 95% ของอัตราสำเร็จ (Adjusted Wald · เหมาะกับกลุ่มตัวอย่างเล็ก) */
  function waldCI(k, n) {
    if (!n) return null;
    const z = 1.96; const n2 = n + z * z; const p = (k + (z * z) / 2) / n2; const m = z * Math.sqrt((p * (1 - p)) / n2);
    return [Math.max(0, p - m), Math.min(1, p + m)];
  }

  /* แยก payload เป็นรายคน (session) */
  function sessions(rows) {
    const by = new Map();
    for (const r of rows || []) {
      if (!r || !r.session) continue;
      if (!by.has(r.session)) by.set(r.session, { id: r.session, study: r.study, participant: null, tasks: [], sus: null, wrapup: [], notes: [], ended: false });
      const s = by.get(r.session);
      if (r.kind === 'participant') s.participant = r.participant || {};
      else if (r.kind === 'task' && r.result) { s.tasks = s.tasks.filter((t) => t.task !== r.result.task); s.tasks.push(r.result); }
      else if (r.kind === 'sus') s.sus = r.answers;
      else if (r.kind === 'wrapup') s.wrapup = r.answers || [];
      else if (r.kind === 'note') s.notes.push(r);
      else if (r.kind === 'end') s.ended = true;
    }
    return [...by.values()].filter((s) => s.tasks.length || s.sus);
  }

  const isDirect = (t) => t.outcome === 'success' && !t.misclicks && (!t.idealClicks || t.clicks <= t.idealClicks);

  /* สรุปรายโจทย์ · taskDefs = study.tasks (ชื่อ + จำนวนแตะที่ควร) */
  function taskStats(list, taskDefs) {
    const ids = [...new Set([...(taskDefs || []).map((t) => t.id), ...list.flatMap((s) => s.tasks.map((t) => t.task))])];
    return ids.map((id) => {
      const def = (taskDefs || []).find((t) => t.id === id) || {};
      const rs = list.flatMap((s) => s.tasks.filter((t) => t.task === id));
      const n = rs.length; const ok = rs.filter((t) => t.outcome === 'success');
      const clicks = rs.reduce((a, t) => a + (t.clicks || 0), 0);
      const ideal = def.idealClicks || (rs.find((t) => t.idealClicks) || {}).idealClicks || null;
      return {
        id, title: def.title || id, n, ideal,
        success: n ? ok.length / n : null, successCI: waldCI(ok.length, n),
        direct: n ? rs.filter(isDirect).length / n : null,
        skipped: n ? rs.filter((t) => t.outcome !== 'success').length / n : null,
        time: median(ok.map((t) => t.seconds)),
        clicks: median(rs.map((t) => t.clicks)),
        efficiency: ideal && ok.length ? Math.min(1, avg(ok.map((t) => (t.clicks ? ideal / t.clicks : 1)))) : null,
        misclick: clicks ? rs.reduce((a, t) => a + (t.misclicks || 0), 0) / clicks : null,
        seq: avg(rs.map((t) => t.ease || null)),
        confidence: avg(rs.map((t) => t.confidence || null)),
        comments: rs.map((t) => t.comment).filter(Boolean),
      };
    });
  }

  /* ระดับต่อเกณฑ์: good | mid | bad (ใช้เลือกสีป้าย) */
  const level = {
    success: (v) => (v == null ? null : v >= SUCCESS_AVG ? 'good' : v >= 0.5 ? 'mid' : 'bad'),
    seq: (v) => (v == null ? null : v >= SEQ_AVG ? 'good' : v >= 4 ? 'mid' : 'bad'),
    efficiency: (v) => (v == null ? null : v >= 0.8 ? 'good' : v >= 0.5 ? 'mid' : 'bad'),
    misclick: (v) => (v == null ? null : v <= 0.1 ? 'good' : v <= 0.25 ? 'mid' : 'bad'),
    sus: (v) => (v == null ? null : v >= SUS_AVG ? 'good' : v >= 51.7 ? 'mid' : 'bad'),
  };

  /* ข้อสังเกตต่อโจทย์ (สั้น · เรียงตามความรุนแรง) */
  function findings(t) {
    const out = [];
    if (t.success != null && t.success < SUCCESS_AVG) out.push({ lv: t.success < 0.5 ? 'bad' : 'mid', text: `ทำสำเร็จ ${pct(t.success)} ต่ำกว่าค่าเฉลี่ย 78%` });
    if (t.seq != null && t.seq < SEQ_AVG) out.push({ lv: t.seq < 4 ? 'bad' : 'mid', text: `ความง่าย ${fix(t.seq)}/7 ต่ำกว่าค่าเฉลี่ย 5.5` });
    if (t.efficiency != null && t.efficiency < 0.8) out.push({ lv: t.efficiency < 0.5 ? 'bad' : 'mid', text: `แตะเกินที่ควร (ประสิทธิภาพ ${pct(t.efficiency)})` });
    if (t.misclick != null && t.misclick > 0.1) out.push({ lv: t.misclick > 0.25 ? 'bad' : 'mid', text: `แตะพลาด ${pct(t.misclick)} ของการแตะ` });
    return out.sort((a, b) => (a.lv === 'bad' ? -1 : 1) - (b.lv === 'bad' ? -1 : 1));
  }

  /* ภาพรวมทั้งชุด */
  function overview(list, taskDefs) {
    const tasks = taskStats(list, taskDefs);
    const all = list.flatMap((s) => s.tasks);
    const sus = list.map((s) => susScore(s.sus)).filter((x) => x != null);
    const susAvg = avg(sus);
    const ok = all.filter((t) => t.outcome === 'success').length;
    return {
      people: list.length, attempts: all.length, tasks,
      success: all.length ? ok / all.length : null, successCI: waldCI(ok, all.length),
      direct: all.length ? all.filter(isDirect).length / all.length : null,
      seq: avg(all.map((t) => t.ease || null)),
      misclick: (() => { const c = all.reduce((a, t) => a + (t.clicks || 0), 0); return c ? all.reduce((a, t) => a + (t.misclicks || 0), 0) / c : null; })(),
      sus: susAvg, susN: sus.length, susGrade: susGrade(susAvg), susWord: susWord(susAvg),
      worst: tasks.filter((t) => t.n).map((t) => ({ t, f: findings(t) })).filter((x) => x.f.length).sort((a, b) => b.f.filter((f) => f.lv === 'bad').length - a.f.filter((f) => f.lv === 'bad').length || b.f.length - a.f.length),
    };
  }

  const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}%`);
  const fix = (v, d = 1) => (v == null ? '–' : (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.0+$/, ''));
  const secs = (v) => (v == null ? '–' : v >= 60 ? `${Math.floor(v / 60)} น. ${Math.round(v % 60)} วิ` : `${Math.round(v)} วิ`);

  root.UTMetrics = { SEQ_AVG, SUCCESS_AVG, SUS_AVG, avg, median, susScore, susGrade, susWord, waldCI, sessions, taskStats, overview, findings, level, pct, fix, secs };
})(typeof window !== 'undefined' ? window : globalThis);
