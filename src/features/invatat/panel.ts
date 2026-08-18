import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Client,
  type Message,
} from "discord.js";
import { env } from "../../config/env.js";
import { ids } from "../../ui/ids.js";
import { ANP_REGULATION_URL } from "./questions.js";

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

function buildPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x334155)
    .setTitle("Centrul de Instruire ANP")
    .setDescription(
      "Spatiul de pregatire pentru personalul penitenciarului. Consulta regulamentul, parcurge materialele de instruire si verifica-ti cunostintele prin testul ANP.",
    )
    .addFields(
      {
        name: "Pregatire",
        value: "Parcurge informatiile esentiale despre ierarhie, atributii, vizite, transporturi, carcera si promovari.",
      },
      {
        name: "Test de verificare",
        value: "Toate raspunsurile sunt scrise de tine. Nu exista variante multiple de raspuns.",
      },
      {
        name: "Inainte de test",
        value: "Citirea regulamentului oficial ANP este obligatorie inainte de inceperea testului.",
      },
    )
    .setFooter({ text: "Centrul de Instruire ANP" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Citeste regulamentul")
      .setStyle(ButtonStyle.Link)
      .setURL(ANP_REGULATION_URL),
    new ButtonBuilder()
      .setCustomId(ids.invatatLearnButton)
      .setLabel("Invata regulamentul")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ids.invatatStartButton)
      .setLabel("Incepe testul")
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

export async function ensureInvatatPanel(client: Client<true>): Promise<void> {
  const channel = await client.channels.fetch(env.invatatChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    console.error("Canal invalid pentru centrul de instruire ANP.");
    return;
  }

  const recentMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const existing = recentMessages?.find(
    (message) => message.author.id === client.user.id && hasButton(message, ids.invatatStartButton),
  );
  const panel = buildPanel();

  if (existing) {
    await existing.edit(panel).catch(() => null);
    return;
  }

  await channel.send(panel);
}
