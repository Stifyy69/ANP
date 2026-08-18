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

const createButtonIds = [ids.transportButton, ids.vizitaButton, ids.carceraButton];

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

function hasAllCreateButtons(message: Message): boolean {
  return createButtonIds.every((buttonId) => hasButton(message, buttonId));
}

async function removeOldPanels(client: Client<true>): Promise<void> {
  const oldChannels = [env.transportChannelId, env.viziteChannelId, env.carceraChannelId];

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

      if (createButtonIds.some((buttonId) => hasButton(message, buttonId))) {
        // Butoanele de creare trebuie sa ramana doar in receptie.
        await message.delete().catch(() => null);
      }
    }
  }
}

function buildReceptionPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x1f2937)
    .setTitle("🏛️ Receptie ANP")
    .setDescription("Alege operatiunea pe care vrei sa o inregistrezi. Raportul va fi trimis automat in canalul corect.")
    .addFields(
      {
        name: "🚓 Transport penitenciar",
        value: "Creeaza un transport si selecteaza optional agentul secundar.",
      },
      {
        name: "👀 Vizita detinut",
        value: "Inregistreaza vizitatorul, detinutul si intervalul vizitei.",
      },
      {
        name: "⛓️ Prelungire carcera",
        value: "Trimite o prelungire care trebuie aprobata sau respinsa de un grad autorizat.",
      },
    )
    .setFooter({ text: "Receptie ANP" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.transportButton)
      .setLabel("Transport")
      .setEmoji("🚓")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ids.vizitaButton)
      .setLabel("Vizita")
      .setEmoji("👀")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(ids.carceraButton)
      .setLabel("Prelungire")
      .setEmoji("⛓️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

export async function ensurePanels(client: Client<true>): Promise<void> {
  await removeOldPanels(client);

  const channel = await client.channels.fetch(env.receptieChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    console.error("Canal invalid pentru receptie.");
    return;
  }

  const recentMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  let mainPanel: Message | null = null;

  if (recentMessages) {
    for (const message of recentMessages.values()) {
      if (message.author.id !== client.user.id) {
        continue;
      }

      const isReceptionPanel = createButtonIds.some((buttonId) => hasButton(message, buttonId));

      if (!isReceptionPanel) {
        continue;
      }

      if (!mainPanel && hasAllCreateButtons(message)) {
        mainPanel = message;
        continue;
      }

      await message.delete().catch(() => null);
    }
  }

  const panel = buildReceptionPanel();

  if (mainPanel) {
    await mainPanel.edit(panel).catch(() => null);
    return;
  }

  await channel.send(panel);
}
