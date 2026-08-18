import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Client,
  type Message,
} from "discord.js";
import { env } from "../config/env.js";
import { ids } from "./ids.js";

type PanelConfig = {
  title: string;
  description: string;
  buttonId: string;
  buttonLabel: string;
  buttonStyle: ButtonStyle;
  color: number;
};

const panels: PanelConfig[] = [
  {
    title: "🚓 Transporturi",
    description: "Creeaza un raport nou de transport. Agentul principal si gradul sunt luate automat din Discord.",
    buttonId: ids.transportButton,
    buttonLabel: "Creeaza transport",
    buttonStyle: ButtonStyle.Primary,
    color: 0x3b82f6,
  },
  {
    title: "👀 Vizite",
    description: "Inregistreaza rapid o vizita si selecteaza agentul secundar direct din lista de membri.",
    buttonId: ids.vizitaButton,
    buttonLabel: "Creeaza vizita",
    buttonStyle: ButtonStyle.Success,
    color: 0x8b5cf6,
  },
  {
    title: "⛓️ Carcera si prelungiri",
    description: "Trimite o prelungire la aprobare. Dupa postare apar butoanele Aprobat si Respins.",
    buttonId: ids.carceraButton,
    buttonLabel: "Creeaza prelungire",
    buttonStyle: ButtonStyle.Secondary,
    color: 0xf59e0b,
  },
];

function jsonHasButton(value: unknown, buttonId: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => jsonHasButton(item, buttonId));
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (data.custom_id === buttonId) {
    return true;
  }

  return jsonHasButton(data.components, buttonId);
}

function hasButton(message: Message, buttonId: string): boolean {
  return message.components.some((component) => jsonHasButton(component.toJSON(), buttonId));
}

async function removeOldPanels(client: Client<true>): Promise<void> {
  const oldChannels = [env.transportChannelId, env.viziteChannelId, env.carceraChannelId];
  const oldButtonIds = [ids.transportButton, ids.vizitaButton, ids.carceraButton];

  for (const channelId of oldChannels) {
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
      continue;
    }

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);

    if (!messages) {
      continue;
    }

    for (const message of messages.values()) {
      if (message.author.id !== client.user.id) {
        continue;
      }

      const isOldPanel = oldButtonIds.some((buttonId) => hasButton(message, buttonId));

      if (isOldPanel) {
        // Butoanele de creare trebuie sa ramana doar in receptie.
        await message.delete().catch(() => null);
      }
    }
  }
}

export async function ensurePanels(client: Client<true>): Promise<void> {
  await removeOldPanels(client);

  const channel = await client.channels.fetch(env.receptieChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    console.error("Canal invalid pentru receptie.");
    return;
  }

  const recentMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);

  for (const panel of panels) {
    const alreadyExists = recentMessages?.some(
      (message) => message.author.id === client.user.id && hasButton(message, panel.buttonId),
    );

    if (alreadyExists) {
      continue;
    }

    const embed = new EmbedBuilder()
      .setColor(panel.color)
      .setTitle(panel.title)
      .setDescription(panel.description)
      .setFooter({ text: "Receptie ANP" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(panel.buttonId)
        .setLabel(panel.buttonLabel)
        .setStyle(panel.buttonStyle),
    );

    await channel.send({ embeds: [embed], components: [row] });
  }
}
