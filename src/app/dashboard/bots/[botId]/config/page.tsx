import { redirect } from "next/navigation";

export default async function BotConfigRedirect({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  redirect(`/dashboard/bots/${botId}?tab=config`);
}
