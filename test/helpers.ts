import { env } from "cloudflare:workers";
import { InteractionType } from "../src/discord/constants";
import { createApp, type AppDeps } from "../src/app";

const keyPair = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
const publicKeyHex = hex(new Uint8Array((await crypto.subtle.exportKey("raw", keyPair.publicKey)) as ArrayBuffer));

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sign(body: string, timestamp = String(Math.floor(Date.now() / 1000))) {
  const data = new TextEncoder().encode(timestamp + body);
  const sig = await crypto.subtle.sign("Ed25519", keyPair.privateKey, data);
  return { timestamp, signature: hex(new Uint8Array(sig)) };
}

/** Sends a correctly signed interaction to the Worker's fetch handler, as Discord would. */
export async function send(payload: object, deps?: Partial<AppDeps>) {
  const body = JSON.stringify(payload);
  const { timestamp, signature } = await sign(body);
  const app = createApp(deps);
  const response = await app.fetch(
    new Request("https://kong.test/interactions", {
      method: "POST",
      headers: { "x-signature-ed25519": signature, "x-signature-timestamp": timestamp, "content-type": "application/json" },
      body,
    }),
    { ...env, DISCORD_PUBLIC_KEY: publicKeyHex },
  );
  return response;
}

export const ping = { type: InteractionType.Ping };

export interface Reply {
  type: number;
  data?: {
    content?: string;
    flags?: number;
    embeds?: { title?: string; description?: string }[];
    allowed_mentions?: { parse?: string[] };
  };
}

/** A slash command invocation by `userId`, optionally with Manage Server. */
export function command(name: string, opts: { userId?: string; admin?: boolean; options?: object[] } = {}) {
  return {
    type: 2,
    id: "1",
    token: "token",
    application_id: "app",
    guild_id: "guild",
    member: { user: { id: opts.userId ?? "100" }, permissions: opts.admin ? String(1n << 5n) : "0" },
    data: { id: "c", name, type: 1, options: opts.options ?? [] },
  };
}

export async function reply(response: Response): Promise<Reply> {
  return (await response.json()) as Reply;
}

/** 2026-11-18 12:00 in Toronto (EST, UTC-5). */
export const NOW = () => new Date("2026-11-18T17:00:00Z");

export async function seedBooking(b: {
  userId: string;
  date: string;
  start: string;
  end: string;
  othersCanCome?: boolean;
  reason?: string;
}) {
  await env.DB.prepare(
    "INSERT INTO bookings (user_id, date, start, end, reason, others_can_come) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(b.userId, b.date, b.start, b.end, b.reason ?? null, b.othersCanCome ? 1 : 0)
    .run();
}
