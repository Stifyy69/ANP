import type { Guild, Message } from "discord.js";

function removeRoleMentions(text: string): string {
  return text.replace(/<@&(\d+)>/g, "");
}

function replaceChannelMentions(text: string, guild: Guild): string {
  return text.replace(/<#(\d+)>/g, (_match, channelId: string) => {
    const channel = guild.channels.cache.get(channelId);
    return channel ? `#${channel.name}` : "#canal";
  });
}

export function sanitizeIcMessage(message: Message<true>): string {
  let text = message.content;

  // Tag-urile de user sunt mutate in partea "mentioneaza pe".
  text = text.replace(/<@!?(\d+)>/g, "");

  // Alte roluri nu trebuie sa ramana in mesajul IC si nici sa poata da ping.
  text = removeRoleMentions(text);
  text = replaceChannelMentions(text, message.guild);
  text = text.replace(/@everyone/gi, "@\u200beveryone");
  text = text.replace(/@here/gi, "@\u200bhere");
  text = text.replace(/\s+([,.;!?])/g, "$1");
  text = text.replace(/\s{2,}/g, " ").trim();

  const attachmentUrls = [...message.attachments.values()].map((attachment) => attachment.url);
  return [text, ...attachmentUrls].filter(Boolean).join(" ").trim();
}

export function sanitizeFormText(text: string): string {
  return text
    .replace(/@everyone/gi, "@\u200beveryone")
    .replace(/@here/gi, "@\u200bhere")
    .trim();
}
