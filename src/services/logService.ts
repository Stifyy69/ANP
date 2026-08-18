import { ChannelType, type Client, type GuildMember } from "discord.js";
import { env } from "../config/env.js";

export type LogAction = "transport" | "vizita" | "carcera" | "regrupare";

const actionLabels: Record<LogAction, string> = {
  transport: "un transport",
  vizita: "o vizita",
  carcera: "o prelungire la carcera",
  regrupare: "o regrupare",
};

export async function sendActionLog(
  client: Client,
  action: LogAction,
  member: GuildMember,
  sourceChannelId: string,
): Promise<void> {
  const channel = await client.channels.fetch(env.logsChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("Canalul de logs nu este un canal text valid.");
    return;
  }

  const unixTime = Math.floor(Date.now() / 1000);

  await channel.send({
    content: `**LOG** | <@${member.id}> a creat ${actionLabels[action]} in <#${sourceChannelId}> la <t:${unixTime}:f>.`,
    allowedMentions: {
      parse: [],
      users: [member.id],
    },
  });
}
