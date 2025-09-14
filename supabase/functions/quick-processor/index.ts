// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference path="./deno-globals.d.ts" />
/// <reference path="./remote-modules.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Basic CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

// Best-effort in-memory rate limiter (per warm instance). For stronger guarantees, back with DB.
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes window
const MAX_PER_WINDOW = 5; // Max OTP emails per window per email
const MIN_INTERVAL_MS = 30 * 1000; // Min 30s between sends per email
const rateLimitMap = new Map<string, { count: number; first: number; last: number }>();

type JsonBody = {
  action?: string
  email?: string
  code?: string
  name?: string
  // EWB settings fields (for save)
  username?: string
  password?: string
  vehicle_from?: string
  vehicle_no?: string
}

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers({ ...corsHeaders, ...(init.headers || {}) })
  return new Response(JSON.stringify(data), { ...init, headers })
}

function badRequest(message: string) {
  return json({ error: message }, { status: 400 })
}

function serverError(message: string) {
  return json({ error: message }, { status: 500 })
}

async function sendEmailWithSendGrid(toEmail: string, subject: string, text: string, html: string) {
  const apiKey = Deno.env.get("SENDGRID_API_KEY")
  const sender = Deno.env.get("SENDER_EMAIL")
  const templateId = Deno.env.get("SENDGRID_TEMPLATE_ID") // optional dynamic template
  if (!apiKey || !sender) {
    throw new Error("Missing SENDGRID_API_KEY or SENDER_EMAIL secret")
  }

  const useTemplate = !!templateId;
  const payload: Record<string, unknown> = useTemplate
    ? {
        personalizations: [
          {
            to: [{ email: toEmail }],
            dynamic_template_data: {
              code: text.match(/\b\d{4,6}\b/)?.[0] || "",
              app_name: "Yash Roadlines",
              subject,
            },
          },
        ],
        from: { email: sender, name: "Yash Roadlines" },
        template_id: templateId,
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
      }
    : {
        personalizations: [
          {
            to: [{ email: toEmail }],
          },
        ],
        from: { email: sender, name: "Yash Roadlines" },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
        // Disable tracking for best deliverability with Single Sender (prevents link rewrites)
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
      }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`SendGrid error ${res.status}: ${body}`)
  }
}

// ===== Server-side AES-GCM helpers for EWB settings =====
function getSupabaseForRequest(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey(
    "raw",
    enc,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // deno-lint-ignore no-deprecated-deno-api
  return btoa(binary);
}

function base64ToBuf(b64: string): ArrayBuffer {
  // deno-lint-ignore no-deprecated-deno-api
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function encryptString(plain: string, secret: string): Promise<string> {
  const key = await importAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plain || "");
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return `${bufToBase64(iv.buffer)}:${bufToBase64(ct)}`;
}

async function decryptString(cipher: string, secret: string): Promise<string> {
  if (!cipher) return "";
  const [ivB64, ctB64] = cipher.split(":");
  if (!ivB64 || !ctB64) return "";
  const key = await importAesKey(secret);
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const ct = base64ToBuf(ctB64);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return badRequest("Only POST supported")
  }

  let body: JsonBody
  try {
    body = await req.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const action = (body.action || "").toString()

  try {
    if (action === "test") {
      return json({ ok: true, message: "quick-processor alive" })
    }

    if (action === "send_otp") {
      const email = (body.email || "").toString().trim()
      const code = (body.code || "").toString().trim()
      if (!email || !code) return badRequest("Missing email or code")

      // Basic email sanity check
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return badRequest("Invalid email format")
      }

      // Rate limiting (best-effort per warm instance)
      const now = Date.now()
      const entry = rateLimitMap.get(email) || { count: 0, first: now, last: 0 }
      if (entry.last && now - entry.last < MIN_INTERVAL_MS) {
        const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - entry.last)) / 1000)
        return json({ ok: false, error: `Too many requests. Try again in ${waitSec}s` }, { status: 429 })
      }
      if (now - entry.first > RATE_LIMIT_WINDOW_MS) {
        entry.count = 0
        entry.first = now
      }
      if (entry.count >= MAX_PER_WINDOW) {
        return json({ ok: false, error: "Rate limit exceeded. Please wait a few minutes." }, { status: 429 })
      }

      const subject = "Your OTP Code"
      const text = `Your OTP code is ${code} for Yash Roadlines. It expires in 5 minutes. If you didn't request this, ignore this email.`
      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111">
          <h2 style="margin:0 0 8px">OTP Verification</h2>
          <p style="margin:0 0 8px">Use the code below to verify your login:</p>
          <p style="font-size: 28px; font-weight: 800; letter-spacing: 4px; margin: 8px 0 12px">${code}</p>
          <p style="margin:0 0 8px;color:#444">This code expires in <b>5 minutes</b>.</p>
          <p style="margin:12px 0 0;color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p>
          <hr/>
          <p style="font-size: 12px; color: #666">Sent by Yash Roadlines</p>
        </div>
      `

      await sendEmailWithSendGrid(email, subject, text, html)
      // Update rate limit entry on success
      entry.count += 1
      entry.last = now
      rateLimitMap.set(email, entry)
      return json({ ok: true, sent: true })
    }

    // ===== EWB SETTINGS: GET (server-side decryption) =====
    if (action === "ewb_get_settings") {
      const supabase = getSupabaseForRequest(req);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return json({ error: "Unauthorized" }, { status: 401 });
      }
      const uid = authData.user.id;
      const secret = Deno.env.get("EWB_SECRET");
      if (!secret) return serverError("Missing EWB_SECRET");

      const { data, error } = await supabase
        .from("ewb_settings")
        .select("ewb_username_enc, ewb_password_enc, vehicle_from, vehicle_no")
        .eq("id", uid)
        .single();

      if (error) {
        // If row missing, return empty defaults
        return json({ ok: true, settings: { username: "", password: "", vehicle_from: "", vehicle_no: "" } });
      }

      const username = await decryptString((data as any)?.ewb_username_enc || "", secret).catch(() => "");
      const password = await decryptString((data as any)?.ewb_password_enc || "", secret).catch(() => "");
      const vehicle_from = (data as any)?.vehicle_from || "";
      const vehicle_no = ((data as any)?.vehicle_no || "").toUpperCase();

      return json({ ok: true, settings: { username, password, vehicle_from, vehicle_no } });
    }

    // ===== EWB SETTINGS: SAVE (server-side encryption) =====
    if (action === "ewb_save_settings") {
      const supabase = getSupabaseForRequest(req);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return json({ error: "Unauthorized" }, { status: 401 });
      }
      const uid = authData.user.id;
      const secret = Deno.env.get("EWB_SECRET");
      if (!secret) return serverError("Missing EWB_SECRET");

      const username = (body.username || "").toString();
      const password = (body.password || "").toString();
      const vehicle_from = (body.vehicle_from || "").toString();
      const vehicle_no = (body.vehicle_no || "").toString().toUpperCase();

      const ewb_username_enc = await encryptString(username, secret);
      const ewb_password_enc = await encryptString(password, secret);

      const payload = {
        id: uid,
        ewb_username_enc,
        ewb_password_enc,
        vehicle_from: vehicle_from || null,
        vehicle_no: vehicle_no || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("ewb_settings")
        .upsert(payload, { onConflict: "id" });

      if (error) return serverError(error.message || "DB error");

      return json({ ok: true, saved: true });
    }

    return badRequest("Unknown action")
  } catch (err) {
    console.error("Function error:", err)
    return serverError((err as Error).message || "Internal error")
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/quick-processor' \
    --header 'Content-Type: application/json' \
    --data '{"action":"test"}'

*/
