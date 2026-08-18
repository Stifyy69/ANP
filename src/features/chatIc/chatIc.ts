import type { Message } from "discord.js";
import { env } from "../../config/env.js";
import { sanitizeIcMessage } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";

type MentionTarget =
  | { type: "user"; id: string }
  | { type: "role"; id: string };

function getMentionTargetsInOrder(message: Message<true>): MentionTarget[] {
  const targets: MentionTarget[] = [];
  const seenUsers = new Set<string>();
  const seenRoles = new Set<string>();

  // Pastram ordinea exacta in care au fost scrise tag-urile in mesaj.
  for (const match of message.content.matchAll(/<@!?(\d+)>|<@&(\d+)>/g)) {
    const userId = match[1];
    const roleId = match[2];

    if (userId) {
      if (userId === message.author.id || seenUsers.has(userId) || !message.mentions.users.has(userId)) {
        continue;
      }

      seenUsers.add(userId);
      targets.push({ type: "user", id: userId });
      continue;
    }

    if (!roleId || seenRoles.has(roleId)) {
      continue;
    }

    const role = message.mentions.roles.get(roleId) ?? message.guild.roles.cache.get(roleId);

    if (!role) {
      continue;
    }

    seenRoles.add(roleId);
    targets.push({ type: "role", id: roleId });
  }

  return targets;
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

  const mentionTargets = getMentionTargetsInOrder(message);
  const mentionedUserIds = mentionTargets
    .filter((target): target is Extract<MentionTarget, { type: "user" }> => target.type === "user")
    .map((target) => target.id);
  const mentionedRoleIds = mentionTargets
    .filter((target): target is Extract<MentionTarget, { type: "role" }> => target.type === "role")
    .map((target) => target.id);
  const text = sanitizeIcMessage(message) || "...";
  const authorMention = `**<@${message.author.id}>**`;
  const gradeMention = `**<@&${grade.id}>**`;
  const mentionText = mentionTargets
    .map((target) => target.type === "user"
      ? `**<@${target.id}>**`
      : `**<@&${target.id}>**`)
    .join(" ");

  const content = mentionTargets.length > 0
    ? `${gradeMention} | ${authorMention} mentioneaza pe ${mentionText} si spune : ${text}`
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
      roles: [...new Set([grade.id, ...mentionedRoleIds])],
      users: [message.author.id, ...mentionedUserIds],
      repliedUser: false,
    },
  });
}
