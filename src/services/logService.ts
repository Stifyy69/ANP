import { ChannelType, type Client, type GuildMember } from "discord.js";
import { env } from "../config/env.js";

export type LogAction = "transport" | "vizita" | "carcera" | "regrupare";
export type CarceraDecision = "aprobat" | "respins";

const actionLabels: Record<LogAction, string> = {
  transport: "un transport",
  vizita: "o vizita",
  carcera: "un dosar disciplinar",
  regrupare: "o regrupare",
};

async function getLogsChannel(client: Client) {
  const channel = await client.channels.fetch(env.logsChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    console.error("Canalul de logs nu este un canal text valid.");
    return null;
  }

  return channel;
}

function dossierLink(dossierId?: string, reportUrl?: string): string {
  if (!dossierId || !reportUrl) {
    return "";
  }

  return ` | **[${dossierId}](${reportUrl})**`;
}

export async function sendActionLog(
  client: Client,
  action: LogAction,
  member: GuildMember,
  sourceChannelId: string,
  dossierId?: string,
  reportUrl?: string,
): Promise<void> {
  const channel = await getLogsChannel(client);

  if (!channel) {
    return;
  }

  const unixTime = Math.floor(Date.now() / 1000);

  await channel.send({
    content: `<#${sourceChannelId}>${dossierLink(dossierId, reportUrl)} | <@${member.id}> a creat ${actionLabels[action]}. • <t:${unixTime}:f>`,
    allowedMentions: {
      parse: [],
      users: [member.id],
    },
  });
}

export async function sendEditLog(
  client: Client,
  action: LogAction,
  member: GuildMember,
  sourceChannelId: string,
  dossierId: string,
  reportUrl: string,
): Promise<void> {
  const channel = await getLogsChannel(client);

  if (!channel) {
    return;
  }

  const unixTime = Math.floor(Date.now() / 1000);

  await channel.send({
    content: `<#${sourceChannelId}>${dossierLink(dossierId, reportUrl)} | <@${member.id}> a modificat ${actionLabels[action]}. • <t:${unixTime}:f>`,
    allowedMentions: {
      parse: [],
      users: [member.id],
    },
  });
}

export async function sendCarceraDecisionLog(
  client: Client,
  decision: CarceraDecision,
  member: GuildMember,
  sourceChannelId: string,
  dossierId: string,
  reportUrl: string,
): Promise<void> {
  const channel = await getLogsChannel(client);

  if (!channel) {
    return;
  }

  const unixTime = Math.floor(Date.now() / 1000);

  await channel.send({
    content: `<#${sourceChannelId}>${dossierLink(dossierId, reportUrl)} | <@${member.id}> a ${decision} dosarul disciplinar. • <t:${unixTime}:f>`,
    allowedMentions: {
      parse: [],
      users: [member.id],
    },
  });
}
