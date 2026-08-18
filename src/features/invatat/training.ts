import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { ids } from "../../ui/ids.js";
import { createTextField } from "../../ui/modalFields.js";
import { ANP_REGULATION_URL, learningPages, testQuestions, type TestQuestion } from "./questions.js";

const TEST_SIZE = 10;
const SESSION_LIFETIME_MS = 30 * 60 * 1000;

type TestSession = {
  id: string;
  userId: string;
  questions: TestQuestion[];
  currentIndex: number;
  score: number;
  expiresAt: number;
};

const sessions = new Map<string, TestSession>();

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9:+/\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCorrectAnswer(question: TestQuestion, value: string): boolean {
  const answer = normalizeAnswer(value);

  return question.accepted.some((candidate) => {
    const accepted = normalizeAnswer(candidate);

    if (accepted === "da" || accepted === "nu") {
      return answer === accepted;
    }

    if (/^\d+$/.test(accepted)) {
      return new RegExp(`(^|\\s)${accepted}(\\s|$)`).test(answer);
    }

    return answer === accepted || answer.includes(accepted);
  });
}

function shuffledQuestions(): TestQuestion[] {
  const questions = [...testQuestions];

  for (let index = questions.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [questions[index], questions[randomIndex]] = [questions[randomIndex]!, questions[index]!];
  }

  return questions.slice(0, Math.min(TEST_SIZE, questions.length));
}

function createSession(userId: string): TestSession {
  const session: TestSession = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    userId,
    questions: shuffledQuestions(),
    currentIndex: 0,
    score: 0,
    expiresAt: Date.now() + SESSION_LIFETIME_MS,
  };

  sessions.set(userId, session);
  return session;
}

function getActiveSession(userId: string): TestSession | null {
  const session = sessions.get(userId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(userId);
    return null;
  }

  return session;
}

function questionPayload(session: TestSession) {
  const question = session.questions[session.currentIndex];

  if (!question) {
    throw new Error("Sesiunea de test nu mai are o intrebare activa.");
  }

  const embed = new EmbedBuilder()
    .setColor(0x475569)
    .setTitle(`Intrebarea ${session.currentIndex + 1}/${session.questions.length}`)
    .setDescription(question.question)
    .addFields({ name: "Categorie", value: question.category })
    .setFooter({ text: "Scrie raspunsul tau. Nu exista variante multiple." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${ids.invatatAnswerButtonPrefix}${session.id}:${session.currentIndex}`)
      .setLabel("Raspunde")
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

function lessonPayload(index: number) {
  const page = learningPages[index];

  if (!page) {
    return null;
  }

  const embed = new EmbedBuilder()
    .setColor(0x475569)
    .setTitle(`${index + 1}/${learningPages.length} | ${page.title}`)
    .setDescription(page.content)
    .setFooter({ text: "Material de pregatire ANP" });

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (index + 1 < learningPages.length) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${ids.invatatLessonPrefix}${index + 1}`)
          .setLabel("Urmatoarea pagina")
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  }

  return { embeds: [embed], components };
}

export async function showLearning(interaction: ButtonInteraction): Promise<void> {
  const payload = lessonPayload(0);

  if (!payload) {
    await interaction.reply({
      content: "Materialul de instruire nu este disponibil momentan.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

export async function showLearningPage(interaction: ButtonInteraction): Promise<void> {
  const rawIndex = interaction.customId.slice(ids.invatatLessonPrefix.length);
  const index = Number(rawIndex);
  const payload = Number.isInteger(index) ? lessonPayload(index) : null;

  if (!payload) {
    await interaction.reply({
      content: "Pagina de instruire nu mai este disponibila.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.update(payload);
}

export async function showTestPreparation(interaction: ButtonInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x92400e)
    .setTitle("Pregatire pentru testul ANP")
    .setDescription(
      "Inainte de a incepe testul trebuie sa citesti regulamentul oficial ANP. Dupa ce l-ai parcurs, confirma si testul va incepe.",
    )
    .addFields({
      name: "Formatul testului",
      value: `${TEST_SIZE} intrebari aleatorii. Toate raspunsurile sunt scrise de tine, fara variante multiple.`,
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Citeste regulamentul")
      .setStyle(ButtonStyle.Link)
      .setURL(ANP_REGULATION_URL),
    new ButtonBuilder()
      .setCustomId(ids.invatatConfirmReadButton)
      .setLabel("Am citit regulamentul")
      .setStyle(ButtonStyle.Success),
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

export async function startTest(interaction: ButtonInteraction): Promise<void> {
  const session = createSession(interaction.user.id);
  await interaction.update(questionPayload(session));
}

export async function showAnswerModal(interaction: ButtonInteraction): Promise<void> {
  const raw = interaction.customId.slice(ids.invatatAnswerButtonPrefix.length);
  const [sessionId, rawIndex] = raw.split(":");
  const index = Number(rawIndex);
  const session = getActiveSession(interaction.user.id);

  if (!session || session.id !== sessionId || session.currentIndex !== index) {
    await interaction.reply({
      content: "Aceasta intrebare nu mai este activa. Porneste din nou testul daca sesiunea a expirat.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`${ids.invatatAnswerModalPrefix}${session.id}:${session.currentIndex}`)
    .setTitle(`Raspuns ${session.currentIndex + 1}/${session.questions.length}`)
    .addLabelComponents(
      createTextField({
        label: "Raspunsul tau",
        customId: ids.invatatAnswerField,
        placeholder: "Scrie raspunsul aici",
        style: TextInputStyle.Paragraph,
      }),
    );

  await interaction.showModal(modal);
}

export async function handleTestAnswer(interaction: ModalSubmitInteraction): Promise<void> {
  const raw = interaction.customId.slice(ids.invatatAnswerModalPrefix.length);
  const [sessionId, rawIndex] = raw.split(":");
  const index = Number(rawIndex);
  const session = getActiveSession(interaction.user.id);

  if (!session || session.id !== sessionId || session.currentIndex !== index) {
    await interaction.reply({
      content: "Sesiunea de test a expirat sau aceasta intrebare a fost deja raspunsa.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const question = session.questions[session.currentIndex];

  if (!question) {
    sessions.delete(interaction.user.id);
    await interaction.reply({
      content: "Testul nu mai are o intrebare activa.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const userAnswer = interaction.fields.getTextInputValue(ids.invatatAnswerField);
  const correct = isCorrectAnswer(question, userAnswer);

  if (correct) {
    session.score += 1;
  }

  session.currentIndex += 1;
  session.expiresAt = Date.now() + SESSION_LIFETIME_MS;

  const feedback = new EmbedBuilder()
    .setColor(correct ? 0x15803d : 0xb91c1c)
    .setTitle(correct ? "Raspuns corect" : "Raspuns gresit")
    .setDescription(correct ? "Ai raspuns corect." : `Raspunsul corect este:\n**${question.answer}**`)
    .addFields({ name: "Intrebarea", value: question.question });

  if (session.currentIndex >= session.questions.length) {
    const finalScore = session.score;
    const total = session.questions.length;
    sessions.delete(interaction.user.id);

    const result = new EmbedBuilder()
      .setColor(0x334155)
      .setTitle("Test ANP finalizat")
      .setDescription(`Ai obtinut **${finalScore}/${total}** raspunsuri corecte.`)
      .setFooter({ text: "Poti relua oricand materialele si testul din Centrul de Instruire ANP." });

    await interaction.reply({ embeds: [feedback, result], flags: MessageFlags.Ephemeral });
    return;
  }

  const next = questionPayload(session);
  await interaction.reply({
    embeds: [feedback, ...next.embeds],
    components: next.components,
    flags: MessageFlags.Ephemeral,
  });
}
