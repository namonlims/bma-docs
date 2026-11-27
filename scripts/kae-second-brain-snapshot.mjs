// รายการไฟล์ฉบับบันทึกของหน้า Kae second brain (ชื่อไฟล์เท่านั้น ไม่มีเนื้อหา)
// ใช้: node scripts/kae-second-brain-snapshot.mjs [path ของ second brain · ค่าเริ่ม ~/bma-health-second-brain]
import { execSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const repo = process.argv[2] || path.join(os.homedir(), 'bma-health-second-brain');
const sh = (c) => execSync(c, { cwd: repo, maxBuffer: 1e8 }).toString().trim();
sh('git fetch -q origin');
const [sha, date] = sh('git log -1 --format=%H%n%cI origin/main').split('\n');
const files = sh('git ls-tree -r origin/main').split('\n').filter((l) => / blob /.test(l)).map((l) => l.split('\t')[1]);
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'kae-second-brain-tree.json');
fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), commit: { sha, date }, files }) + '\n');
console.log(`${files.length} files · ${sha.slice(0, 7)} → ${out}`);
