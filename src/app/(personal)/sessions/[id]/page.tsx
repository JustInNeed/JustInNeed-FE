import { SessionDetail } from "@/features/sessions";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionDetail sessionId={Number(id)} />;
}
