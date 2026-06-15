import { notFound } from "next/navigation";
import { SessionDetail } from "@/features/sessions";
import { SESSIONS } from "@/lib/data";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = SESSIONS.find((s) => s.id === id);
  if (!session) notFound();
  return <SessionDetail session={session} />;
}
