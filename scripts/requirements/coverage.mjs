// 정책 #21 · #28: 요구사항 문서의 성공 기준(S · R)마다 그 기준을 확인하는 테스트가 있는지 센다.
//
// 테스트 이름(it · describe · @DisplayName)에 요구사항 ID 와 기준 번호를 대괄호로 붙인다:
//   it("[X-COM-01 S1] 개인 영역 4개 · 커뮤니티 4개 메뉴가 …")
//   it("[X-COM-01 S2·R1] 현재 경로의 메뉴만 강조된다")       ← 기준 여러 개는 · 또는 , 로
//   @DisplayName("[COM-1-6 S2] 공개 세션만 …")                 ← BE 도 같은 규칙
//
// 사용: node scripts/requirements/coverage.mjs <요구사항.md> [--be <BE src/test 폴더>] [--out <결과.md>]
// 같은 ID 가 여러 제목에 쓰이면(예: MEM-1-1 이 기능 4개) 문서 순서대로 @1 · @2 … 를 붙여 구분한다:
//   it("[MEM-1-1@2 S1] OAuth 콜백에서 …")                     ← 두 번째 '### MEM-1-1 …' 제목의 S1
// 단위 테스트로 확인할 수 없는 기준(CSS 미디어 쿼리 등)은 not-unit-testable.json 에 이유와 함께 적는다.
// 요구사항 문서가 비공개 문서 레포에 있어 지금은 로컬에서만 돌린다. 실패시키지 않는다.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const docPath = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!docPath) {
  console.error("사용: node scripts/requirements/coverage.mjs <요구사항.md> [--be <BE src/test>] [--out <결과.md>]");
  process.exit(2);
}
const beDir = option("--be");
const outPath = option("--out");
const here = dirname(fileURLToPath(import.meta.url));
const exempt = JSON.parse(readFileSync(join(here, "not-unit-testable.json"), "utf8"));

// ---- 요구사항 문서: ### ID 제목 아래의 `S1` `R1` ----
const ID = "[A-Z]+(?:-[A-Z]+)?-\\d+(?:-\\d+)?";
const TAG_ID = `${ID}(?:@\\d+)?`;
const requirements = [];
let current = null;
for (const line of readFileSync(docPath, "utf8").split("\n")) {
  const head = new RegExp(`^### (${ID}) (.+)$`).exec(line);
  if (head) {
    current = { id: head[1], title: head[2].trim(), criteria: [] };
    requirements.push(current);
    continue;
  }
  if (/^##? /.test(line)) current = null;
  const crit = current && /^\s*- `([SR]\d+)` (.*)$/.exec(line);
  if (crit) current.criteria.push({ key: crit[1], text: crit[2].trim() });
}

// 같은 ID 가 여러 제목이면 @순번을 붙인다
const seen = new Map();
for (const r of requirements) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
const order = new Map();
for (const r of requirements) {
  if (seen.get(r.id) < 2) continue;
  order.set(r.id, (order.get(r.id) ?? 0) + 1);
  r.id = `${r.id}@${order.get(r.id)}`;
}

// ---- 테스트 파일에서 [ID S1·R2] 태그 모으기 ----
const TAG = new RegExp(`\\[(${TAG_ID})\\s+([SR]\\d+(?:\\s*[·,]\\s*[SR]\\d+)*)\\]`, "g");
const walk = (dir, match, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, match, out);
    else if (match(name)) out.push(path);
  }
  return out;
};
const covered = new Map(); // "X-COM-01 S1" → Set(파일)
const unknownTags = [];
const known = new Set(requirements.flatMap((r) => r.criteria.map((c) => `${r.id} ${c.key}`)));
function collect(files, label, root) {
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(TAG)) {
      // it.todo("[ID S1] …") 는 아직 없는 테스트(요구사항과 다른 동작을 적어 둔 것)라 세지 않는다
      if (/\.todo\(\s*["'`]$/.test(text.slice(Math.max(0, m.index - 20), m.index))) continue;
      for (const key of m[2].split(/[·,]/).map((s) => s.trim())) {
        const tag = `${m[1]} ${key}`;
        const where = `${label} ${relative(root, file)}`;
        if (!known.has(tag)) unknownTags.push(`${tag} (${where})`);
        if (!covered.has(tag)) covered.set(tag, new Set());
        covered.get(tag).add(where);
      }
    }
  }
}
collect(walk("src", (n) => /\.test\.tsx?$/.test(n)), "FE", "src");
if (beDir) collect(walk(beDir, (n) => n.endsWith("Test.java")), "BE", beDir);

// ---- 결과 ----
const total = known.size;
const coveredCount = [...known].filter((k) => covered.has(k)).length;
const exemptCount = [...known].filter((k) => !covered.has(k) && exempt[k]).length;
const lines = [
  "# 요구사항 성공 기준 테스트 현황",
  "",
  `- 요구사항 ${requirements.length}개 · 성공 기준 ${total}개`,
  `- 테스트 있음 ${coveredCount} · 단위 테스트로 확인 불가 ${exemptCount} · 아직 없음 ${total - coveredCount - exemptCount}`,
  beDir ? "- 대상: FE + BE 테스트" : "- 대상: FE 테스트 (BE 는 --be 로 함께 볼 수 있음)",
  "",
  "| 요구사항 | 기준 | 테스트 |",
  "| --- | --- | --- |",
];
for (const r of requirements) {
  const done = r.criteria.filter((c) => covered.has(`${r.id} ${c.key}`)).length;
  if (done === 0 && !r.criteria.some((c) => exempt[`${r.id} ${c.key}`])) continue;
  for (const c of r.criteria) {
    const tag = `${r.id} ${c.key}`;
    const where = covered.get(tag);
    const state = where ? [...where].join("<br>") : exempt[tag] ? `➖ ${exempt[tag]}` : "⬜ 없음";
    lines.push(`| ${r.id} ${r.title} | \`${c.key}\` | ${state} |`);
  }
}
const untouched = requirements.filter((r) => r.criteria.every((c) => !covered.has(`${r.id} ${c.key}`) && !exempt[`${r.id} ${c.key}`]));
lines.push("", `## 아직 태그된 테스트가 하나도 없는 요구사항 (${untouched.length})`, "", ...untouched.map((r) => `- ${r.id} ${r.title} (기준 ${r.criteria.length})`));
if (unknownTags.length) lines.push("", "## 요구사항 문서에 없는 태그", "", ...unknownTags.map((t) => `- ${t}`));
const md = lines.join("\n") + "\n";
if (outPath) writeFileSync(outPath, md);
console.log(lines.slice(0, 5).join("\n"));
