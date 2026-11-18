import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { APIMessageComponentInteraction, APIModalSubmitInteraction } from "discord-api-types/v10";
import { freeEnds, freeStarts, isBookable, type LocalNow, type Span } from "../booking-rules";
import { bookings } from "../db/schema";
import { ButtonStyle, ComponentType, InteractionResponseType, InteractionType, MessageFlags, TextInputStyle } from "../discord/constants";
import { addDays, formatDay, formatTime, timeIn, todayIn } from "../time";
import type { CommandHandler, CommandContext, ComponentHandler, InteractionResponse } from "./types";

const DAYS_OFFERED = 8;

// Every choice made so far lives in the component custom_ids; nothing is saved until the modal is submitted.
//   book:date                         select   -> pick a day
//   book:sh:<date>                    select   -> pick a start hour
//   book:cancel                       button   -> leave the flow

const row = (...components: object[]) => ({ type: ComponentType.ActionRow, components });
const cancelButton = { type: ComponentType.Button, style: ButtonStyle.Danger, label: "Cancel", custom_id: "book:cancel" };

const hourLabel = (hour: number) => formatTime(`${String(hour).padStart(2, "0")}:00`).replace(":00", "");

function localNow({ env, now }: CommandContext): LocalNow {
  return { date: todayIn(env.TIMEZONE, now), time: timeIn(env.TIMEZONE, now) };
}

async function spansOn(ctx: CommandContext, date: string): Promise<Span[]> {
  return drizzle(ctx.env.DB).select({ start: bookings.start, end: bookings.end }).from(bookings).where(eq(bookings.date, date));
}

function dateScreen(ctx: CommandContext) {
  const today = localNow(ctx).date;
  const options = Array.from({ length: DAYS_OFFERED }, (_, i) => addDays(today, i)).map((d) => ({
    value: d,
    label: formatDay(d),
  }));
  return {
    content: "Which day do you want to book the Office?",
    components: [
      row({ type: ComponentType.StringSelect, custom_id: "book:date", placeholder: "Pick a day", options }),
      row(cancelButton),
    ],
  };
}

const MINUTES = ["00", "15", "30", "45"];

/** Four minute buttons for `hour`; the ones not in `free` are greyed out. */
const minuteButtons = (idPrefix: string, hour: string, free: string[]) =>
  row(
    ...MINUTES.map((mm) => ({
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      label: `:${mm}`,
      custom_id: `${idPrefix}:${hour}${mm}`,
      disabled: !free.includes(`${hour}:${mm}`),
    })),
  );

async function startHourScreen(ctx: CommandContext, date: string, hour?: string) {
  const starts = freeStarts(date, await spansOn(ctx, date), localNow(ctx));
  const hours = [...new Set(starts.map((s) => s.slice(0, 2)))];
  const options = hours.map((h) => ({ value: h, label: hourLabel(Number(h)), default: h === hour }));
  return {
    content: `What time does your booking on ${formatDay(date)} start?`,
    components: [
      row({ type: ComponentType.StringSelect, custom_id: `book:sh:${date}`, placeholder: "Pick an hour", options }),
      ...(hour ? [minuteButtons(`book:sm:${date}`, hour, starts)] : []),
      row(cancelButton),
    ],
  };
}

const clock = (hhmm: string) => `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;

async function endHourScreen(ctx: CommandContext, date: string, start: string, hour?: string) {
  const ends = freeEnds(clock(start), await spansOn(ctx, date));
  const hours = [...new Set(ends.map((e) => e.slice(0, 2)))];
  const options = hours.map((h) => ({
    value: h,
    label: h === "24" ? "12 AM (midnight)" : hourLabel(Number(h)),
    default: h === hour,
  }));
  return {
    content: `What time does your booking on ${formatDay(date)} end? It starts at ${formatTime(clock(start))}.`,
    components: [
      row({ type: ComponentType.StringSelect, custom_id: `book:eh:${date}:${start}`, placeholder: "Pick an hour", options }),
      ...(hour ? [minuteButtons(`book:em:${date}:${start}`, hour, ends)] : []),
      row(cancelButton),
    ],
  };
}

// Preset reasons: [value, radio label, phrase used in the public confirmation].
const REASONS = [
  ["work", "Work meeting", "for a work meeting"],
  ["interview", "Interview", "for an interview"],
  ["study", "Study", "for studying"],
  ["office_hour", "CSCU office hour", "for a cscu office hour"],
  ["other", "Other", "for some reason hmmmm"],
] as const;

function detailsModal(date: string, start: string, end: string): InteractionResponse {
  const label = (text: string, component: object) => ({ type: ComponentType.Label, label: text, component });
  return {
    type: InteractionResponseType.Modal,
    data: {
      custom_id: `book:modal:${date}:${start}:${end}`,
      title: "Book the Office",
      components: [
        label("Reason", {
          type: ComponentType.RadioGroup,
          custom_id: "reason",
          required: false,
          options: REASONS.map(([value, text]) => ({ value, label: text })),
        }),
        label("Can others come in (quietly)?", {
          type: ComponentType.RadioGroup,
          custom_id: "others",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        }),
        label("Note", { type: ComponentType.TextInput, style: TextInputStyle.Short, custom_id: "note", required: false, max_length: 100 }),
      ],
    },
  };
}

export const book: CommandHandler = (_interaction, ctx): InteractionResponse => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { ...dateScreen(ctx), flags: MessageFlags.Ephemeral },
});

/** The value of every field in a submitted modal, by custom_id. */
function modalFields(interaction: APIModalSubmitInteraction): Record<string, string | undefined> {
  const fields: Record<string, string | undefined> = {};
  const walk = (list: any[]) =>
    list.forEach((c) => {
      if (c.custom_id) fields[c.custom_id] = c.value ?? undefined;
      if (c.component) walk([c.component]);
      if (c.components) walk(c.components);
    });
  walk(interaction.data.components as any[]);
  return fields;
}

const refuse = (content: string): InteractionResponse => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content, flags: MessageFlags.Ephemeral },
});

async function saveBooking(interaction: APIModalSubmitInteraction, ctx: CommandContext): Promise<InteractionResponse> {
  const [, , date, startId, endId] = interaction.data.custom_id.split(":");
  const [start, end] = [clock(startId), clock(endId)];
  const fields = modalFields(interaction);
  const userId = interaction.member!.user.id;

  if (!isBookable(date, await spansOn(ctx, date), start, end, localNow(ctx))) {
    return refuse("Sorry, that time overlaps another booking. Run /book to pick another time.");
  }

  const reason = REASONS.find(([value]) => value === fields.reason);
  const note = fields.note?.trim() || null;
  const othersCanCome = fields.others === "yes";
  await drizzle(ctx.env.DB)
    .insert(bookings)
    .values({ userId, date, start, end, reason: reason?.[0] ?? null, note, othersCanCome });

  const why = reason ? ` ${reason[2]}${note ? ` - ${note}` : ""}` : note ? ` - ${note}` : "";
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `<@${userId}> has booked the Office on ${formatDay(date)} from ${formatTime(start)} to ${formatTime(end)}${why}${othersCanCome ? " [can come in]" : ""}`,
      allowed_mentions: { parse: [] },
    },
  };
}

export const bookInteraction: ComponentHandler = async (interaction, ctx) => {
  if (interaction.type === InteractionType.ModalSubmit) return saveBooking(interaction as APIModalSubmitInteraction, ctx);
  const click = interaction as APIMessageComponentInteraction;
  const [, step, date, start, end] = click.data.custom_id.split(":");
  const values = (click.data as { values?: string[] }).values ?? [];

  if (step === "date") return update(await startHourScreen(ctx, values[0]));
  if (step === "sh") return update(await startHourScreen(ctx, date, values[0]));
  if (step === "sm") return update(await endHourScreen(ctx, date, start));
  if (step === "eh") return update(await endHourScreen(ctx, date, start, values[0]));
  if (step === "em") return detailsModal(date, start, end);
  throw new Error("not implemented");
};

const update = (data: object): InteractionResponse => ({
  type: InteractionResponseType.UpdateMessage,
  data: data as Record<string, unknown>,
});
