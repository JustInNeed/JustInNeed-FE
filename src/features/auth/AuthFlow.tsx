"use client";

import { useEffect, useState } from "react";
import type { Auth } from "@/lib/types";
import { readAuth, writeAuth } from "@/lib/storage";
import { type Provider } from "./providers";
import { LandingStep } from "./steps/LandingStep";
import { OauthStep } from "./steps/OauthStep";
import { NicknameStep } from "./steps/NicknameStep";
import { CompleteStep } from "./steps/CompleteStep";
import styles from "./auth.module.css";

type Step = "landing" | "oauth" | "nickname" | "complete";

export interface AuthFlowProps {
  /** Called once the user is fully authenticated (existing login or finished sign-up). */
  onAuthenticated: (auth: Auth) => void;
  onCancel?: () => void;
}

export function AuthFlow({ onAuthenticated, onCancel }: AuthFlowProps) {
  const [step, setStep] = useState<Step>("landing");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [nickname, setNickname] = useState("");
  // Read once on the client to avoid SSR/CSR hydration mismatches.
  const [existing, setExisting] = useState<Auth | null>(null);
  useEffect(() => setExisting(readAuth()), []);

  const onPick = (p: Provider) => {
    setProvider(p);
    setStep("oauth");
  };

  const onOauthDone = () => {
    if (!provider) return;
    const existing = readAuth();
    if (existing && existing.provider === provider.id) {
      onAuthenticated({ ...existing, justLoggedIn: true });
    } else {
      setStep("nickname");
    }
  };

  const onNicknameDone = (nick: string) => {
    if (!provider) return;
    setNickname(nick);
    const auth: Auth = { provider: provider.id, nickname: nick, createdAt: new Date().toISOString() };
    writeAuth(auth);
    setStep("complete");
  };

  const onComplete = () => {
    if (!provider) return;
    onAuthenticated({ provider: provider.id, nickname, justSignedUp: true });
  };

  return (
    <div className={styles.screen}>
      {step === "landing" && <LandingStep existing={existing} onPick={onPick} onCancel={onCancel} />}
      {step === "oauth" && provider && (
        <OauthStep provider={provider} onDone={onOauthDone} onBack={() => setStep("landing")} />
      )}
      {step === "nickname" && provider && <NicknameStep provider={provider} onSubmit={onNicknameDone} />}
      {step === "complete" && <CompleteStep nickname={nickname} onContinue={onComplete} />}
    </div>
  );
}
