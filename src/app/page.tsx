import { redirect } from "next/navigation";

export default function HomePage() {
  // The (personal) layout guards auth and bounces to /login when needed.
  redirect("/sessions");
}
