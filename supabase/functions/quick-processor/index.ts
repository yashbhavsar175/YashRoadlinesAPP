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
  // Push fields
  token?: string
  platform?: 'android' | 'ios' | 'web' | 'unknown'
  title?: string
  body?: string
  data?: Record<string, unknown>
  target_email?: string
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

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // Allow multiple possible secret names because some Supabase UIs disallow keys starting with SUPABASE_
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_KEY") ||
    Deno.env.get("SERVICE_KEY");
  if (!serviceKey) throw new Error("Missing service role key (set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY)");
  return createClient(supabaseUrl, serviceKey);
}

async function importAesKey(secret: string): Promise<any> {
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
    body = await req.json() as JsonBody
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

    // ===== PUSH: REGISTER DEVICE TOKEN =====
    if (action === 'register_token') {
      const supabase = getSupabaseForRequest(req);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
      }
      const user = authData.user;
      const token = (body.token || '').toString();
      const platform = ((body.platform as string) || 'unknown').toString();
      if (!token) return badRequest('Missing token');

      const svc = getServiceClient();
      
      // First, delete any old tokens for this user to ensure one user = one token
      // This prevents accumulation of stale tokens when FCM refreshes
      try {
        const { error: deleteError } = await svc
          .from('device_tokens')
          .delete()
          .eq('user_id', user.id)
          .neq('token', token); // Don't delete the token we're about to insert
        
        if (deleteError) {
          console.warn('⚠️ Failed to delete old tokens:', deleteError);
          // Continue anyway - upsert will still work
        } else {
          console.log('🧹 Cleaned up old tokens for user:', user.id);
        }
      } catch (cleanupErr) {
        console.warn('⚠️ Error during old token cleanup:', cleanupErr);
        // Continue anyway
      }
      
      // Now insert/update the new token
      const payload = {
        token,
        user_id: user.id,
        email: (user.email || '').toLowerCase(),
        platform,
        updated_at: new Date().toISOString(),
      } as const;
      const { error } = await svc.from('device_tokens').upsert(payload, { onConflict: 'token' });
      if (error) return serverError(error.message || 'DB error');
      
      console.log('✅ Token registered successfully for user:', user.id);
      return json({ ok: true, message: 'Token registered and old tokens cleaned up' });
    }

    // ===== PUSH: SEND NOTIFICATION TO ADMIN VIA FCM =====
    if (action === 'send_push') {
      console.log('📱 [FCM] Starting push notification send...');
      // Accept multiple secret names to be flexible with dashboard naming
      const serverKey = Deno.env.get('FCM_SERVER_KEY') || Deno.env.get('FCM_SERVER') || Deno.env.get('FIREBASE_SERVER_KEY');
      const saJsonRaw =
        Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') ||
        Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY') ||  // also accept the name from the prompt
        Deno.env.get('FIREBASE_SA_JSON') ||
        Deno.env.get('FIREBASE_SA');
      
      console.log('🔍 [FCM] Checking secrets:', {
        hasServerKey: !!serverKey,
        hasServiceAccount: !!saJsonRaw,
      });

      // If neither credential is present, return a clear 200 with a reason instead of 500
      // so the client-side warning is not triggered for a config issue
      if (!serverKey && !saJsonRaw) {
        console.error('❌ [FCM] No FCM credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON in Supabase Dashboard → Project Settings → Edge Functions → Secrets');
        return json({ ok: false, reason: 'no-credentials', message: 'FIREBASE_SERVICE_ACCOUNT_JSON secret not set in Supabase dashboard' }, { status: 200 });
      }
      function base64url(input: Uint8Array | string) {
        let str = typeof input === 'string' ? input : String.fromCharCode(...input);
        // if binary, convert
        if (typeof input !== 'string') {
          str = '';
          const arr = input as Uint8Array;
          for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
        }
        // btoa expects binary string
        // deno-lint-ignore no-deprecated-deno-api
        const b64 = btoa(str);
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      // Convert PEM private key to ArrayBuffer
      function pemToArrayBuffer(pem: string) {
        // remove header/footer and newlines
        const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
          .replace(/-----END PRIVATE KEY-----/, '')
          .replace(/\s+/g, '');
        const raw = atob(b64);
        const buf = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) buf[i] = raw.charCodeAt(i);
        return buf.buffer;
      }

      async function importPrivateKey(pem: string) {
        const keyBuf = pemToArrayBuffer(pem);
        return await crypto.subtle.importKey(
          'pkcs8',
          keyBuf,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign']
        );
      }

      async function signJwt(payloadObj: Record<string, unknown>, privateKeyPem: string) {
        const header = { alg: 'RS256', typ: 'JWT' };
        const headerB64 = base64url(JSON.stringify(header));
        const payloadB64 = base64url(JSON.stringify(payloadObj));
        const toSign = `${headerB64}.${payloadB64}`;
        const key = await importPrivateKey(privateKeyPem);
        const enc = new TextEncoder().encode(toSign);
        const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, enc);
        // base64url encode signature
        const sigArr = new Uint8Array(sig as ArrayBuffer);
        return `${toSign}.${base64url(sigArr)}`;
      }

      async function getAccessTokenFromServiceAccount(sa: any) {
        const now = Math.floor(Date.now() / 1000);
        const iat = now;
        const exp = now + 3600; // 1 hour
        const scope = 'https://www.googleapis.com/auth/firebase.messaging';
        const payload = {
          iss: sa.client_email,
          scope,
          aud: 'https://oauth2.googleapis.com/token',
          exp,
          iat,
        } as Record<string, unknown>;
        const signedJwt = await signJwt(payload, sa.private_key);
        const form = new URLSearchParams();
        form.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        form.append('assertion', signedJwt);
        const tRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        if (!tRes.ok) {
          const txt = await tRes.text().catch(() => '');
          throw new Error(`Token exchange failed ${tRes.status}: ${txt}`);
        }
  const tokenJson = await tRes.json() as any;
  return tokenJson.access_token as string;
      }

      // Helper: base64url
      const svc = getServiceClient();
      
      // Get all admin users' device tokens
      console.log('🔍 [FCM] Fetching admin device tokens...');
      const { data: adminProfiles, error: adminErr } = await svc
        .from('user_profiles')
        .select('id')
        .eq('is_admin', true);
      
      if (adminErr) {
        console.error('❌ [FCM] Error fetching admin profiles:', adminErr);
        return serverError(adminErr.message || 'DB error');
      }
      
      if (!adminProfiles || adminProfiles.length === 0) {
        console.warn('⚠️ [FCM] No admin users found');
        return json({ ok: false, reason: 'no-admins' });
      }
      
      const adminIds = adminProfiles.map((p: any) => p.id);
      console.log(`👥 [FCM] Found ${adminIds.length} admin user(s)`);
      
      const { data: tokens, error: tErr } = await svc
        .from('device_tokens')
        .select('token')
        .in('user_id', adminIds)
        .limit(200);
      
      if (tErr) {
        console.error('❌ [FCM] Database error:', tErr);
        return serverError(tErr.message || 'DB error');
      }
      const registrationTokens = (tokens || []).map((t: any) => t.token).filter(Boolean);
      console.log(`📱 [FCM] Found ${registrationTokens.length} device token(s)`);
      if (!registrationTokens.length) {
        console.warn('⚠️ [FCM] No device tokens found for admin users');
        return json({ ok: false, reason: 'no-tokens' });
      }

      const title = (body.title || '').toString();
      // ✅ Accept both 'body' and 'message' fields for flexibility
      const message = (body.body || body.message || '').toString();
      const data = (body.data || {}) as Record<string, unknown>;
      
      console.log('📝 [FCM] Notification content:', {
        title,
        messageLength: message.length,
        messagePreview: message.substring(0, 100),
      });

      const payload = {
        registration_ids: registrationTokens,
        priority: 'high',
        notification: { title, body: message, sound: 'default' },
        data,
      };

      // If service account JSON provided, use HTTP v1 for FCM (more secure)
      if (saJsonRaw) {
        console.log('🔑 Using Firebase Service Account for FCM V1 API');
        let sa: any;
        try {
          sa = JSON.parse(saJsonRaw);
        } catch (e) {
          console.error('❌ Failed to parse service account JSON:', e);
          return serverError(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${(e as Error).message}`);
        }
        const projectId = sa.project_id;
        if (!projectId) {
          console.error('❌ Service account JSON missing project_id');
          return serverError('Service account JSON missing project_id');
        }
        console.log(`✅ Project ID: ${projectId}`);

        // get access token
        let accessToken: string;
        try {
          console.log('🔐 Getting OAuth2 access token...');
          accessToken = await getAccessTokenFromServiceAccount(sa);
          console.log('✅ Access token obtained');
        } catch (e) {
          console.error('❌ Failed to get access token:', e);
          return serverError(`Failed to get access token: ${(e as Error).message}`);
        }

        const results: any[] = [];
        const invalidTokens: string[] = [];
        console.log(`📤 Sending to ${registrationTokens.length} device(s)`);
        
        for (const reg of registrationTokens) {
          const msg = {
            message: {
              token: reg,
              notification: { 
                title: title || '', 
                body: message || ''  // ✅ This is the notification body that shows in system tray
              },
              data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
              android: {
                priority: 'high' as const,
                notification: {
                  channel_id: 'admin-notifications',  // ✅ Fixed: Use admin channel, not user
                  sound: 'default',
                  // ✅ Android-specific notification styling
                  title: title || '',
                  body: message || '',
                  priority: 'high' as const,
                  visibility: 'public' as const,
                },
              },
            },
          };
          try {
            const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(msg),
            });
            const bodyText = await res.text().catch(() => '');
            
            if (res.ok) {
              console.log(`✅ Notification sent successfully to device`);
              results.push({ status: res.status, body: bodyText, ok: res.ok, token: reg });
            } else {
              console.error(`❌ FCM error ${res.status}:`, bodyText);
              
              // Parse error response to check for UNREGISTERED tokens
              try {
                const errorData = JSON.parse(bodyText);
                const errorCode = errorData?.error?.details?.[0]?.errorCode || errorData?.error?.status;
                
                // FCM V1 API error codes for invalid tokens:
                // - UNREGISTERED: Token is no longer valid
                // - INVALID_ARGUMENT: Token format is invalid
                // - NOT_FOUND: Token not found (404)
                if (
                  errorCode === 'UNREGISTERED' || 
                  errorCode === 'INVALID_ARGUMENT' ||
                  res.status === 404 ||
                  bodyText.includes('UNREGISTERED') ||
                  bodyText.includes('not a valid FCM registration token')
                ) {
                  console.warn(`🗑️ Invalid token detected, marking for deletion: ${reg.substring(0, 20)}...`);
                  invalidTokens.push(reg);
                }
              } catch (parseErr) {
                // If we can't parse the error, check status code
                if (res.status === 404) {
                  console.warn(`🗑️ 404 error, marking token for deletion: ${reg.substring(0, 20)}...`);
                  invalidTokens.push(reg);
                }
              }
              
              results.push({ status: res.status, body: bodyText, ok: res.ok, token: reg });
            }
          } catch (e) {
            console.error('❌ Failed to send to device:', e);
            results.push({ error: (e as Error).message, ok: false, token: reg });
          }
        }
        
        // Clean up invalid tokens from database
        if (invalidTokens.length > 0) {
          console.log(`🧹 Cleaning up ${invalidTokens.length} invalid token(s)...`);
          try {
            const { error: deleteError } = await svc
              .from('device_tokens')
              .delete()
              .in('token', invalidTokens);
            
            if (deleteError) {
              console.error('❌ Failed to delete invalid tokens:', deleteError);
            } else {
              console.log(`✅ Successfully deleted ${invalidTokens.length} invalid token(s)`);
            }
          } catch (cleanupErr) {
            console.error('❌ Error during token cleanup:', cleanupErr);
          }
        }
        
        return json({ 
          ok: true, 
          results,
          summary: {
            total: registrationTokens.length,
            successful: results.filter(r => r.ok).length,
            failed: results.filter(r => !r.ok).length,
            invalidTokensRemoved: invalidTokens.length
          }
        });
      }

      // Fallback: legacy server key path (if provided)
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) return serverError(`FCM ${res.status}: ${text}`);
      return json({ ok: true, fcm: text });
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
