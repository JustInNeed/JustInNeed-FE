import { redirect } from "next/navigation";
import { describe, expect, it } from "vitest";
import RootPage from "./page";

describe("루트 주소 (/)", () => {
  it("[MEM-2-2 S3] / 로 들어오면 /home 으로 보낸다 (로그인 · 닉네임 확인은 개인 영역 레이아웃이 한다)", () => {
    RootPage();
    expect(redirect).toHaveBeenCalledWith("/home");
  });
});
