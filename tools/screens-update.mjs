// "อัปเดตภาพหน้าจอ" ของหน้า bma-docs/screens-latest.html (ผู้ใช้ 25 พ.ย. 69)
// ปุ่มในหน้า → POST /api/screens/refresh (เจ้าของเท่านั้น) → worktree origin/main → build → ถ่ายทุกหน้า × 4 ขนาด → เขียนภาพ + วันที่ + ประวัติลง bma-docs → push
// 2 ขั้น (ผู้ใช้ 25 พ.ย. 69): check = ถ่าย + เทียบภาพเดิม (หน้าไหนเปลี่ยน · วันไหน) → apply = ขึ้นเว็บเฉพาะหน้าที่เลือก
// ต้นฉบับ = ticket-studio/screens.mjs · สำเนาให้ทีม = bma-docs/tools/screens-update.mjs (แก้ที่ต้นฉบับแล้วคัดลอก)
// ทีมใช้จาก Claude Code ของตัวเอง: node screens-update.mjs check --app <โฟลเดอร์ bma.health> → เปิด review.html → apply [--routes /a,/b] = เปิด PR ให้เจ้าของ merge
import { spawn, execFile } from 'node:child_process'
import http from 'node:http'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, extname, resolve, sep } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const git = async (cwd, ...a) => (await run('git', a, { cwd, maxBuffer: 256 * 1024 * 1024 })).stdout
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const WIDTHS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]]
const PAGE = 'screens-latest.html'
const SHOT_DIR = 'tor-shots/screens-current' // ที่เดียว เขียนทับ · แคชกันด้วย ?v=
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const bkk = (d) => new Date(new Date(d).getTime() + 7 * 3600e3)
export const thaiDate = (d, long) => { const x = bkk(d), y = x.getUTCFullYear() + 543; return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${long ? y : String(y).slice(2)}` }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ป้ายบทบาทในหน้า → บทบาทเดโม · เข้าหน้าไม่ได้ (สิทธิ์เปลี่ยน) → ลองตัวถัดไปแล้วเปลี่ยนป้ายตามจริง
const ROLE = { 'แพทย์': 'doctor', 'เจ้าหน้าที่เวชระเบียน': 'mr', 'ผู้ดูแลระบบส่วนกลาง': 'admin_super', 'ผู้ดูแลระบบศูนย์': 'center_admin', 'พยาบาลคัดกรอง (วัณโรค)': 'nurse_screen_tb' }
const roleCandidates = (label, views) => {
  const exact = ROLE[label] || views.find((v) => v.label === label)?.value
  const list = [exact, 'doctor', 'admin_super', 'center_admin', 'mr', ...views.map((v) => v.value)].filter(Boolean)
  return [...new Set(list)]
}
const labelOf = (value, views) => Object.keys(ROLE).find((k) => ROLE[k] === value) || views.find((v) => v.value === value)?.label || value

// ───────── หน้า → แถว ─────────
const FIRST_SHOT = '2026-11-15T15:13:00+07:00' // ชุดแรก (แถวที่ยังไม่มี data-at)
const ROW = /<div class="row"(?: data-at="([^"]*)")?><div class="rh"><code>([^<]+)<\/code><span class="chip ([^"]*)">([^<]*)<\/span>(?:<span class="cnt">[^<]*<\/span>)?<\/div><div class="g">([\s\S]*?)<\/div><div class="hist">([\s\S]*?<\/ul>)<\/div><\/div>/g
export const parseRows = (html) => [...html.matchAll(ROW)].filter((m) => /tor-shots\/screens-/.test(m[5])).map((m) => ({ at: m[1] || FIRST_SHOT, route: m[2], chip: m[3], label: m[4], slug: m[5].match(/screens-[^/]+\/(.+?)-1440\.jpg/)[1], dir: m[5].match(/(tor-shots\/screens-[^/]+)\//)[1], all: m[0], hist: m[6] }))

function routeFiles(repo) {
  const src = readFileSync(join(repo, 'src/routes/Routes.jsx'), 'utf8'), f = {}
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*React\.lazy\(\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)\)/g)) f[m[1]] = m[2].replace(/^@\//, 'src/')
  for (const m of src.matchAll(/^import\s+(\w+)\s+from\s+'([^']+)'/gm)) f[m[1]] ||= m[2].replace(/^@\//, 'src/')
  const real = (p) => p && [p, p + '.jsx', p + '.js', p + '/index.jsx'].find((c) => existsSync(join(repo, c)) && statSync(join(repo, c)).isFile())
  const routes = [...src.matchAll(/<Route\b[^>]*?\bpath=['"]([^'"]+)['"][^>]*?\bcomponent=\{(\w+)\}/g)].map((m) => ({ rx: new RegExp('^' + m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:\w+(\\\([^)]*\\\))?(\\\?)?/g, '[^/]+') + '/?$'), file: real(f[m[2]]) }))
  return (url) => routes.find((r) => r.file && r.rx.test(url))?.file
}
const roleViews = (repo) => [...readFileSync(join(repo, 'src/data/staffRoleViews.js'), 'utf8').matchAll(/\{\s*value:\s*'(\w+)',\s*label:\s*'([^']+)'/g)].map((m) => ({ value: m[1], label: m[2] }))

// ───────── เสิร์ฟ dist (SPA) ─────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.pdf': 'application/pdf' }
const serve = (dist) => new Promise((ok) => {
  const base = resolve(dist)
  const s = http.createServer((q, r) => {
    let p; try { p = resolve(join(base, decodeURIComponent(q.url.split('?')[0]))) } catch { r.writeHead(400); return r.end() }
    if (p !== base && !p.startsWith(base + sep)) { r.writeHead(403); return r.end() }
    if (!existsSync(p) || !statSync(p).isFile()) { if (/\.\w{2,5}$/.test(p)) { r.writeHead(404); return r.end() } p = join(base, 'index.html') }
    r.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p))
  }); s.listen(0, '127.0.0.1', () => ok({ port: s.address().port, close: () => { s.closeAllConnections?.(); s.close() } }))
})

// ───────── Chrome 1 ตัว · หลาย context (localStorage แยกกัน) ─────────
async function chrome() {
  const port = 9900 + Math.floor(Math.random() * 90), profile = mkdtempSync(join(tmpdir(), 'ts-screens-'))
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' })
  const close = async () => { const gone = new Promise((r) => { proc.once('exit', r); setTimeout(r, 4000) }); proc.kill(); await gone; try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch {} }
  try {
    let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json() } catch { await sleep(250) } }
    if (!ver) throw new Error('เปิด Chrome ถ่ายภาพไม่ได้')
    const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no })
    let n = 0; const P = new Map()
    ws.onmessage = (e) => { const m = JSON.parse(e.data), p = P.get(m.id); if (p) { P.delete(m.id); clearTimeout(p.t); m.error ? p.no(new Error(m.error.message)) : p.ok(m.result) } }
    const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++n; P.set(id, { ok, no, t: setTimeout(() => { P.delete(id); no(new Error('Chrome ไม่ตอบ: ' + method)) }, 45000) }); ws.send(JSON.stringify({ id, method, params, sessionId })) })
    const tab = async (init) => {
      const { browserContextId } = await send('Target.createBrowserContext')
      const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId })
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
      const s = (m, p) => send(m, p, sessionId)
      await s('Page.enable'); await s('Network.enable')
      await s('Network.setBlockedURLs', { urls: ['*script.google.com*', '*googleusercontent.com*'] }) // ไม่เขียนข้อมูลกลางจริง
      await s('Page.addScriptToEvaluateOnNewDocument', { source: init })
      return { s, ev: async (x) => (await s('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.value, close: () => send('Target.disposeBrowserContext', { browserContextId }) }
    }
    return { tab, close }
  } catch (e) { await close(); throw e }
}
// ซ่อนการ์ดแจ้งเตือนลอยมุมขวาบน (display:none เท่านั้น ห้ามลบ node ของแอป)
const HIDE = `(()=>{const c=document.createElement('style');c.textContent='[data-floating-notice-dock]{display:none !important}';document.head.appendChild(c)})();[...document.querySelectorAll('body *')].forEach(e=>{if(getComputedStyle(e).position!=='fixed')return;const r=e.getBoundingClientRect();if(r.width>200&&r.width<620&&r.height>60&&r.height<500&&r.right>innerWidth-60&&r.top<140)e.style.display='none'})`

async function shootRow(br, origin, row, views, outDir) {
  let why = ''
  for (const role of roleCandidates(row.label, views)) {
    const t = await br.tab(`try{localStorage.setItem('mih:staff-role-view',${JSON.stringify(role)})}catch(e){};window.print=()=>{}`)
    try {
      const open = async (w, h) => {
        await t.s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 })
        await t.s('Page.navigate', { url: origin + row.route })
        let last = -1, same = 0
        for (let i = 0; i < 40; i++) { await sleep(500); const len = await t.ev('document.body?document.body.innerText.length:0'); const loading = await t.ev(`/^\\s*กำลังโหลด(…|\\.\\.\\.)?\\s*$/m.test(document.body?document.body.innerText:'')`); same = !loading && len > 80 && len === last ? same + 1 : 0; last = len; if (same >= 4) break }
        const stuck = same < 4 && await t.ev(`/^\\s*กำลังโหลด(…|\\.\\.\\.)?\\s*$/m.test(document.body.innerText)`)
        await t.ev('document.fonts.ready.then(()=>1)'); await sleep(1500)
        return { path: await t.ev('location.pathname'), len: stuck ? 0 : last, crash: await t.ev(`/เกิดข้อผิดพลาดในการแสดงผล|Something went wrong|Unexpected Application Error/.test(document.body.innerText)`) }
      }
      const shots = {}; let ok = true
      for (const [w, h] of WIDTHS) {
        const r = await open(w, h)
        if (r.path.replace(/\/$/, '') !== row.route) { why = `เด้งไป ${r.path}`; ok = false; break }
        if (r.crash || r.len < 80) { why = r.crash ? 'หน้าแสดงข้อผิดพลาด' : 'หน้าโหลดไม่เสร็จ'; return { ok: false, why } }
        await t.ev(HIDE); await sleep(120)
        // ถ่ายเมื่อภาพนิ่ง (กราฟ/แอนิเมชันจบ · ความกว้างคอลัมน์คำนวณเสร็จ): 2 ภาพห่างกัน 0.8 วิ เหมือนกัน · หน้าที่ขยับตลอดรอสูงสุด ~8 วิ
        const snap = async () => (await t.s('Page.captureScreenshot', { format: 'jpeg', quality: 62 })).data
        let prev = await snap(); for (let i = 0; i < 10; i++) { await sleep(800); const cur = await snap(); if (cur === prev) break; prev = cur }
        shots[w] = Buffer.from(prev, 'base64')
      }
      if (!ok) continue
      for (const w in shots) writeFileSync(join(outDir, `${row.slug}-${w}.jpg`), shots[w])
      return { ok: true, label: labelOf(role, views), same: role === (ROLE[row.label] || role) }
    } finally { await t.close().catch(() => {}) }
  }
  return { ok: false, why: why || 'ไม่มีบทบาทที่เข้าหน้านี้ได้' }
}

async function history(repo, file) {
  if (!file) return null
  const out = await git(repo, 'log', '--no-merges', '-5', '--format=%aI%x09%s', '--', file)
  const li = out.trim().split('\n').filter(Boolean).map((l) => { const [d, s] = l.split('\t'); const t = s.length > 160 ? s.slice(0, 159) + '…' : s; return `<li><span class="hd">${thaiDate(d)}</span><span>${esc(t)}</span></li>` })
  return li.length ? `<p class="hh">ประวัติการแก้ไขหน้านี้ (ล่าสุด 5 ครั้ง)</p><ul>${li.join('')}</ul>` : null
}

// วันที่เปลี่ยน = commit หลังภาพเดิมของไฟล์หน้า · ไม่มี → ชิ้นที่หน้านั้น import ตรง
async function changesSince(repo, file, since) {
  if (!file) return []
  const log = async (files) => (await git(repo, 'log', '--no-merges', '-6', '--since=' + since, '--format=%aI%x09%s', '--', ...files)).trim().split('\n').filter(Boolean).map((l) => { const [d, t] = l.split('\t'); return { date: thaiDate(d), text: t.length > 140 ? t.slice(0, 139) + '…' : t } })
  const own = await log([file]); if (own.length) return own
  const src = readFileSync(join(repo, file), 'utf8'), base = dirname(file)
  const deps = [...src.matchAll(/from\s+'([@.][^']+)'/g)].map((m) => m[1].startsWith('@/') ? 'src/' + m[1].slice(2) : m[1].startsWith('.') ? join(base, m[1]) : '').filter(Boolean).map((p) => [p, p + '.jsx', p + '.js', p + '/index.jsx', p + '/index.js'].find((c) => existsSync(join(repo, c)) && statSync(join(repo, c)).isFile())).filter(Boolean)
  return deps.length ? (await log(deps)).map((c) => ({ ...c, shared: true })) : []
}
// สัดส่วนจุดภาพที่ต่าง (0–1) เทียบที่ความกว้างเล็กเพื่อไม่ให้ความคมของ JPEG นับเป็นการเปลี่ยน
const DIFF = (a, b) => `(async()=>{const L=(d)=>new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src='data:image/jpeg;base64,'+d});const [x,y]=await Promise.all([L(${JSON.stringify(a)}),L(${JSON.stringify(b)})]);const w=200,h=Math.round(w*y.height/y.width);const G=(i)=>{const c=new OffscreenCanvas(w,h),g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(i,0,0,w,h);return g.getImageData(0,0,w,h).data};const p=G(x),q=G(y);let n=0;for(let i=0;i<p.length;i+=4){if(Math.abs(p[i]-q[i])+Math.abs(p[i+1]-q[i+1])+Math.abs(p[i+2]-q[i+2])>60)n++}return n/(w*h)})()`
const CHANGED = 0.01

// เขียน HTML: ภาพ + ป้ายบทบาท + ประวัติของแถวที่ถ่ายได้ · แถวที่ถ่ายไม่ได้คงภาพเดิม
export function rewrite(html, rows, results, hashes, at) {
  for (const row of rows) {
    const r = results[row.route]; if (!r?.ok) continue
    // เขียนภาพครบ 4 ขนาดเสมอ (บางแถวเดิมขาดขนาด)
    const figs = WIDTHS.map(([w]) => { const u = `${SHOT_DIR}/${row.slug}-${w}.jpg?v=${hashes[`${row.slug}-${w}`]}`; return `<figure><a href="${u}" target="_blank"><img loading="lazy" src="${u}" alt="${esc(row.route)} ${w}px"></a><figcaption>${w} px</figcaption></figure>` }).join('')
    let s = row.all.replace(/<div class="g">[\s\S]*?<\/div>(?=<div class="hist">)/, () => `<div class="g">${figs}</div>`)
    if (!r.same) s = s.replace(`>${row.label}</span>`, () => `>${esc(r.label)}</span>`)
    if (r.hist) s = s.replace(row.hist, () => r.hist)
    s = s.replace(/^<div class="row"[^>]*>/, `<div class="row" data-at="${r.at || at}">`).replace(/(<span class="chip [^"]*">[^<]*<\/span>)(?:<span class="cnt">[^<]*<\/span>)?<\/div>/, `$1<span class="cnt">ถ่าย ${thaiDate(r.at || at)}</span></div>`)
    html = html.replace(row.all, () => s)
  }
  return html.replace(/(?:ถ่าย|อัปเดตล่าสุด) \d+ [^ ]+ \d{4}(?: \d\d:\d\d น\.)?/, `อัปเดตล่าสุด ${thaiDate(at, true)} ${bkk(at).toISOString().slice(11, 16)} น.`)
}

// ───────── งานหลัก (ทีละงาน) ─────────
export function createScreens({ cfg, dataDir }) {
  let st = { status: 'idle' }, busy = false
  const stateFile = join(dataDir, 'screens-last.json')
  if (existsSync(stateFile)) try { st = JSON.parse(readFileSync(stateFile, 'utf8')) } catch {}
  if (st.status === 'running') st = { ...st, status: 'error', error: 'Studio ถูกปิดระหว่างอัปเดต — กดตรวจใหม่ได้' }
  const set = (p) => { st = { ...st, ...p }; writeFileSync(stateFile, JSON.stringify(st)) }
  const docsRepo = (cfg.docsRepo || '~/Desktop/bma-docs').replace(/^~/, homedir())

  async function worktree(repo, dir, ref) {
    await git(repo, 'fetch', '-q', 'origin', 'main')
    if (existsSync(dir)) { rmSync(join(dir, 'node_modules'), { force: true }); await git(repo, 'worktree', 'remove', '--force', dir).catch(() => rmSync(dir, { recursive: true, force: true })) }
    await git(repo, 'worktree', 'prune'); await git(repo, 'worktree', 'add', '-q', '--detach', dir, ref)
  }
  const app = join(dataDir, 'screens-app'), docs = join(dataDir, 'screens-docs'), shots = join(dataDir, 'screens-shots'), keep = join(dataDir, 'screens-review.json')
  const dropApp = async () => { try { rmSync(join(app, 'node_modules'), { force: true }); await git(cfg.targetRepo, 'worktree', 'remove', '--force', app) } catch {} }
  const dropDocs = () => git(docsRepo, 'worktree', 'remove', '--force', docs).catch(() => {})

  // ① ถ่ายใหม่ + เทียบกับภาพเดิม — ยังไม่แตะเว็บ
  async function check({ limit, dist }) {
    let br, sv
    try {
      set({ stage: 'ดึงโค้ดล่าสุดจาก main' })
      await worktree(cfg.targetRepo, app, 'origin/main'); await worktree(docsRepo, docs, 'origin/main')
      const commit = (await git(app, 'rev-parse', '--short=8', 'HEAD')).trim()
      set({ commit })
      if (!dist) {
        set({ stage: 'สร้างระบบจากโค้ดล่าสุด (build)' })
        symlinkSync(join(cfg.targetRepo, 'node_modules'), join(app, 'node_modules'))
        await run('npx', ['vite', 'build'], { cwd: app, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }, maxBuffer: 64 * 1024 * 1024, timeout: 20 * 60e3 })
          .catch((e) => { throw new Error('build ไม่ผ่าน: ' + String(e.stderr || e.message).trim().slice(-300)) })
        dist = join(app, 'dist')
      }
      const all = parseRows(readFileSync(join(docs, PAGE), 'utf8')); const rows = limit ? all.slice(0, limit) : all
      if (!rows.length) throw new Error('อ่านรายการหน้าจาก screens-latest.html ไม่ได้ (โครงหน้าเปลี่ยน)')
      rmSync(shots, { recursive: true, force: true }); mkdirSync(shots, { recursive: true })
      const views = roleViews(app), fileOf = routeFiles(app), results = {}
      sv = await serve(dist); br = await chrome()
      set({ stage: 'ถ่ายภาพและเทียบกับภาพเดิม', done: 0, total: rows.length })
      const q = [...rows]
      await Promise.all(Array.from({ length: 4 }, async () => {
        const cmp = await br.tab('')
        for (let row; (row = q.shift());) {
          let r
          for (let k = 0; k < 2 && !r?.ok; k++) try { r = await shootRow(br, `http://127.0.0.1:${sv.port}`, row, views, shots) } catch (e) { r = { ok: false, why: String(e.message).slice(0, 120) } }
          if (r.ok) {
            r.at = new Date().toISOString(); r.diff = {}
            for (const [w] of WIDTHS) {
              const old = join(docs, row.dir, `${row.slug}-${w}.jpg`)
              r.diff[w] = existsSync(old) ? (await cmp.ev(DIFF(readFileSync(old).toString('base64'), readFileSync(join(shots, `${row.slug}-${w}.jpg`)).toString('base64')))) ?? 1 : 1
            }
            r.changed = Math.max(...Object.values(r.diff)) >= CHANGED
            r.hist = await history(app, fileOf(row.route)).catch(() => null)
            r.commits = r.changed ? await changesSince(app, fileOf(row.route), row.at).catch(() => []) : []
          }
          results[row.route] = r; set({ done: Object.keys(results).length })
        }
      }))
      const failed = rows.filter((r) => !results[r.route].ok).map((r) => ({ route: r.route, why: results[r.route].why }))
      if (failed.length > rows.length / 2) throw new Error(`ถ่ายไม่ได้ ${failed.length} จาก ${rows.length} หน้า (${failed[0].why})`)
      const changes = rows.filter((r) => results[r.route].changed).map((r) => { const x = results[r.route]; return { route: r.route, slug: r.slug, dir: r.dir, label: x.label, oldDate: thaiDate(r.at), newDate: thaiDate(x.at), widths: WIDTHS.map(([w]) => ({ w, pct: Math.round(x.diff[w] * 1000) / 10 })), commits: x.commits } })
      writeFileSync(keep, JSON.stringify({ commit, results }))
      set({ status: 'review', stage: 'รอยืนยัน', failed, changes, same: rows.length - failed.length - changes.length, finishedAt: new Date().toISOString() })
    } catch (e) { set({ status: 'error', error: String(e.message || e).slice(0, 400), finishedAt: new Date().toISOString() }) }
    finally { await br?.close(); sv?.close(); busy = false; await dropApp(); await dropDocs() }
  }

  // ② ขึ้นเว็บเฉพาะหน้าที่เลือก · pr = เปิด PR แทน push main (คนที่ไม่ใช่เจ้าของ)
  async function apply({ routes, pr }) {
    try {
      const { commit, results: all } = JSON.parse(readFileSync(keep, 'utf8'))
      const results = Object.fromEntries(Object.entries(all).filter(([k, v]) => v.ok && routes.includes(k)))
      const n = Object.keys(results).length, at = new Date().toISOString()
      set({ stage: 'เขียนหน้าเอกสาร' })
      await worktree(docsRepo, docs, 'origin/main')
      const write = () => {
        const page = join(docs, PAGE), dir = join(docs, SHOT_DIR); mkdirSync(dir, { recursive: true })
        const h = readFileSync(page, 'utf8'), rows = parseRows(h).filter((r) => results[r.route]), hashes = {}
        if (!rows.length) throw new Error('ไม่พบหน้าที่เลือกใน screens-latest.html')
        for (const r of rows) for (const [w] of WIDTHS) { const k = `${r.slug}-${w}`, b = readFileSync(join(shots, k + '.jpg')); writeFileSync(join(dir, k + '.jpg'), b); hashes[k] = createHash('sha1').update(b).digest('hex').slice(0, 8) }
        const now = rewrite(h, rows, results, hashes, at); writeFileSync(page, now)
        const idx = join(docs, 'index.html'); writeFileSync(idx, readFileSync(idx, 'utf8').replace(/(แยกตามคลินิก\/ระบบงาน · )(?:ถ่าย|อัปเดตล่าสุด) \d+ [^ ]+ \d+/g, `$1อัปเดตล่าสุด ${thaiDate(at)}`))
        for (const d of readdirSync(join(docs, 'tor-shots')).filter((x) => /^screens-\d{4}-\d\d-\d\d$/.test(x))) for (const f of readdirSync(join(docs, 'tor-shots', d))) if (!now.includes(`${d}/${f}`)) rmSync(join(docs, 'tor-shots', d, f))
      }
      const msg = `ภาพหน้าจอปัจจุบัน: อัปเดต ${n} หน้า × 4 ขนาด จากโค้ด ${commit} (${thaiDate(at)})`
      const save = async () => { write(); await git(docs, 'add', '-A', '--', PAGE, 'index.html', 'tor-shots'); await git(docs, 'commit', '-q', '-m', msg) }
      let url = ''
      set({ stage: pr ? 'เปิด PR' : 'ส่งขึ้นเว็บเอกสาร' })
      if (pr) {
        await save()
        const branch = 'screens/' + at.slice(0, 16).replace(/[^0-9]/g, ''), gh = async (...a) => (await run('gh', a, { cwd: docs })).stdout.trim()
        const me = await gh('api', 'user', '--jq', '.login')
        const can = (await gh('api', 'repos/namonlims/bma-docs', '--jq', '.permissions.push')) === 'true'
        if (!can) await gh('repo', 'fork', 'namonlims/bma-docs', '--clone=false')
        await run('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '-q', `https://github.com/${can ? 'namonlims' : me}/bma-docs.git`, `HEAD:refs/heads/${branch}`], { cwd: docs, maxBuffer: 64 * 1024 * 1024 })
        url = (await gh('pr', 'create', '-R', 'namonlims/bma-docs', '--base', 'main', '--head', can ? branch : `${me}:${branch}`, '--title', msg, '--body', Object.keys(results).map((r) => '- `' + r + '`').join('\n'))).split('\n').pop()
      } else for (let i = 0; ; i++) {
        await save()
        try { await git(docs, 'push', '-q', 'origin', 'HEAD:main'); break } catch (e) {
          if (i >= 2) throw new Error('push bma-docs ไม่สำเร็จ: ' + String(e.stderr || e.message).slice(-200))
          await git(docs, 'fetch', '-q', 'origin', 'main'); await git(docs, 'reset', '-q', '--hard', 'origin/main') // มีคน push แทรก → เขียนบนฉบับใหม่
        }
      }
      set({ status: 'done', stage: pr ? 'เปิด PR แล้ว' : 'ส่งขึ้นเว็บแล้ว', finishedAt: at, ok: n, url, changes: [], error: null })
    } catch (e) { set({ status: 'review', error: 'ส่งขึ้นเว็บไม่สำเร็จ: ' + String(e.stderr || e.message || e).slice(0, 300) }) }
    finally { busy = false; await dropDocs() }
  }
  const lock = () => { if (busy) throw new Error('กำลังทำงานอยู่ รอให้เสร็จก่อน'); busy = true }
  return {
    state: () => st,
    shot: (name) => { const f = join(shots, name); return /^[\w-]+-(1440|1024|768|390)\.jpg$/.test(name) && existsSync(f) ? readFileSync(f) : null },
    check: (o = {}) => { lock(); st = {}; set({ status: 'running', stage: 'เริ่มตรวจ', startedAt: new Date().toISOString(), done: 0, total: 0, failed: [], error: null }); return check(o) },
    apply: (o) => {
      if (st.status !== 'review') throw new Error('ต้องตรวจการเปลี่ยนแปลงก่อน')
      const ok = new Set((st.changes || []).map((c) => c.route)), routes = (Array.isArray(o.routes) ? o.routes : []).filter((r) => ok.has(r))
      if (!routes.length) throw new Error('เลือกอย่างน้อย 1 หน้า')
      lock(); set({ status: 'running', stage: 'เริ่มอัปเดต', done: 0, total: 0, error: null }); return apply({ ...o, routes })
    },
  }
}

// ───────── ใช้จาก Claude Code ของทีม (เจ้าของใช้ปุ่มในหน้าเว็บ) ─────────
const reviewHtml = (st, docsRepo, shots) => `<!doctype html><meta charset="utf-8"><title>ตรวจภาพหน้าจอ</title><style>body{font-family:system-ui;margin:24px}.g{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;border:1px solid #ddd}</style><h1>เปลี่ยน ${st.changes.length} หน้า · เหมือนเดิม ${st.same}</h1>` + st.changes.map((c) => `<h2>${esc(c.route)}</h2><p>${c.commits.map((x) => esc(x.date + ' · ' + x.text)).join('<br>') || 'ไม่พบ commit ของหน้านี้'}</p>${c.widths.map(({ w, pct }) => `<p>${w} px · ต่าง ${pct}%</p><div class="g"><figure>เดิม ${c.oldDate}<img src="https://namonlims.github.io/bma-docs/${c.dir}/${c.slug}-${w}.jpg"></figure><figure>ใหม่ ${c.newDate}<img src="file://${shots}/${c.slug}-${w}.jpg"></figure></div>`).join('')}`).join('')
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined }, cmd = process.argv[2]
  const here = dirname(fileURLToPath(import.meta.url))
  const dataDir = resolve(arg('--data') || join(homedir(), '.phcis-screens')); mkdirSync(dataDir, { recursive: true })
  const docsRepo = resolve(arg('--docs') || join(here, '..'))
  if (!['check', 'apply'].includes(cmd) || (cmd === 'check' && !arg('--app'))) { console.error('ใช้: check --app <โฟลเดอร์ bma.health> [--limit n] | apply [--routes /a,/b]'); process.exit(2) }
  try { console.log('GitHub:', (await run('gh', ['api', 'user', '--jq', '.login'])).stdout.trim()) } catch { console.error('ยังไม่ได้ยืนยันตัวตน — รัน: gh auth login'); process.exit(1) }
  const s = createScreens({ cfg: { targetRepo: resolve(arg('--app') || '.'), docsRepo }, dataDir })
  const t = setInterval(() => { const x = s.state(); console.log(x.stage, (x.done || 0) + '/' + (x.total || 0)) }, 20000)
  try {
    if (cmd === 'check') { await s.check({ limit: +arg('--limit') || 0, dist: arg('--dist') }); if (s.state().status === 'review') { writeFileSync(join(dataDir, 'review.html'), reviewHtml(s.state(), docsRepo, join(dataDir, 'screens-shots'))); console.log('เปิดดู:', join(dataDir, 'review.html')) } }
    else await s.apply({ pr: true, routes: arg('--routes')?.split(',') || (s.state().changes || []).map((c) => c.route) })
  } catch (e) { console.error(e.message) } finally { clearInterval(t) }
  const x = s.state(); console.log(x.status, x.error || '', x.url || '', `เปลี่ยน ${x.changes?.length ?? 0} · เหมือนเดิม ${x.same ?? 0} · ถ่ายไม่ได้ ${x.failed?.length ?? 0}`)
  process.exit(x.error ? 1 : 0)
}
