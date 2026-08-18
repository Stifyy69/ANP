import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type Client,
} from "discord.js";
import { env } from "../config/env.js";
import { ids } from "./ids.js";

type PanelConfig = {
  channelId: string;
  title: string;
  description: string;
  buttonId: string;
  buttonLabel: string;
};

const panels: PanelConfig[] = [
  {
    channelId: env.transportChannelId,
    title: "SISTEM TRANSPORTURI",
    description: "Apasa butonul pentru a crea un transport nou.",
    buttonId: ids.transportButton,
    buttonLabel: "Creeaza transport",
  },
  {
    channelId: env.viziteChannelId,
    title: "SISTEM VIZITE",
    description: "Apasa butonul pentru a inregistra o vizita.",
    buttonId: ids.vizitaButton,
    buttonLabel: "Creeaza vizita",
  },
  {
    channelId: env.carceraChannelId,
    title: "SISTEM CARCERA",
    description: "Apasa butonul pentru a crea o prelungire.",
    buttonId: ids.carceraButton,
    buttonLabel: "Creeaza prelungire",
  },
];

function hasButton(message: { components: readonly { components: readonly { toJSON(): unknown }[] }[] }, buttonId: string): boolean {
  return message.components.some((row) =>
    row.components.some((component) => {
      const data = component.toJSON();

      return typeof data === "object"
        && data !== null
        && "custom_id" in data
        && data.custom_id === buttonId;
    }),
  );
}

export async function ensurePanels(client: Client<true>): Promise<void> {
  for (const panel of panels) {
    const channel = await client.channels.fetch(panel.channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
      console.error(`Canal invalid pentru panel: ${panel.title}`);
      continue;
    }

    const recentMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const alreadyExists = recentMessages?.some(
      (message) => message.author.id === client.user.id && hasButton(message, panel.buttonId),
    );

    if (alreadyExists) {
      continue;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(panel.buttonId)
        .setLabel(panel.buttonLabel)
        .setStyle(ButtonStyle.Primary),
    );

    await channel.send({
      content: `## ${panel.title}\n${panel.description}`,
      components: [row],
    });
  }
}
