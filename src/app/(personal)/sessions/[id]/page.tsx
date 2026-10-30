import { SessionDetail } from "@/features/sessions";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 다른 세션으로 이동하면 화면 상태(편집 중인 제목 · 본문, 열린 팝업 등)를 새로 시작
  return <SessionDetail key={id} sessionId={Number(id)} />;
}
