import {
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type GuildMember,
} from "discord.js";
import { env } from "../../config/env.js";
import { sendCarceraDecisionLog, type CarceraDecision } from "../../services/logService.js";
import { messageHasButton } from "../../services/reportMessage.js";
import { ids } from "../../ui/ids.js";

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

  if (!messageHasButton(interaction.message, ids.carceraApprove) || !messageHasButton(interaction.message, ids.carceraReject)) {
    await interaction.reply({
      content: "Aceasta prelungire are deja o decizie.",
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

    const currentEmbed = interaction.message.embeds[0];

    if (!currentEmbed) {
      throw new Error("Prelungirea nu are embed-ul asteptat.");
    }

    const approved = decision === "aprobat";
    const decidedAt = new Date();
    const updatedEmbed = EmbedBuilder.from(currentEmbed)
      .setColor(approved ? 0x22c55e : 0xef4444)
      .setFooter({
        text: `${approved ? "✅ Aprobata" : "❌ Respinsa"} de ${member.displayName}`,
      })
      .setTimestamp(decidedAt);

    // Dupa decizie raportul devine final si nu mai poate fi modificat.
    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: [],
    });
    await interaction.message.react(approved ? "✅" : "❌");

    await sendCarceraDecisionLog(
      interaction.client,
      decision,
      member,
      interaction.channelId,
      interaction.message.url,
    );

    await interaction.followUp({
      content: approved ? "Prelungirea a fost aprobata." : "Prelungirea a fost respinsa.",
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    decisionsInProgress.delete(messageId);
  }
}
