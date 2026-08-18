import type { Message } from "discord.js";
import { handleChatIcMessage } from "../features/chatIc/chatIc.js";

export async function handleMessageCreate(message: Message): Promise<void> {
  await handleChatIcMessage(message);
}
