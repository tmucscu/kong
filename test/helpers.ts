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
