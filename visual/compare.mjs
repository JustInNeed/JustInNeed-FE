// 정책 #25 화면 비교: main 코드로 찍은 화면(base)과 PR 코드로 찍은 화면(head)을 픽셀로 비교한다.
// 사용: node visual/compare.mjs <base 폴더> <head 폴더> <결과 폴더>
// 결과 폴더: 바뀐 페이지마다 <이름>.png (수정 전 | 수정 후 | 변경점 세 장을 나란히), summary.md, summary.json
// 반려하지 않는다 (기록용). 항상 exit 0, 사람이 PR 에서 보고 판단한다.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const [baseDir, headDir, outDir] = process.argv.slice(2);
if (!baseDir || !headDir || !outDir) {
  console.error("사용: node visual/compare.mjs <base 폴더> <head 폴더> <결과 폴더>");
  process.exit(2);
}
// 같은 코드로 두 번 찍으면 차이가 0 이 되게 맞춰 두었다 (시계 · 난수 고정). 글자 한 줄 색만 바뀌어도 잡히게 픽셀 수로 본다
const MIN_CHANGED_PIXELS = 10;
const GAP = 16;

const pngs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")) : []);
const read = (path) => PNG.sync.read(readFileSync(path));

/** 크기가 다르면 큰 쪽에 맞춰 흰 배경으로 늘린다 (페이지 높이가 바뀐 경우) */
function pad(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height, fill: true });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

/** 수정 전 | 수정 후 | 변경점 을 가로로 붙인 한 장 */
function sideBySide(images) {
  const width = images.reduce((sum, img) => sum + img.width, 0) + GAP * (images.length - 1);
  const height = Math.max(...images.map((img) => img.height));
  const out = new PNG({ width, height, fill: true });
  out.data.fill(255);
  let x = 0;
  for (const img of images) {
    PNG.bitblt(img, out, 0, 0, img.width, img.height, x, 0);
    x += img.width + GAP;
  }
  return out;
}

mkdirSync(outDir, { recursive: true });
const names = [...new Set([...pngs(baseDir), ...pngs(headDir)])].sort();
const rows = [];

for (const file of names) {
  const name = basename(file, ".png");
  const inBase = existsSync(join(baseDir, file));
  const inHead = existsSync(join(headDir, file));
  const meta = existsSync(join(headDir, `${name}.json`)) ? JSON.parse(readFileSync(join(headDir, `${name}.json`), "utf8")) : {};
  if (!inBase || !inHead) {
    rows.push({ name, path: meta.path ?? "", status: inHead ? "새 페이지" : "사라진 페이지", ratio: null, unmatched: meta.unmatched ?? [] });
    continue;
  }
  const before = read(join(baseDir, file));
  const after = read(join(headDir, file));
  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);
  const a = pad(before, width, height);
  const b = pad(after, width, height);
  const diff = new PNG({ width, height });
  const changedPixels = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1, alpha: 0.2 });
  const ratio = changedPixels / (width * height);
  const sizeChanged = before.width !== after.width || before.height !== after.height;
  const changed = sizeChanged || changedPixels >= MIN_CHANGED_PIXELS;
  if (changed) writeFileSync(join(outDir, file), PNG.sync.write(sideBySide([a, b, diff])));
  rows.push({
    name,
    path: meta.path ?? "",
    status: changed ? "바뀜" : "같음",
    ratio,
    pixels: changedPixels,
    height: sizeChanged ? `${before.height} → ${after.height}` : null,
    unmatched: meta.unmatched ?? [],
  });
}

const changedRows = rows.filter((r) => r.status !== "같음");
const percent = (r) => (r.ratio === null ? "-" : `${r.pixels.toLocaleString("en-US")}px (${(r.ratio * 100).toFixed(2)}%)`);
const lines = [
  "<!-- visual-diff -->",
  "## 화면 비교 (정책 #25)",
  "",
  changedRows.length
    ? `main 대비 **${changedRows.length}개 페이지**가 바뀌었습니다. 의도한 변경인지 PR 템플릿의 \`## 화면 변경\` 과 맞춰 봐 주세요. 이미지는 CI 결과물 \`visual-diff\` 에 있습니다 (수정 전 | 수정 후 | 변경점).`
    : "main 대비 바뀐 페이지가 없습니다.",
  "",
  "| 페이지 | 경로 | 결과 | 바뀐 픽셀 | 높이 |",
  "| --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.name} | \`${r.path}\` | ${r.status} | ${percent(r)} | ${r.height ?? ""} |`),
];
const unmatched = [...new Set(rows.flatMap((r) => r.unmatched))];
if (unmatched.length) {
  lines.push("", `> 고정 응답이 없는 API 요청: ${unmatched.map((u) => `\`${u}\``).join(", ")} — \`visual/mockApi.ts\` 에 추가하면 화면이 더 정확해집니다.`);
}
lines.push("", "_기록용이며 머지를 막지 않습니다._");
writeFileSync(join(outDir, "summary.md"), lines.join("\n") + "\n");
writeFileSync(join(outDir, "summary.json"), JSON.stringify({ changed: changedRows.length, rows }, null, 2));
console.log(lines.join("\n"));
