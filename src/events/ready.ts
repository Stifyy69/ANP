import type { Client } from "discord.js";
import { env } from "../config/env.js";
import { ensurePanels } from "../ui/panels.js";

export async function handleReady(client: Client<true>): Promise<void> {
  const guild = await client.guilds.fetch(env.guildId).catch(() => null);

  if (!guild) {
    throw new Error("GUILD_ID nu corespunde unui server in care se afla botul.");
  }

  console.log(`Bot conectat ca ${client.user.tag} pe ${guild.name}.`);

  // La restart verificam daca butoanele principale mai exista in canale.
  await ensurePanels(client);
}
