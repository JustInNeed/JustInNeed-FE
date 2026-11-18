import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

/**
 * 판단 단계(정책 #26 `Jev`): 화면 텍스트가 요구사항 기준을 의도대로 설명하는지 AI 가 채점한다. 통과 90 이상.
 *
 * 지금은 Jev API 연결 전이다. 채점할 텍스트와 기준을 모아 테스트 결과에 "판단 대기"로 남기고, 사람 검수로 넘긴다.
 * 코드 단계의 통과 · 실패에는 영향을 주지 않는다. Jev API 문서를 받으면 scoreWithJev 만 채운다.
 */
export async function judge(page: Page, step: { basis: string; rubric: string; region?: string }) {
  const target = step.region ? page.locator(step.region) : page.locator("main");
  const text = (await target.innerText()).replace(/\s+\n/g, "\n").slice(0, 4000);
  const score = await scoreWithJev({ text, rubric: step.rubric });
  test.info().annotations.push({
    type: score === null ? "판단 대기 (사람 검수)" : score >= 90 ? "판단 통과" : "판단 미달",
    description: `${step.basis} · ${step.rubric}${score === null ? "" : ` · 점수 ${score}`}`,
  });
  await test.info().attach(`판단 ${step.basis}`, { body: `기준: ${step.rubric}\n\n${text}`, contentType: "text/plain" });
  return score;
}

/** Jev API 연결 자리. JEV_API_URL 을 정하기 전에는 null(채점 안 함)을 돌려준다 */
async function scoreWithJev(request: { text: string; rubric: string }): Promise<number | null> {
  if (!process.env.JEV_API_URL) return null;
  throw new Error(`Jev API 호출은 아직 연결하지 않았습니다 (API 문서 확인 후 구현): ${request.rubric}`);
}
