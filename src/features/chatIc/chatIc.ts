import type { Message, User } from "discord.js";
import { env } from "../../config/env.js";
import { sanitizeIcMessage } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";

function getMentionedUsersInOrder(message: Message<true>): User[] {
  const users: User[] = [];
  const seen = new Set<string>();

  // Luam tag-urile direct din mesaj ca sa pastram ordinea in care au fost scrise.
  for (const match of message.content.matchAll(/<@!?(\d+)>/g)) {
    const userId = match[1];

    if (!userId || userId === message.author.id || seen.has(userId)) {
      continue;
    }

    const user = message.mentions.users.get(userId);

    if (!user) {
      continue;
    }

    seen.add(userId);
    users.push(user);
  }

  return users;
}

export async function handleChatIcMessage(message: Message): Promise<void> {
  if (message.author.bot || message.channelId !== env.chatIcChannelId) {
    return;
  }

  if (!message.inGuild() || message.guildId !== env.guildId) {
    return;
  }

  const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
  const grade = member ? getGradeRole(member) : null;

  if (!member || !grade) {
    await message.author.send("Nu ai un grad configurat pentru chat-ul IC.").catch(() => null);
    return;
  }

  const mentionedUsers = getMentionedUsersInOrder(message);
  const text = sanitizeIcMessage(message) || "...";
  const authorMention = `**<@${message.author.id}>**`;
  const gradeMention = `**<@&${grade.id}>**`;

  const content = mentionedUsers.length > 0
    ? `${gradeMention} | ${authorMention} mentioneaza pe ${mentionedUsers
        .map((user) => `**<@${user.id}>**`)
        .join(" ")} si spune : ${text}`
    : `${gradeMention} | ${authorMention} spune : ${text}`;

  // Mesajul original este sters doar dupa ce am extras toate datele necesare.
  const deleted = await message.delete().then(() => true).catch((error) => {
    console.error("Nu am putut sterge mesajul din chat IC:", error);
    return false;
  });

  if (!deleted) {
    return;
  }

  await message.channel.send({
    content,
    allowedMentions: {
      parse: [],
      roles: [grade.id],
      users: [message.author.id, ...mentionedUsers.map((user) => user.id)],
      repliedUser: false,
    },
  });
}
