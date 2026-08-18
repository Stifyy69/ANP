import { MessageFlags, type Interaction } from "discord.js";
import { env } from "../config/env.js";
import { handleCarceraDecision } from "../features/carcera/approval.js";
import { handleCarceraSubmit, showCarceraModal } from "../features/carcera/carcera.js";
import { handleCarceraEditSubmit, showCarceraEditModal } from "../features/carcera/editCarcera.js";
import {
  handleTestAnswer,
  showAnswerModal,
  showTestPreparation,
  startTest,
} from "../features/invatat/training.js";
import { handleTransportEditSubmit, showTransportEditModal } from "../features/transport/editTransport.js";
import { handleTransportSubmit, showTransportModal } from "../features/transport/transport.js";
import { handleVizitaEditSubmit, showVizitaEditModal } from "../features/vizite/editVizita.js";
import { handleVizitaSubmit, showVizitaModal } from "../features/vizite/vizite.js";
import { ids } from "../ui/ids.js";

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
  if (interaction.guildId !== env.guildId) {
    return;
  }

  try {
    if (interaction.isButton()) {
      if (interaction.customId === ids.transportButton) {
        await showTransportModal(interaction);
        return;
      }

      if (interaction.customId === ids.vizitaButton) {
        await showVizitaModal(interaction);
        return;
      }

      if (interaction.customId === ids.carceraButton) {
        await showCarceraModal(interaction);
        return;
      }

      if (interaction.customId === ids.transportEditButton) {
        await showTransportEditModal(interaction);
        return;
      }

      if (interaction.customId === ids.vizitaEditButton) {
        await showVizitaEditModal(interaction);
        return;
      }

      if (interaction.customId === ids.carceraEditButton) {
        await showCarceraEditModal(interaction);
        return;
      }

      if (interaction.customId === ids.carceraApprove) {
        await handleCarceraDecision(interaction, "aprobat");
        return;
      }

      if (interaction.customId === ids.carceraReject) {
        await handleCarceraDecision(interaction, "respins");
        return;
      }

      if (interaction.customId === ids.invatatStartButton) {
        await showTestPreparation(interaction);
        return;
      }

      if (interaction.customId === ids.invatatConfirmReadButton) {
        await startTest(interaction);
        return;
      }

      if (interaction.customId.startsWith(ids.invatatAnswerButtonPrefix)) {
        await showAnswerModal(interaction);
      }

      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === ids.transportModal) {
        await handleTransportSubmit(interaction);
        return;
      }

      if (interaction.customId.startsWith(ids.transportEditModalPrefix)) {
        await handleTransportEditSubmit(interaction);
        return;
      }

      if (interaction.customId === ids.vizitaModal) {
        await handleVizitaSubmit(interaction);
        return;
      }

      if (interaction.customId.startsWith(ids.vizitaEditModalPrefix)) {
        await handleVizitaEditSubmit(interaction);
        return;
      }

      if (interaction.customId === ids.carceraModal) {
        await handleCarceraSubmit(interaction);
        return;
      }

      if (interaction.customId.startsWith(ids.carceraEditModalPrefix)) {
        await handleCarceraEditSubmit(interaction);
        return;
      }

      if (interaction.customId.startsWith(ids.invatatAnswerModalPrefix)) {
        await handleTestAnswer(interaction);
      }
    }
  } catch (error) {
    console.error("Eroare la procesarea interactiunii:", error);

    if (!interaction.isRepliable()) {
      return;
    }

    const payload = {
      content: "A aparut o eroare. Incearca din nou.",
      flags: MessageFlags.Ephemeral,
    } as const;

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
}
