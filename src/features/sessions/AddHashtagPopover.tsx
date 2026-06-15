import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import styles from "./AddHashtagPopover.module.css";

export interface AddHashtagPopoverProps {
  existing: string[];
  onAdd: (tag: string) => void;
  onClose: () => void;
}

const normalize = (raw: string) => raw.trim().replace(/^#+/, "").replace(/\s+/g, "");

export function AddHashtagPopover({ existing, onAdd, onClose }: AddHashtagPopoverProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const validate = (raw: string): { ok: false; msg: string } | { ok: true; value: string } => {
    const v = normalize(raw);
    if (!v) return { ok: false, msg: "내용을 입력해주세요." };
    if (v.length > 16) return { ok: false, msg: "최대 16자까지 입력할 수 있어요." };
    if (!/^[\w가-힣-]+$/.test(v)) return { ok: false, msg: "특수문자는 사용할 수 없어요." };
    const tagWithHash = "#" + v;
    if (existing.some((t) => t.toLowerCase() === tagWithHash.toLowerCase())) {
      return { ok: false, msg: "이미 추가된 해시태그입니다." };
    }
    return { ok: true, value: tagWithHash };
  };

  const submit = () => {
    const r = validate(value);
    if (!r.ok) {
      setError(r.msg);
      return;
    }
    onAdd(r.value);
  };

  const canSubmit = normalize(value).length > 0;

  return (
    <div ref={wrapRef} className={styles.popover} onMouseDown={(e) => e.stopPropagation()}>
      <div className={styles.arrow} />
      <div className={styles.label}>해시태그 추가</div>

      <div className={styles.inputBox} style={{ borderColor: error ? "#e89292" : "var(--line)" }}>
        <span className={styles.hash}>#</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="예: 로마"
          maxLength={20}
          className={styles.input}
        />
      </div>

      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.hint}>Enter로 추가 · 한글/영문/숫자, 최대 16자</div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} style={{ padding: "6px 12px" }}>
          취소
        </Button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`${styles.addBtn} ${canSubmit ? styles.addBtnOn : styles.addBtnOff}`}
        >
          추가
        </button>
      </div>
    </div>
  );
}
