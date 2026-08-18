import type { Message } from "discord.js";

function jsonHasButton(value: unknown, customId: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => jsonHasButton(item, customId));
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (data.custom_id === customId) {
    return true;
  }

  return jsonHasButton(data.components, customId);
}

export function messageHasButton(message: Message, customId: string): boolean {
  return message.components.some((component) => jsonHasButton(component.toJSON(), customId));
}

export function getReportCreatorId(message: Message): string | null {
  const description = message.embeds[0]?.description ?? "";
  return description.match(/<@!?(\d+)>/)?.[1] ?? null;
}

export function getReportDossierId(message: Message): string | null {
  const title = message.embeds[0]?.title ?? "";
  return title.match(/\b([TVC]-\d+)\b/)?.[1] ?? null;
}

export function getReportField(message: Message, fieldName: string): string | null {
  return message.embeds[0]?.fields.find((field) => field.name === fieldName)?.value ?? null;
}

export function getMentionIds(text: string): string[] {
  return [...text.matchAll(/<@!?(\d+)>/g)]
    .map((match) => match[1])
    .filter((id): id is string => id !== undefined);
}

export function getReportTimestamp(message: Message): Date | undefined {
  const timestamp = message.embeds[0]?.timestamp;
  return timestamp ? new Date(timestamp) : undefined;
}

export function getMessageIdFromModal(customId: string, prefix: string): string | null {
  if (!customId.startsWith(prefix)) {
    return null;
  }

  const messageId = customId.slice(prefix.length);
  return /^\d+$/.test(messageId) ? messageId : null;
}
