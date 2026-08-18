import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type Client,
  type Message,
} from "discord.js";
import { env } from "../../config/env.js";
import {
  getAgentStatsForPeriod,
  getCurrentWeekInfo,
  getPersonalStatsForPeriod,
  type AgentStats,
} from "../../database/database.js";
import { ids } from "../../ui/ids.js";

function jsonHasButton(value: unknown, customId: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => jsonHasButton(item, customId));
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (data.custom_id === customId) {
    return true;
  }

  return jsonHasButton(data.components, customId);
}

function hasButton(message: Message, customId: string): boolean {
  return message.components.some((component) => jsonHasButton(component.toJSON(), customId));
}

function topLines(
  stats: AgentStats[],
  key: "transporturi" | "vizite" | "carcera" | "total",
): string {
  const top = [...stats]
    .filter((agent) => agent[key] > 0)
    .sort((a, b) => b[key] - a[key] || b.total - a.total || a.userId.localeCompare(b.userId))
    .slice(0, 10);

  if (top.length === 0) {
    return "Nicio activitate inregistrata.";
  }

  return top
    .map((agent, index) => `**${index + 1}.** <@${agent.userId}> • **${agent[key]}**`)
    .join("\n");
}

async function buildPanel() {
  const [stats, week] = await Promise.all([
    getAgentStatsForPeriod({ type: "current_week" }),
    getCurrentWeekInfo(),
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x1f2937)
    .setTitle("Evidenta operationala ANP")
    .setDescription(
      `**Saptamana ${week.week} / ${week.year}**\n${week.startDate} 00:00 - ${week.endDate} 23:59`,
    )
    .addFields(
      { name: "Transporturi", value: topLines(stats, "transporturi") },
      { name: "Vizite", value: topLines(stats, "vizite") },
      { name: "Carcera aprobata", value: topLines(stats, "carcera") },
      { name: "Total activitati", value: topLines(stats, "total") },
    )
    .setFooter({ text: "Evidenta se calculeaza de luni 00:00 pana duminica 23:59 | Actualizare automata" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.reportsStatusButton)
      .setLabel("Statusul meu")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

export async function ensureReportsPanel(client: Client<true>): Promise<void> {
  const channel = await client.channels.fetch(env.reportsChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    console.error("Canal invalid pentru registrul de rapoarte ANP.");
    return;
  }

  const recentMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const panels = recentMessages
    ? [...recentMessages.values()].filter(
        (message) => message.author.id === client.user.id && hasButton(message, ids.reportsStatusButton),
      )
    : [];
  const panel = await buildPanel();
  const existing = panels[0];

  if (existing) {
    await existing.edit({
      ...panel,
      allowedMentions: { parse: [] },
    });

    for (const duplicate of panels.slice(1)) {
      await duplicate.delete().catch(() => null);
    }

    return;
  }

  await channel.send({
    ...panel,
    allowedMentions: { parse: [] },
  });
}

export async function showPersonalReportStats(interaction: ButtonInteraction): Promise<void> {
  const [stats, week] = await Promise.all([
    getPersonalStatsForPeriod(interaction.user.id, { type: "current_week" }),
    getCurrentWeekInfo(),
  ]);

  if (!stats) {
    await interaction.reply({
      content: `Nu ai activitate inregistrata in saptamana ${week.week}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x334155)
    .setTitle("Status operational ANP")
    .setDescription(
      `<@${interaction.user.id}> • Pozitie generala: **#${stats.rank ?? "-"}**\nSaptamana **${week.week} / ${week.year}**`,
    )
    .addFields(
      { name: "Transporturi", value: String(stats.transporturi), inline: true },
      { name: "Vizite", value: String(stats.vizite), inline: true },
      { name: "Carcera aprobata", value: String(stats.carcera), inline: true },
      { name: "Total", value: `**${stats.total}**` },
    )
    .setFooter({ text: `${week.startDate} 00:00 - ${week.endDate} 23:59` });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
}
