// ฉบับบันทึกรายการ agent ของหน้า Agent Flow (ชื่อ · คำอธิบาย · เครื่องมือ · โมเดล จาก bma.health/.claude/agents บน main)
// ใช้: node scripts/agent-flow-snapshot.mjs [path ของ bma.health · ค่าเริ่ม ~/Desktop/bma.health-main]
import { execSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const repo = process.argv[2] || path.join(os.homedir(), 'Desktop', 'bma.health-main');
const sh = (c) => execSync(c, { cwd: repo, maxBuffer: 1e8 }).toString();
try { sh('git fetch -q origin main'); } catch (e) { console.warn('fetch ไม่สำเร็จ ใช้ origin/main ที่มีในเครื่อง'); }
const [sha, date] = sh('git log -1 --format=%H%n%cI origin/main -- .claude/agents').trim().split('\n');
const fm = (txt) => { const m = txt.match(/^---\n([\s\S]*?)\n---/); const o = {}; if (m) m[1].split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); return o; };
const agents = sh('git ls-tree --name-only origin/main .claude/agents/').trim().split('\n').filter((f) => f.endsWith('.md')).map((f) => {
  const o = fm(sh(`git show origin/main:${f}`));
  return { file: f, name: o.name || path.basename(f, '.md'), description: o.description || '', tools: o.tools || '', model: o.model || '' };
});
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'agent-flow-agents.json');
fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), commit: { sha, date }, agents }, null, 1) + '\n');
console.log(`${agents.length} agents · ${sha.slice(0, 7)} → ${out}`);
