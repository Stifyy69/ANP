import {
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";

export function createTextField(options: {
  label: string;
  customId: string;
  placeholder?: string;
  style?: TextInputStyle;
  required?: boolean;
}): LabelBuilder {
  const input = new TextInputBuilder()
    .setCustomId(options.customId)
    .setStyle(options.style ?? TextInputStyle.Short)
    .setRequired(options.required ?? true);

  if (options.placeholder) {
    input.setPlaceholder(options.placeholder);
  }

  return new LabelBuilder().setLabel(options.label).setTextInputComponent(input);
}

export function createUserField(options: {
  label: string;
  customId: string;
  placeholder?: string;
  required?: boolean;
}): LabelBuilder {
  const required = options.required ?? false;

  const select = new UserSelectMenuBuilder()
    .setCustomId(options.customId)
    .setMinValues(required ? 1 : 0)
    .setMaxValues(1)
    .setRequired(required);

  if (options.placeholder) {
    select.setPlaceholder(options.placeholder);
  }

  return new LabelBuilder().setLabel(options.label).setUserSelectMenuComponent(select);
}
