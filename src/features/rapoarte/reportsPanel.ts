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
import { getAgentStats, getTopAgentStats } from "../../database/database.js";
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

async function buildPanel() {
  const top = await getTopAgentStats(10);
  const lines = top.length > 0
    ? top.map((agent, index) =>
        `**${index + 1}.** <@${agent.userId}>  •  **${agent.total}** total  |  T ${agent.transporturi}  V ${agent.vizite}  C ${agent.carcera}`,
      )
    : ["Nu exista activitate inregistrata momentan."];

  const embed = new EmbedBuilder()
    .setColor(0x1f2937)
    .setTitle("Registrul de activitate ANP")
    .setDescription(
      "Evidenta operationala a personalului ANP. Sunt contorizati agentul principal si agentul secundar pentru fiecare activitate.",
    )
    .addFields({
      name: "Top 10 activitate",
      value: lines.join("\n"),
    })
    .setFooter({
      text: "T = Transporturi | V = Vizite | C = Carcera aprobata | Actualizare automata",
    })
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
  const stats = await getAgentStats(interaction.user.id);

  if (!stats) {
    await interaction.reply({
      content: "Nu ai activitate inregistrata in evidenta ANP.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x334155)
    .setTitle("Status operational ANP")
    .setDescription(`<@${interaction.user.id}> • Pozitie in clasament: **#${stats.rank ?? "-"}**`)
    .addFields(
      { name: "Transporturi", value: String(stats.transporturi), inline: true },
      { name: "Vizite", value: String(stats.vizite), inline: true },
      { name: "Carcera aprobata", value: String(stats.carcera), inline: true },
      { name: "Total activitati", value: `**${stats.total}**` },
    )
    .setFooter({ text: "Evidenta personala ANP" });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
}
