import type { Client } from "discord.js";
import { ensurePanels } from "../ui/panels.js";

export async function handleReady(client: Client<true>): Promise<void> {
  console.log(`Bot conectat ca ${client.user.tag}.`);

  // La restart verificam daca butoanele principale mai exista in canale.
  await ensurePanels(client);
}
