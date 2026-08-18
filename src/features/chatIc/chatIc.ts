import type { Message } from "discord.js";
import { env } from "../../config/env.js";
import { sanitizeIcMessage } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";

export async function handleChatIcMessage(message: Message): Promise<void> {
  if (message.author.bot || message.channelId !== env.chatIcChannelId || !message.inGuild()) {
    return;
  }

  // Stergem mesajul original inainte sa il refacem in formatul IC.
  const deleted = await message.delete().then(() => true).catch((error) => {
    console.error("Nu am putut sterge mesajul din chat IC:", error);
    return false;
  });

  if (!deleted) {
    return;
  }

  const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
  const grade = member ? getGradeRole(member) : null;

  if (!member || !grade) {
    await message.author.send("Nu ai un grad configurat pentru chat-ul IC.").catch(() => null);
    return;
  }

  const mentionedUsers = [...message.mentions.users.values()].filter(
    (user) => !user.bot && user.id !== message.author.id,
  );

  const text = sanitizeIcMessage(message) || "...";
  const authorMention = `**<@${message.author.id}>**`;
  const gradeMention = `**<@&${grade.id}>**`;

  const content = mentionedUsers.length > 0
    ? `${gradeMention} | ${authorMention} mentioneaza pe ${mentionedUsers
        .map((user) => `**<@${user.id}>**`)
        .join(" ")} si spune : ${text}`
    : `${gradeMention} | ${authorMention} spune : ${text}`;

  await message.channel.send({
    content,
    allowedMentions: {
      parse: [],
      roles: [grade.id],
      users: [message.author.id, ...mentionedUsers.map((user) => user.id)],
    },
  });
}
