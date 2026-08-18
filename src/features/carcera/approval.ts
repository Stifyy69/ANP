import {
  MessageFlags,
  type ButtonInteraction,
  type GuildMember,
} from "discord.js";
import { env } from "../../config/env.js";
import { sendCarceraDecisionLog, type CarceraDecision } from "../../services/logService.js";

const decisionsInProgress = new Set<string>();

async function getMember(interaction: ButtonInteraction): Promise<GuildMember | null> {
  if (!interaction.guild) {
    return null;
  }

  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

function canDecide(member: GuildMember): boolean {
  return env.carceraApprovalRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

export async function handleCarceraDecision(
  interaction: ButtonInteraction,
  decision: CarceraDecision,
): Promise<void> {
  const member = await getMember(interaction);

  if (!member || !canDecide(member)) {
    await interaction.reply({
      content: "Nu ai gradul necesar pentru a aproba sau respinge aceasta prelungire.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messageId = interaction.message.id;

  if (decisionsInProgress.has(messageId)) {
    await interaction.reply({
      content: "Decizia pentru aceasta prelungire este deja in curs.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  decisionsInProgress.add(messageId);

  try {
    await interaction.deferUpdate();

    // Dupa decizie scoatem butoanele si lasam doar reactia finala.
    await interaction.message.edit({ components: [] });
    await interaction.message.react(decision === "aprobat" ? "✅" : "❌");

    await sendCarceraDecisionLog(
      interaction.client,
      decision,
      member,
      interaction.channelId,
    );

    await interaction.followUp({
      content: decision === "aprobat" ? "Prelungirea a fost aprobata." : "Prelungirea a fost respinsa.",
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    decisionsInProgress.delete(messageId);
  }
}
