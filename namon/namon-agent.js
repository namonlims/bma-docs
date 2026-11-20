// Namon — agent mascot (3D clay · มีชีวิต) · ใช้: <script type="module" src="namon-agent.js"></script> แล้ว <namon-agent pose="working" size="120"></namon-agent>
// pose: idle (รอ) · thinking (LLM กำลังคิด) · working (agent กำลังแก้) · done (เสร็จ) · waiting (รอคนอนุมัติ) · sleep (ออฟไลน์/ผิดพลาด)
// เคารพ prefers-reduced-motion (ภาพนิ่ง) · หยุดวาดเมื่อมองไม่เห็น · ?still=1 = ภาพนิ่งสำหรับถ่ายภาพ
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js'

const C = { body: 0x5C7BFF, shade: 0x4A68FF, clover: 0xC6F432, cloverDark: 0x9CCB1C, white: 0xFDFDFB, eye: 0x15171C, cheek: 0xF27FA6, leaf: 0x9CCB1C, leafDark: 0xC6F432, pink: 0xE0607E, blue: 0x3F5BFA, lime: 0xC6F432 }
export const POSES = ['idle', 'thinking', 'working', 'done', 'waiting', 'sleep']
const LABEL = { idle: 'Namon เดินเล่น พร้อมทำงาน', thinking: 'Namon กำลังคิด', working: 'Namon กำลังลงมือแก้', done: 'Namon ทำเสร็จแล้ว', waiting: 'Namon รอคุณอนุมัติ', sleep: 'Namon พักอยู่' }

const clay = (c, extra = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.66, metalness: 0, ...extra })
const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = false; return o }
function blob(a = 0.98, b = 1.2, n = 2.25, seg = 96) {
  const pts = []
  for (let i = 0; i <= seg; i++) { const t = -Math.PI / 2 + (i / seg) * Math.PI, c = Math.cos(t), s = Math.sin(t); const x = a * Math.pow(Math.abs(c), 2 / n), y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n); pts.push(new THREE.Vector2(Math.max(x, 0.0001) * (1 + 0.13 * (1 - (y + b) / (2 * b))), y + b + 0.16)) }
  BLOB_PTS = pts
  return new THREE.LatheGeometry(pts, 128)
}
let BLOB_PTS = null
const ZS = 0.86
// จุดบนผิวตัว ณ (x, y) ด้านหน้า → ให้ตา แก้ม ปาก แปะบนผิวจริง (ผู้ใช้ 21 พ.ย. 69 "ตาต้องแปะอยู่บนก้อนสีน้ำเงิน")
function radiusAt(y) { const P = BLOB_PTS; for (let i = 1; i < P.length; i++) { if ((P[i - 1].y - y) * (P[i].y - y) <= 0) { const t = (y - P[i - 1].y) / ((P[i].y - P[i - 1].y) || 1); return P[i - 1].x + (P[i].x - P[i - 1].x) * t } } return 0.5 }
function onSurface(obj, x, y, lift = 0) { const r = radiusAt(y), zz = Math.sqrt(Math.max(0.0001, r * r - x * x)); obj.position.set(x, y, zz * ZS + lift); const ny = (radiusAt(y + 0.02) - radiusAt(y - 0.02)) / 0.04; obj.rotation.y = Math.atan2(x, zz * ZS); obj.rotation.x = -Math.atan(ny) * 0.9; return obj }


// ของในมือ — จับคู่กับงานของ agent (ผู้ใช้ 21 พ.ย. 69 · แรงบันดาลใจ "ALL 16 TYPES")
export const PROPS = {
  magnifier: { th: 'แว่นขยาย', role: 'ค้นเอกสาร / TOR' },
  paintbrush: { th: 'พู่กัน', role: 'ออกแบบหน้าจอ' },
  wrench: { th: 'ประแจ', role: 'แก้โค้ด' },
  book: { th: 'หนังสือ', role: 'คลังคำ / เอกสาร' },
  camera: { th: 'กล้อง', role: 'ถ่ายภาพหน้าจอ' },
  coffee: { th: 'กาแฟ', role: 'พักเบรก' },
  map: { th: 'แผนที่', role: 'User flow' },
  compass: { th: 'เข็มทิศ', role: 'วางแผนงาน UX' },
  mic: { th: 'ไมค์', role: 'สรุปประชุม' },
  chess: { th: 'หมากรุก', role: 'วางกลยุทธ์' },
  mouse: { th: 'เมาส์', role: 'ทดสอบ usability' },
  flower: { th: 'ดอกไม้', role: 'ขอบคุณ / เสร็จงาน' },
}

// กล่องขอบมน (soft clay) — extrude สี่เหลี่ยมมุมมน + bevel
function rbox(w, h, d, r = 0.06) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)
  const x = w / 2 - r, y = h / 2 - r, sh = new THREE.Shape(), k = r * 0.6
  sh.moveTo(-x, -y - 0.0001); sh.lineTo(x, -y - 0.0001); sh.lineTo(x, y); sh.lineTo(-x, y); sh.lineTo(-x, -y - 0.0001)
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 8, curveSegments: 8 })
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); return g
}
function rtri(w, h, d, r = 0.06) {
  const sh = new THREE.Shape(); sh.moveTo(-w / 2 + r, 0); sh.lineTo(w / 2 - r, 0); sh.lineTo(0, h - r); sh.lineTo(-w / 2 + r, 0)
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 8 }); g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); return g
}
function makeProp(id) {
  const g = new THREE.Group(), M = (c, o = {}) => clay(c, { roughness: 0.5, ...o })
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m }
  const cap = (r, len, c, x, y, z, rz = 0) => add(new THREE.CapsuleGeometry(r, len, 10, 24), M(c), x, y, z, 0, 0, rz)
  if (id === 'magnifier') { add(new THREE.TorusGeometry(0.24, 0.085, 24, 48), M(0x6C7BF2), 0, 0.2, 0); add(new THREE.SphereGeometry(0.2, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xE6EEFF, transparent: true, opacity: 0.6, roughness: 0.1 }), 0, 0.2, 0).scale.set(1, 1, 0.25); cap(0.08, 0.32, 0x6C7BF2, 0.28, -0.2, 0, 0.62) }
  if (id === 'paintbrush') { cap(0.085, 0.8, 0xE7A877, -0.05, -0.08, 0, -0.6); add(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 24), M(0xD6DAE2, { roughness: 0.35 }), 0.27, 0.38, 0, 0, 0, -0.6); const tip = add(new THREE.SphereGeometry(0.12, 24, 18), M(0xF28FB2), 0.4, 0.57, 0); tip.scale.set(0.9, 1.5, 0.9); tip.rotation.z = -0.6 }
  if (id === 'wrench') { cap(0.09, 0.62, 0xA9B4C9, -0.04, -0.1, 0, -0.5); const hd = add(new THREE.TorusGeometry(0.17, 0.1, 20, 36, Math.PI * 1.45), M(0xA9B4C9), 0.24, 0.4, 0, 0, 0, Math.PI * 0.3) }
  if (id === 'book') { add(rbox(0.78, 0.6, 0.24, 0.08), M(0xF28FB2), 0, 0, 0); add(rbox(0.68, 0.52, 0.2, 0.05), M(0xFFF6EA), 0.05, 0, 0.0); add(rbox(0.3, 0.08, 0.04, 0.02), M(0xFFFFFF), -0.05, 0.12, 0.125) }
  if (id === 'camera') { add(rbox(0.8, 0.52, 0.36, 0.13), M(0x7C8CF8), 0, 0, 0); add(new THREE.TorusGeometry(0.15, 0.06, 20, 36), M(0x4A57C9), 0, -0.01, 0.19); add(new THREE.SphereGeometry(0.13, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0x2B3170, roughness: 0.1, clearcoat: 1 }), 0, -0.01, 0.17).scale.set(1, 1, 0.5); add(rbox(0.18, 0.1, 0.16, 0.04), M(0xC6F432), -0.22, 0.29, 0) }
  if (id === 'coffee') { add(new THREE.CylinderGeometry(0.4, 0.36, 0.06, 40), M(0xFFFFFF), 0, -0.2, 0); add(new THREE.TorusGeometry(0.37, 0.03, 12, 40), M(0xFFFFFF), 0, -0.17, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.22, 0.17, 0.32, 32), M(0xFFFFFF), 0, -0.02, 0); add(new THREE.CircleGeometry(0.2, 32), M(0xB07A50), 0, 0.14, 0, -Math.PI / 2); add(new THREE.TorusGeometry(0.21, 0.025, 12, 32), M(0xFFFFFF), 0, 0.14, 0, Math.PI / 2); add(new THREE.TorusGeometry(0.09, 0.035, 12, 24), M(0xFFFFFF), 0.25, -0.02, 0) }
  if (id === 'map') { [-0.27, 0, 0.27].forEach((x, i) => add(rbox(0.28, 0.64, 0.06, 0.025), M(i === 1 ? 0xEADBB3 : 0xF5E9C9), x, 0, i === 1 ? -0.03 : 0, 0, i === 1 ? 0 : (i ? -0.25 : 0.25))); [[-0.2, 0.1], [0.05, -0.08], [0.25, 0.14]].forEach(([x, y]) => add(new THREE.SphereGeometry(0.075, 20, 14), M(0x8FD9AE), x, y, 0.04).scale.set(1.4, 1, 0.35)) }
  if (id === 'compass') { add(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 48), M(0xE2B979), 0, 0, 0, Math.PI / 2); add(new THREE.TorusGeometry(0.3, 0.06, 20, 48), M(0xE2B979), 0, 0, 0); add(new THREE.CircleGeometry(0.25, 40), M(0xFFF8EE), 0, 0, 0.075); add(new THREE.SphereGeometry(0.06, 16, 12), M(0xF28FB2), 0, 0.1, 0.08).scale.set(0.8, 1.8, 0.5); add(new THREE.SphereGeometry(0.06, 16, 12), M(0x7C8CF8), 0, -0.1, 0.08).scale.set(0.8, 1.8, 0.5); add(new THREE.TorusGeometry(0.07, 0.03, 12, 24), M(0xE2B979), 0, 0.38, 0) }
  if (id === 'mic') { add(new THREE.SphereGeometry(0.2, 32, 24), M(0xB9C0CC), 0.16, 0.32, 0); cap(0.08, 0.42, 0x4A4F63, 0, 0, 0, 0.45) }
  if (id === 'chess') { const k = M(0x6B5A5A); add(new THREE.CylinderGeometry(0.24, 0.28, 0.12, 32), k, 0, -0.42, 0); add(new THREE.TorusGeometry(0.25, 0.05, 12, 32), k, 0, -0.38, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.12, 0.22, 0.5, 32), k, 0, -0.12, 0); add(new THREE.SphereGeometry(0.17, 24, 18), k, 0, 0.2, 0); cap(0.045, 0.12, 0x6B5A5A, 0, 0.44, 0); cap(0.045, 0.1, 0x6B5A5A, 0, 0.46, 0, Math.PI / 2) }
  if (id === 'mouse') { const mo = add(new THREE.SphereGeometry(0.25, 32, 24), M(0xF7F7FA), 0, 0, 0); mo.scale.set(0.82, 1.2, 0.6); add(rbox(0.035, 0.14, 0.06, 0.015), M(0xC9CED6), 0, 0.17, 0.14); add(new THREE.TorusGeometry(0.2, 0.025, 10, 24, Math.PI), M(0xC9CED6), 0.18, 0.28, 0) }
  if (id === 'flower') { cap(0.035, 0.7, 0x86C25A, 0, -0.1, 0); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(new THREE.SphereGeometry(0.11, 24, 16), M(0xF7A3C2), Math.cos(a) * 0.14, 0.38 + Math.sin(a) * 0.14, 0).scale.set(1, 1, 0.55) } add(new THREE.SphereGeometry(0.09, 20, 14), M(0xFFDA77), 0, 0.38, 0.04); add(new THREE.SphereGeometry(0.1, 16, 12), M(0x9AD36A), 0.12, -0.05, 0).scale.set(1.6, 0.6, 0.45) }
  if (id === 'house') { add(rbox(0.66, 0.5, 0.52, 0.09), M(0xFFF1DC), 0, -0.13, 0); add(rtri(0.86, 0.42, 0.6, 0.06), M(0xF28FB2), 0, 0.1, 0); add(rbox(0.17, 0.26, 0.06, 0.04), M(0x7C8CF8), 0, -0.25, 0.27); add(rbox(0.14, 0.14, 0.05, 0.03), M(0xC6F432), 0.19, -0.07, 0.27) }
  return g
}

function build(pose, prop) {
  if (pose === 'object') { const root = new THREE.Group(), hop = new THREE.Group(); root.add(hop); const pr = makeProp(prop || 'house'); pr.position.set(0, 1.45, 0); pr.scale.setScalar(2.5); pr.rotation.y = 0.35; hop.add(pr); return { root, hop, bodyG: hop, eyes: [], extras: [], feet: [], sprout: hop, L: hop, R: hop, prop: pr, object: true } }
  const eyeM = new THREE.MeshPhysicalMaterial({ color: C.eye, roughness: 0.18, clearcoat: 1 }), hiM = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const root = new THREE.Group(), hop = new THREE.Group(), bodyG = new THREE.Group(); root.add(hop); hop.add(bodyG)
  const R = { root, hop, bodyG, eyes: [], extras: [] }
  const body = mesh(blob(), clay(C.body)); body.scale.set(1, 1, ZS); bodyG.add(body)
  // ตาจุดดำ (ไม่มีตาขาว) ตามภาพอ้างอิง 21 พ.ย. 69
  const eye = (x, look = [0, 0], squash = 1) => {
    const g = new THREE.Group()
    // ตาน่ารัก: วงรีดำเงา สูงกว่ากว้าง + ประกายใหญ่/เล็ก 2 จุด (ผู้ใช้ 21 พ.ย. 69)
    const e = mesh(new THREE.SphereGeometry(0.1, 40, 32), new THREE.MeshPhysicalMaterial({ color: 0x14152A, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }), false); e.scale.set(0.92, 1.28 * squash, 0.45); e.position.set(look[0] * 0.5, look[1] * 0.5 * squash, 0.02); g.add(e)
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), hiM); h1.position.set(look[0] * 0.5 + 0.03, look[1] * 0.5 * squash + 0.05 * squash, 0.065); g.add(h1)
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), hiM); h2.position.set(look[0] * 0.5 - 0.03, look[1] * 0.5 * squash - 0.045 * squash, 0.06); g.add(h2)
    onSurface(g, x * 1.05, 1.98, -0.01); R.eyes.push(g); return g
  }
  const arcEye = (x, up = true) => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.024, 16, 48, Math.PI), eyeM); if (!up) t.rotation.z = Math.PI; g.add(t); onSurface(g, x * 1.05, up ? 1.95 : 2.0, 0.005); return g }
  // ปากขีดสั้น หางงอนสองข้าง
  const mouth = () => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 12, 32, Math.PI), eyeM); t.rotation.z = Math.PI; const g = new THREE.Group(); g.add(t); onSurface(g, 0, 1.86, 0.005); return g }
  for (const sx of [-1, 1]) { const ch = mesh(new THREE.SphereGeometry(0.09, 32, 24), clay(C.cheek, { roughness: 0.7, transparent: true, opacity: 0.85 }), false); ch.scale.set(1.2, 0.7, 0.3); onSurface(ch, sx * 0.42, 1.8, -0.01); bodyG.add(ch) }
  // ใบโคลเวอร์ 4 แฉก (หัวใจ) สีเขียวมะนาว
  const sprout = new THREE.Group(); sprout.position.set(0.38, 2.42, 0); sprout.rotation.z = -0.28
  const stem = mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.56, 20), clay(C.cloverDark)); stem.position.set(0.03, 0.26, 0); stem.rotation.z = -0.1; sprout.add(stem)
  const heart = new THREE.Shape(); heart.moveTo(0, 0); heart.bezierCurveTo(-0.02, 0.1, -0.2, 0.16, -0.2, 0.3); heart.bezierCurveTo(-0.2, 0.42, -0.06, 0.45, 0, 0.36); heart.bezierCurveTo(0.06, 0.45, 0.2, 0.42, 0.2, 0.3); heart.bezierCurveTo(0.2, 0.16, 0.02, 0.1, 0, 0)
  const heartGeo = new THREE.ExtrudeGeometry(heart, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 6, curveSegments: 24 }); heartGeo.translate(0, 0, -0.02)
  const head = new THREE.Group(); head.position.set(0.06, 0.6, 0.02); head.rotation.x = -0.08; head.scale.setScalar(0.72)
  ;[0, 1, 2, 3].forEach((i) => { const lf = mesh(heartGeo, clay(i % 2 ? C.clover : 0xA9D61F, { roughness: 0.5 })); const pv = new THREE.Group(); pv.rotation.z = (i * Math.PI) / 2 + Math.PI / 4; lf.position.y = 0.03; lf.rotation.x = 0.12; pv.add(lf); head.add(pv) })
  const dot = mesh(new THREE.SphereGeometry(0.045, 16, 12), clay(C.cloverDark)); head.add(dot)
  sprout.add(head); bodyG.add(sprout); R.sprout = sprout
  const arm = (side, rz = 0, rx = 0, y = 1.0) => { const a = mesh(new THREE.CapsuleGeometry(0.17, 0.32, 12, 24), clay(C.shade)); const piv = new THREE.Group(); piv.position.set(side * 0.92, y + 0.25, 0.2); a.position.set(0, -0.22, 0); piv.add(a); piv.rotation.z = side * rz; piv.rotation.x = rx; piv.userData = { side, rz, rx }; return piv }
  const feet = []; for (const sx of [-1, 1]) { const f = mesh(new THREE.CapsuleGeometry(0.17, 0.16, 12, 24), clay(C.shade)); f.scale.set(1, 1, 1.05); f.position.set(sx * 0.34, 0.25, 0.05); f.userData.base = f.position.clone(); root.add(f); feet.push(f) }
  R.feet = feet
  let L = arm(-1, 0.35), Rr = arm(1, 0.35)
  if (pose === 'idle') { bodyG.add(eye(-0.24), eye(0.24), mouth()) }
  if (pose === 'thinking') {
    bodyG.add(eye(-0.24, [0.05, 0.06]), eye(0.24, [0.05, 0.06])); Rr = arm(1, 2.3, -0.5, 1.15); bodyG.rotation.z = 0.06
    ;[[1.15, 2.05, 0.07], [1.38, 2.3, 0.1], [1.68, 2.55, 0.13]].forEach(([x, y, r], i) => { const d = mesh(new THREE.SphereGeometry(r, 32, 24), clay(C.white)); d.position.set(x, y, 0.2); d.userData = { base: y, i }; root.add(d); R.extras.push(d) })
  }
  if (pose === 'working') {
    bodyG.add(eye(-0.24, [0, -0.05], 0.7), eye(0.24, [0, -0.05], 0.7)); L = arm(-1, -0.25, -1.0); Rr = arm(1, -0.25, -1.0)
    const pad = new THREE.Group(); pad.add(mesh(new THREE.BoxGeometry(1.1, 0.72, 0.07), clay(0x1A1B22, { roughness: 0.35 })))
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.6), new THREE.MeshBasicMaterial({ color: C.blue })); scr.position.z = 0.04; pad.add(scr)
    ;[[0.6, 0.15, 0xffffff], [0.4, 0, C.lime], [0.5, -0.15, 0xffffff]].forEach(([w, y, c], i) => { const ln = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.06), new THREE.MeshBasicMaterial({ color: c })); ln.position.set(-0.4 + w / 2, y, 0.045); ln.userData = { w, i }; pad.add(ln); R.extras.push(ln) })
    pad.position.set(0, 0.95, 1.08); pad.rotation.x = -0.35; hop.add(pad); bodyG.rotation.x = 0.06
  }
  if (pose === 'done') { bodyG.add(arcEye(-0.24, true), arcEye(0.24, true), mouth()); Rr = arm(1, 2.6, 0, 1.15) }
  if (pose === 'waiting') {
    bodyG.add(eye(-0.24, [0.04, 0.02]), eye(0.24, [0.04, 0.02]), mouth()); bodyG.rotation.z = -0.07; Rr = arm(1, 1.55, -0.3, 1.1)
    const b = new THREE.Group(); b.add(mesh(new THREE.TorusGeometry(0.2, 0.07, 24, 64), clay(C.white)), mesh(new THREE.SphereGeometry(0.11, 32, 24), clay(C.pink))); b.position.set(1.55, 1.95, 0.3); root.add(b); R.extras.push(b)
  }
  if (pose === 'sleep') {
    bodyG.add(arcEye(-0.24, false), arcEye(0.24, false)); bodyG.scale.set(1.08, 0.86, 1.05); L = arm(-1, -0.6, -0.4); Rr = arm(1, -0.6, -0.4)
    ;[0, 1, 2].forEach((i) => { const z = mesh(new THREE.SphereGeometry(0.06 + i * 0.03, 24, 16), clay(C.white)); z.position.set(1.1 + i * 0.25, 2.2 + i * 0.3, 0.2); z.userData = { i }; root.add(z); R.extras.push(z) })
  }
  if (prop && PROPS[prop] && pose !== 'working') { L = arm(-1, -0.15, -1.05, 1.0); Rr = arm(1, -0.15, -1.05, 1.0); const pr = makeProp(prop); pr.position.set(0, 1.05, 1.02); pr.scale.setScalar(0.95); hop.add(pr); R.prop = pr }
  bodyG.add(L, Rr); R.L = L; R.R = Rr
  root.rotation.y = -0.32
  return R
}

function animate(R, pose, t) {
  if (R.object) { R.hop.position.y = Math.sin(t * 2) * 0.05; R.prop.rotation.y = 0.35 + Math.sin(t * 0.9) * 0.15; return }
  const s = Math.sin, br = s(t * 2.2)
  // หายใจ: ยุบ-ยืดเล็กน้อย
  const sq = pose === 'sleep' ? 0.02 : 0.025
  R.bodyG.scale.y = (pose === 'sleep' ? 0.86 : 1) * (1 + br * sq); R.bodyG.scale.x = (pose === 'sleep' ? 1.08 : 1) * (1 - br * sq * 0.6)
  R.sprout.rotation.z = -0.28 + s(t * 1.7) * 0.1
  // กะพริบตาทุก ~3.2 วินาที
  const bl = (t % 3.2) < 0.12 ? 0.12 : 1; R.eyes.forEach((e) => { e.scale.y = bl })
  const swing = (a, amt, sp, ph = 0) => { if (R.prop) return; a.rotation.z = a.userData.side * a.userData.rz + s(t * sp + ph) * amt }
  if (pose === 'idle') {
    // เดินเตาะแตะอยู่กับที่: เท้ายกสลับ · ตัวเด้ง 2 ครั้งต่อรอบ · โยกซ้ายขวา · แกว่งแขนสวนเท้า
    const w = t * 4.2, st = s(w)
    R.feet.forEach((f, i) => { const ph = i ? st : -st, lift = Math.max(0, ph); f.position.y = f.userData.base.y + lift * 0.2; f.position.z = f.userData.base.z + ph * 0.16; f.rotation.x = -lift * 0.35 })
    R.hop.position.y = Math.abs(st) * 0.09
    R.bodyG.rotation.z = st * 0.09; R.bodyG.rotation.x = 0.04
    if (!R.prop) { R.L.rotation.x = st * 0.55; R.R.rotation.x = -st * 0.55 } else { R.prop.rotation.z = st * 0.06 } R.L.rotation.z = R.L.userData.side * R.L.userData.rz; R.R.rotation.z = R.R.userData.side * R.R.userData.rz
    R.sprout.rotation.z = -0.28 + s(w + 0.6) * 0.18
    R.root.rotation.y = -0.32 + s(t * 0.5) * 0.08
  }
  if (pose === 'thinking') { R.root.rotation.y = -0.32 + s(t * 0.6) * 0.08; R.bodyG.rotation.z = 0.06 + s(t * 1.1) * 0.03; R.extras.forEach((d) => { d.position.y = d.userData.base + s(t * 2 + d.userData.i) * 0.06; d.scale.setScalar(0.85 + 0.15 * (0.5 + 0.5 * s(t * 2.5 + d.userData.i))) }) }
  if (pose === 'working') { R.hop.position.y = Math.abs(s(t * 6)) * 0.02; R.L.rotation.x = -1.0 + s(t * 12) * 0.12; R.R.rotation.x = -1.0 + s(t * 12 + 1.6) * 0.12; R.extras.forEach((ln) => { ln.scale.x = 0.55 + 0.45 * (0.5 + 0.5 * s(t * 3 + ln.userData.i * 1.3)); ln.position.x = -0.4 + (ln.userData.w * ln.scale.x) / 2 }) }
  if (pose === 'done') { const h = Math.max(0, s(t * 3.2)); R.hop.position.y = h * 0.28; R.bodyG.scale.y *= 1 - h * 0.04; R.R.rotation.z = 2.6 + s(t * 8) * 0.35; R.feet.forEach((f) => { f.position.y = 0.1 + h * 0.18 }) }
  if (pose === 'waiting') { R.R.rotation.z = 1.55 + s(t * 3) * 0.15; R.root.rotation.y = -0.32 + s(t * 0.8) * 0.06; R.extras.forEach((b) => { const k = 1 + 0.08 * s(t * 4); b.scale.setScalar(k); b.position.y = 1.95 + s(t * 2) * 0.05 }) }
  if (pose === 'sleep') { R.extras.forEach((z) => { const k = ((t * 0.5 + z.userData.i * 0.33) % 1); z.position.y = 1.9 + k * 0.7 + z.userData.i * 0.08; z.material.opacity = 1 - k; z.material.transparent = true }) }
}

// ตัววาด WebGL ตัวเดียวใช้ร่วมกันทุกตัว (เบราว์เซอร์ให้ WebGL ได้ราว 16 อัน) → วาดทีละตัวแล้วคัดลอกลง canvas 2D ของแต่ละตัว
let SH = null
const INST = new Set()
function shared(px) {
  if (!SH) {
    const c = document.createElement('canvas')
    const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true })
    r.setPixelRatio(1); r.setClearColor(0x000000, 0); r.toneMapping = THREE.LinearToneMapping; r.toneMappingExposure = 1.0; r.outputColorSpace = THREE.SRGBColorSpace
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.setScissorTest(true); r.autoClear = false
    SH = { r, c, w: 0 }
  }
  if (px > SH.w) { SH.w = Math.min(4096, px); SH.r.setSize(SH.w, SH.w, false) }
  return SH
}
let loopOn = false
function loop(now) {
  let any = false
  for (const it of INST) if (it.live()) { it.draw(now); any = true }
  if (any) requestAnimationFrame(loop); else loopOn = false
}
const kick = () => { if (!loopOn) { loopOn = true; requestAnimationFrame(loop) } }

export function createNamon(canvas, { pose = 'idle', size = 160, still = false, turn = 0, offscreen = false, prop = '' } = {}) {
  const dpr = offscreen ? 1 : Math.min(2, window.devicePixelRatio || 1), px = Math.round(size * dpr)
  canvas.width = px; canvas.height = px
  const ctx = canvas.getContext('2d')
  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100); if (size <= 96) { cam.position.set(0.6, 2.0, 7.1); cam.lookAt(0.08, 1.66, 0) } else { cam.position.set(0.9, 2.0, 10.2); cam.lookAt(0, 1.55, 0) }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe0e6, 1.35)); const fill = new THREE.DirectionalLight(0xfff4ea, 0.55); fill.position.set(3, 2, 5); scene.add(fill)
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-2, 9, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8; key.shadow.bias = -0.0004
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 }); scene.add(key)
  const rim = new THREE.DirectionalLight(0xdbe6ff, 0.6); rim.position.set(4, 3, -3); scene.add(rim)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.16 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
  const holder = new THREE.Group(); holder.rotation.y = turn; scene.add(holder)
  let R = build(pose, prop), cur = pose, curProp = prop; holder.add(R.root)
  const reduce = still || matchMedia('(prefers-reduced-motion: reduce)').matches
  let visible = !offscreen, t0 = performance.now(), gone = false
  const paint = (tSec) => {
    const { r, c } = shared(px)
    animate(R, cur, tSec)
    r.setViewport(0, 0, px, px); r.setScissor(0, 0, px, px); r.clear(); r.render(scene, cam)
    ctx.clearRect(0, 0, px, px); ctx.drawImage(c, 0, c.height - px, px, px, 0, 0, px, px)
  }
  const it = { live: () => !gone && visible && !reduce, draw: (now) => paint((now - t0) / 1000) }
  const io = offscreen ? null : new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible && !reduce) kick() })
  if (io) io.observe(canvas)
  INST.add(it)
  if (reduce || offscreen) { if (!offscreen) requestAnimationFrame(() => paint(1.0)) } else kick()
  return {
    setPose(p) { if (!POSES.includes(p) || p === cur) return; holder.remove(R.root); R = build(p, curProp); cur = p; holder.add(R.root); if (reduce) paint(1.0) },
    setProp(pp) { if ((pp || '') === curProp) return; curProp = pp || ''; holder.remove(R.root); R = build(cur, curProp); holder.add(R.root); if (reduce) paint(1.0) },
    setTurn(rad) { holder.rotation.y = rad; if (reduce) paint(1.0) },
    renderAt(tSec = 1) { paint(tSec); return canvas },
    get canvas() { return canvas },
    dispose() { gone = true; INST.delete(it); io && io.disconnect(); scene.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose && o.material.dispose() }) },
  }
}

class NamonAgent extends HTMLElement {
  static get observedAttributes() { return ['pose', 'prop'] }
  connectedCallback() {
    if (this._n) return
    this.querySelectorAll(':scope > canvas').forEach((x) => x.remove())
    const size = +this.getAttribute('size') || 160, pose = this.getAttribute('pose') || 'idle'
    this.style.display = this.style.display || 'inline-block'; this.style.width = this.style.width || size + 'px'; this.style.height = this.style.height || size + 'px'
    this.setAttribute('role', 'img'); this.setAttribute('aria-label', this.getAttribute('label') || LABEL[pose] || 'Namon')
    const c = document.createElement('canvas'); c.style.width = '100%'; c.style.height = '100%'; c.style.display = 'block'; this.appendChild(c); this.querySelectorAll('img').forEach((im) => { im.style.display = 'none' })
    try { this._n = createNamon(c, { pose, size, still: this.hasAttribute('still'), prop: this.getAttribute('prop') || '' }) } catch (e) { c.remove(); this.dataset.fallback = '1'; this.querySelectorAll('img').forEach((im) => { im.style.display = '' }); if (!this.querySelector('img')) this.textContent = '🌱' }
  }
  attributeChangedCallback(n, o, v) { if (this._n && n === 'prop') this._n.setProp(v); if (this._n && n === 'pose') { this._n.setPose(v); this.setAttribute('aria-label', this.getAttribute('label') || LABEL[v] || 'Namon') } }
  disconnectedCallback() { this._n?.dispose(); this._n = null; this.querySelectorAll(':scope > canvas').forEach((x) => x.remove()) }
}
if (!customElements.get('namon-agent')) customElements.define('namon-agent', NamonAgent)
