import { MessageFlags, type Interaction } from "discord.js";
import { handleCarceraSubmit, showCarceraModal } from "../features/carcera/carcera.js";
import { handleTransportSubmit, showTransportModal } from "../features/transport/transport.js";
import { handleVizitaSubmit, showVizitaModal } from "../features/vizite/vizite.js";
import { ids } from "../ui/ids.js";

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
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
      }

      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === ids.transportModal) {
        await handleTransportSubmit(interaction);
        return;
      }

      if (interaction.customId === ids.vizitaModal) {
        await handleVizitaSubmit(interaction);
        return;
      }

      if (interaction.customId === ids.carceraModal) {
        await handleCarceraSubmit(interaction);
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
