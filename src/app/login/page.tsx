"use client";

import { useRouter } from "next/navigation";
import { AuthFlow } from "@/features/auth/AuthFlow";

export default function LoginPage() {
  const router = useRouter();
  return <AuthFlow onAuthenticated={() => router.replace("/sessions")} />;
}
