import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const STATE = join(".claude", "skills", "qa", "tools", ".auth", "state.json");

/**
 * /qa 의 login.mjs 가 저장한 로그인 상태 파일. E2E_STORAGE_STATE 로 바꿀 수 있다.
 * fe/ 와 fe-worktrees/<이름>/ 어디서 실행해도 찾도록 위로 올라가며 찾는다.
 */
export function authStatePath(): string {
  if (process.env.E2E_STORAGE_STATE) return resolve(process.env.E2E_STORAGE_STATE);
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, STATE);
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error(
    "로그인 상태 파일이 없습니다. 프로젝트 루트에서 `node .claude/skills/qa/tools/login.mjs` 로 한 번 로그인해 주세요.",
  );
}
