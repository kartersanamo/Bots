import { redirect } from "next/navigation";

export default async function BotInboxRedirect({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  redirect(`/dashboard/bots/${botId}?tab=inbox`);
}
