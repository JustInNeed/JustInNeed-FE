import Link from "next/link";
import { InlineState } from "@/components/ui";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.box}>
        <InlineState kind="empty" title="페이지를 찾을 수 없어요" description="주소가 잘못됐거나 사라진 페이지예요." />
      </div>
      <Link href="/home" className={styles.homeLink}>
        홈으로
      </Link>
    </main>
  );
}
