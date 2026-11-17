// 정책 #24: 손으로 쓴 FE API 타입(src/lib/api/*.ts 의 api.get<T>(...) 등)과 BE 명세(openapi.json)의 응답 모양을 비교한다.
// 사용: node scripts/openapi/compare-types.mjs <openapi.json 경로> [결과 md 경로] [--fail]
// --fail: "BE가 안 보냄" · "타입 다름" · "명세에 경로 없음" 이 하나라도 있으면 exit 1 (CI 용). "FE에 없음" 은 실패로 치지 않는다.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

const args = process.argv.slice(2);
const failMode = args.includes("--fail");
const [specPath, outPath] = args.filter((a) => a !== "--fail");
if (!specPath) {
  console.error("사용: node scripts/openapi/compare-types.mjs <openapi.json> [결과.md]");
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const API_DIR = resolve("src/lib/api");
const SKIP = new Set(["types.ts", "client.ts", "index.ts", "schema.gen.ts"]);
const MAX_DEPTH = 5;

// ---- FE: api.<method><T>(url) 호출 모으기 ----
const configPath = ts.findConfigFile(".", ts.sys.fileExists, "tsconfig.json");
const config = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, ".");
const program = ts.createProgram(config.fileNames, config.options);
const checker = program.getTypeChecker();

function constText(identifier) {
  const decl = checker.getSymbolAtLocation(identifier)?.valueDeclaration;
  const init = decl && ts.isVariableDeclaration(decl) ? decl.initializer : null;
  return init && (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) ? init.text : null;
}

function urlTemplate(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    // 주소 상수(\`${EXCLUDED_URLS}/selections\`)는 값으로 풀고, 나머지 \`${id}\` 는 {x} 로 둔다
    return node.head.text + node.templateSpans.map((s) => `${(ts.isIdentifier(s.expression) && constText(s.expression)) || "{x}"}${s.literal.text}`).join("");
  }
  if (ts.isIdentifier(node)) {
    const decl = checker.getSymbolAtLocation(node)?.valueDeclaration;
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer) return urlTemplate(decl.initializer);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = urlTemplate(node.left);
    const r = urlTemplate(node.right);
    return l != null && r != null ? l + r : l != null ? `${l}{x}` : null;
  }
  return null;
}

const calls = [];
for (const sf of program.getSourceFiles()) {
  if (!sf.fileName.startsWith(API_DIR) || SKIP.has(sf.fileName.split("/").pop()) || sf.fileName.includes(".test.")) continue;
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sf) === "api" &&
      node.typeArguments?.length === 1
    ) {
      // client.ts 의 del · publicPost 를 HTTP 메서드로
      const method = { del: "delete", publicPost: "post" }[node.expression.name.text] ?? node.expression.name.text;
      const url = node.arguments[0] ? urlTemplate(node.arguments[0]) : null;
      const fn = ts.findAncestor(node, (n) => ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n));
      calls.push({
        file: sf.fileName.slice(API_DIR.length + 1),
        name: fn?.name?.getText(sf) ?? "(이름 없음)",
        method,
        url,
        typeText: node.typeArguments[0].getText(sf),
        type: checker.getTypeFromTypeNode(node.typeArguments[0]),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// ---- 명세: 경로 찾기 · 응답 data 스키마 ----
const specPaths = Object.keys(spec.paths).map((p) => ({ p, re: new RegExp(`^${p.replace(/\{[^}]+\}/g, "[^/]+")}$`) }));
const deref = (schema) => {
  let s = schema;
  while (s?.$ref) s = spec.components.schemas[s.$ref.split("/").pop()];
  return s ?? {};
};
const refName = (schema) => schema?.$ref?.split("/").pop() ?? null;

function responseData(path, method) {
  const op = spec.paths[path]?.[method];
  if (!op) return { missing: "명세에 이 메서드가 없음" };
  const res = op.responses?.["200"] ?? op.responses?.["201"] ?? Object.values(op.responses ?? {})[0];
  const content = res?.content && Object.values(res.content)[0];
  const wrapper = deref(content?.schema);
  return { schema: wrapper.properties?.data ?? null, wrapperName: refName(content?.schema) };
}

// ---- 비교 ----
const typesOf = (schema) => {
  const s = deref(schema);
  if (Array.isArray(s.type)) return s.type.filter((t) => t !== "null");
  if (s.type) return [s.type];
  if (s.oneOf || s.anyOf) return [...new Set((s.oneOf ?? s.anyOf).flatMap(typesOf))];
  if (s.properties) return ["object"];
  return [];
};
const tsKind = (type) => {
  const t = checker.getNonNullableType(type);
  if (t.isUnion()) return [...new Set(t.types.flatMap(tsKind))];
  if (t.flags & (ts.TypeFlags.StringLike)) return ["string"];
  if (t.flags & ts.TypeFlags.NumberLike) return ["number"];
  if (t.flags & ts.TypeFlags.BooleanLike) return ["boolean"];
  if (checker.isArrayType(t) || checker.isTupleType(t)) return ["array"];
  if (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return ["any"];
  if (t.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined | ts.TypeFlags.Null)) return ["void"];
  if (t.flags & ts.TypeFlags.Object) return ["object"];
  return ["?"];
};
const sameKind = (specKinds, feKinds) =>
  feKinds.includes("any") ||
  specKinds.length === 0 ||
  feKinds.some((k) => specKinds.includes(k) || (k === "number" && specKinds.includes("integer")));

function compare(type, schema, where, out, depth) {
  if (depth > MAX_DEPTH || !schema) return;
  const specKinds = typesOf(schema);
  const feKinds = tsKind(type);
  if (!sameKind(specKinds, feKinds)) {
    out.push({ kind: "타입 다름", where, fe: feKinds.join("|"), be: specKinds.join("|") });
    return;
  }
  const s = deref(schema);
  const t = checker.getNonNullableType(type);
  if (specKinds.includes("array") && (checker.isArrayType(t) || checker.isTupleType(t))) {
    const element = checker.getTypeArguments(t)[0];
    if (element) compare(element, s.items, `${where}[]`, out, depth + 1);
    return;
  }
  if (!s.properties || feKinds.includes("any")) return;
  const fe = new Map(checker.getPropertiesOfType(t).map((p) => [p.name, p]));
  const be = s.properties;
  for (const name of Object.keys(be)) {
    if (!fe.has(name)) out.push({ kind: "FE에 없음", where: `${where}.${name}`, be: typesOf(be[name]).join("|") });
  }
  for (const [name, symbol] of fe) {
    const optional = (symbol.flags & ts.SymbolFlags.Optional) !== 0;
    if (!(name in be)) {
      out.push({ kind: "BE가 안 보냄", where: `${where}.${name}`, fe: tsKind(checker.getTypeOfSymbol(symbol)).join("|"), optional });
      continue;
    }
    compare(checker.getTypeOfSymbol(symbol), be[name], `${where}.${name}`, out, depth + 1);
  }
}

const rows = [];
for (const call of calls) {
  const pathOnly = call.url?.split("?")[0] ?? null;
  const sample = pathOnly?.replace(/\{x\}/g, "X");
  // 앞: FE 주소의 {x} 를 값으로 보고 명세 경로에 맞춘다. 뒤: 실행할 때 정해지는 부분(/settings/extension/${키})은 명세 쪽 실제 경로 중 하나에 맞춘다
  const feRe = pathOnly ? new RegExp(`^${pathOnly.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{x\\?\}/g, "[^/]+")}$`) : null;
  const match = sample
    ? specPaths.find(({ re }) => re.test(sample)) ??
      specPaths.find(({ p }) => feRe.test(p) && spec.paths[p][call.method])
    : null;
  const row = { ...call, path: match?.p ?? null, issues: [] };
  delete row.type;
  if (!match) {
    row.issues.push({ kind: "명세에 경로 없음", where: call.url ?? "(주소를 읽지 못함)" });
  } else {
    const { schema, missing, wrapperName } = responseData(match.p, call.method);
    row.wrapper = wrapperName;
    if (missing) row.issues.push({ kind: "명세에 경로 없음", where: `${call.method.toUpperCase()} ${match.p}` });
    else if (schema) compare(call.type, schema, "data", row.issues, 0);
  }
  rows.push(row);
}

// ---- 결과 ----
const count = (kind) => rows.reduce((n, r) => n + r.issues.filter((i) => i.kind === kind).length, 0);
const KINDS = ["BE가 안 보냄", "타입 다름", "명세에 경로 없음", "FE에 없음"];
const lines = [
  "# FE 손 타입 vs BE 명세 대조",
  "",
  `- 명세: \`${specPath}\` (경로 ${Object.keys(spec.paths).length}) · FE API 호출 ${rows.length}개`,
  ...KINDS.map((k) => `- ${k}: ${count(k)}`),
  "",
  "읽는 법: **BE가 안 보냄** = FE 타입에는 있는데 BE 응답에 없는 필드 (화면이 비어 보일 수 있음, 먼저 볼 것). **타입 다름** = 같은 필드인데 종류가 다름. **FE에 없음** = BE 는 보내는데 FE 가 안 쓰는 필드 (대개 문제없음).",
  "",
];
for (const r of rows.filter((x) => x.issues.length).sort((a, b) => b.issues.length - a.issues.length)) {
  lines.push(`## ${r.method.toUpperCase()} \`${r.path ?? r.url}\` — \`${r.name}\` (${r.file}, FE 타입 \`${r.typeText}\`)`, "");
  for (const kind of KINDS) {
    for (const i of r.issues.filter((x) => x.kind === kind)) {
      const detail = i.kind === "타입 다름" ? ` (FE ${i.fe} / BE ${i.be})` : i.kind === "BE가 안 보냄" ? ` (FE ${i.fe}${i.optional ? ", 선택" : ""})` : i.be ? ` (${i.be})` : "";
      lines.push(`- ${i.kind}: \`${i.where}\`${detail}`);
    }
  }
  lines.push("");
}
const ok = rows.filter((x) => !x.issues.length);
lines.push(`## 차이 없음 (${ok.length})`, "", ...ok.map((r) => `- ${r.method.toUpperCase()} \`${r.path}\` — \`${r.name}\``));
const md = lines.join("\n") + "\n";
if (outPath) writeFileSync(outPath, md);
console.log(md.split("\n").slice(0, 9).join("\n"));
const blocking = count("BE가 안 보냄") + count("타입 다름") + count("명세에 경로 없음");
if (failMode && blocking > 0) {
  console.error(`\n손 타입과 명세가 ${blocking}곳 다릅니다. 위 결과 md 를 보고 FE 타입(src/lib/api/types.ts)이나 BE 를 맞추세요.`);
  process.exit(1);
}
