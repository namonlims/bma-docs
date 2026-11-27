// ฉบับบันทึกของหน้า Kae second brain (ผู้ใช้ 28 พ.ย. 69 เลือก ก "เข้ารหัส")
//   kae-second-brain-tree.json    = ชื่อไฟล์ทั้งหมด (ไม่มีเนื้อหา)
//   kae-second-brain-content.json = เนื้อหาไฟล์ข้อความทั้งหมด · gzip แล้วเข้ารหัส AES-256-GCM (กุญแจจาก PBKDF2-SHA256 ของรหัสผ่าน)
// รหัสผ่าน: env KB_PASS หรือไฟล์ ~/.kae-brain-pass (บนเครื่องเจ้าของเท่านั้น · ห้าม commit)
// ใช้: node scripts/kae-second-brain-snapshot.mjs [path ของ second brain · ค่าเริ่ม ~/bma-health-second-brain]
import { execSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import crypto from 'node:crypto'; import zlib from 'node:zlib';
const repo = process.argv[2] || path.join(os.homedir(), 'bma-health-second-brain');
const passFile = path.join(os.homedir(), '.kae-brain-pass');
const pass = (process.env.KB_PASS || (fs.existsSync(passFile) ? fs.readFileSync(passFile, 'utf8') : '')).trim();
if (!pass) { console.error('ไม่พบรหัสผ่าน · ตั้ง KB_PASS หรือเขียนไว้ใน ~/.kae-brain-pass'); process.exit(1); }
const sh = (c, raw) => { const b = execSync(c, { cwd: repo, maxBuffer: 1e9 }); return raw ? b : b.toString().trim(); };
sh('git fetch -q origin');
const [sha, date] = sh('git log -1 --format=%H%n%cI origin/main').split('\n');
const rows = sh('git ls-tree -r -l origin/main').split('\n').filter((l) => / blob /.test(l)).map((l) => { const [meta, p] = l.split('\t'); const [, , obj, size] = meta.split(/\s+/); return { p, obj, size: +size }; });
const files = rows.map((r) => r.p);
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const generated = new Date().toISOString();
fs.writeFileSync(path.join(dir, 'kae-second-brain-tree.json'), JSON.stringify({ generated, commit: { sha, date }, files }) + '\n');

// เนื้อหา: เฉพาะไฟล์ข้อความ ≤ 8 MB (log.md ~1 MB · requests/*.jsonl ~4 MB)
const content = {}; let skipped = 0;
for (const r of rows) {
  if (r.size > 8 * 1024 * 1024) { skipped++; continue; }
  const buf = sh(`git cat-file blob ${r.obj}`, true);
  if (buf.includes(0)) { skipped++; continue; }
  content[r.p] = buf.toString('utf8');
}
const plain = zlib.gzipSync(Buffer.from(JSON.stringify(content)), { level: 9 });
// ใช้ salt เดิมถ้ารหัสผ่านยังเหมือนเดิม → กุญแจที่เบราว์เซอร์จำไว้ยังใช้ได้ ไม่ต้องใส่รหัสใหม่ทุกครั้งที่อัปเดตฉบับบันทึก
const iter = 310000, iv = crypto.randomBytes(12); let salt = crypto.randomBytes(16);
const outContent = path.join(dir, "kae-second-brain-content.json");
try {
  const old = JSON.parse(fs.readFileSync(outContent, "utf8")); const s = Buffer.from(old.kdf.salt, "base64"); const k = crypto.pbkdf2Sync(pass, s, old.kdf.iter, 32, "sha256");
  const b = Buffer.from(old.data, "base64"); const d = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(old.iv, "base64")); d.setAuthTag(b.subarray(-16)); d.update(b.subarray(0, -16)); d.final();
  if (old.kdf.iter === iter) salt = s;
} catch (e) { console.log("salt ใหม่ (รหัสผ่านเปลี่ยนหรือยังไม่มีฉบับเดิม) · ต้องใส่รหัสผ่านใหม่ในเบราว์เซอร์"); }
const key = crypto.pbkdf2Sync(pass, salt, iter, 32, "sha256");
const c = crypto.createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]); // WebCrypto ต้องการ tag ต่อท้าย
fs.writeFileSync(outContent, JSON.stringify({ v: 1, generated, commit: { sha, date }, kdf: { name: 'PBKDF2', hash: 'SHA-256', iter, salt: salt.toString('base64') }, iv: iv.toString('base64'), data: enc.toString('base64') }) + '\n');
console.log(`${files.length} files · เนื้อหา ${Object.keys(content).length} ไฟล์ (ข้าม ${skipped} ไฟล์ภาพ/ใหญ่) · ${(enc.length / 1e6).toFixed(2)} MB · ${sha.slice(0, 7)}`);
