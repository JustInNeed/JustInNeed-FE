import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatElapsed, usePersonal } from "./PersonalContext";

describe("수집 경과 시간 표시", () => {
  it.each([
    [0, "0분 00초"],
    [5, "0분 05초"],
    [65, "1분 05초"],
    [3599, "59분 59초"],
    [3600, "1시간 00분 00초"],
    [3725, "1시간 02분 05초"],
  ])("%i초 → %s", (sec, text) => {
    expect(formatElapsed(sec)).toBe(text);
  });
});

describe("개인 영역 컨텍스트", () => {
  it("PersonalProvider 밖에서 쓰면 바로 알 수 있게 오류를 던진다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Probe() {
      usePersonal();
      return null;
    }
    expect(() => render(<Probe />)).toThrow("usePersonal must be used inside PersonalProvider");
  });
});
