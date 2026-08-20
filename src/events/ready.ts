import type { Client } from "discord.js";
import { env } from "../config/env.js";
import { initDatabase } from "../database/database.js";
import { ensureInvatatPanel } from "../features/invatat/panel.js";
import { registerReportCommand } from "../features/rapoarte/reportCommand.js";
import { ensureReportsPanel } from "../features/rapoarte/reportsPanel.js";
import { ensurePanels } from "../ui/panels.js";
import { startManagementWebServer } from "../web/server.js";

export async function handleReady(client: Client<true>): Promise<void> {
  const guild = await client.guilds.fetch(env.guildId).catch(() => null);

  if (!guild) {
    throw new Error("GUILD_ID nu corespunde unui server in care se afla botul.");
  }

  console.log(`Bot conectat ca ${client.user.tag} pe ${guild.name}.`);

  // Pregatim tabelele inainte sa pornim panourile care citesc statistici.
  await initDatabase();
  await registerReportCommand(guild);
  await startManagementWebServer(client);

  // La restart verificam daca panourile principale mai exista.
  await ensurePanels(client);
  await ensureInvatatPanel(client);
  await ensureReportsPanel(client);
}
