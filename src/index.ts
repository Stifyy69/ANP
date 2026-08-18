import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./config/env.js";
import { handleInteractionCreate } from "./events/interactionCreate.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleReady } from "./events/ready.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, handleReady);
client.on(Events.InteractionCreate, handleInteractionCreate);
client.on(Events.MessageCreate, handleMessageCreate);

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

await client.login(env.discordToken);
