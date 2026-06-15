"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { readAuth, clearAuth } from "@/lib/storage";
import type { Auth } from "@/lib/types";
import styles from "./layout.module.css";

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // undefined = still resolving auth on the client; null = unauthenticated
  const [auth, setAuth] = useState<Auth | null | undefined>(undefined);

  useEffect(() => {
    const a = readAuth();
    if (!a) {
      router.replace("/login");
      setAuth(null);
      return;
    }
    setAuth(a);
  }, [router]);

  const onLogout = () => {
    if (!confirm("로그아웃하시겠어요? 확장 프로그램에서도 로그아웃됩니다.")) return;
    clearAuth();
    router.replace("/login");
  };

  // Avoid flashing the shell before auth is known.
  if (!auth) return null;

  return (
    <div className={styles.shell}>
      <Sidebar auth={auth} onLogout={onLogout} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
