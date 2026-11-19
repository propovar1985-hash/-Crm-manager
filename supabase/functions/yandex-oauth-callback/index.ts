import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://propovar1985-hash.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CLIENT_ID = Deno.env.get("YANDEX_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("YANDEX_CLIENT_SECRET")!;
const ENCRYPTION_KEY = Deno.env.get("YANDEX_TOKEN_ENCRYPTION_KEY")!;
const REDIRECT_URI = "https://zxgkodaeynzcprhnymee.supabase.co/functions/v1/super-handler";
const ROOT_PUBLIC_URL = "https://disk.yandex.ru/d/UXgmsg4woy_67g";

const admin = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function response(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": typeof body === "string" ? "text/html; charset=utf-8" : "application/json", ...extra },
  });
}
async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function b64(bytes: Uint8Array) {
  let s = "";
  bytes.forEach(b => s += String.fromCharCode(b));
  return btoa(s);
}
function unb64(s: string) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function cryptoKey() {
  const hex = ENCRYPTION_KEY.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("YANDEX_TOKEN_ENCRYPTION_KEY должен быть 64-значной HEX-строкой.");
  const raw = new Uint8Array(hex.match(/.{2}/g)!.map(v => parseInt(v, 16)));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(), new TextEncoder().encode(token));
  return b64(new Uint8Array([...iv, ...new Uint8Array(cipher)]));
}
async function decryptToken(value: string) {
  const all = unb64(value);
  const iv = all.slice(0, 12);
  const cipher = all.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await cryptoKey(), cipher);
  return new TextDecoder().decode(plain);
}
async function currentUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Требуется вход в CRM.");
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user) throw new Error("Сессия CRM недействительна.");
  return data.user;
}
async function diskRequest(path: string, token: string, init: RequestInit = {}) {
  return fetch("https://cloud-api.yandex.net/v1/disk" + path, {
    ...init,
    headers: { Authorization: "OAuth " + token, ...(init.headers || {}) },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // OAuth callback: Yandex redirects the browser here with code and state.
  if (req.method === "GET" && url.searchParams.has("code")) {
    try {
      const code = url.searchParams.get("code")!;
      const state = url.searchParams.get("state") || "";
      const stateHash = await sha256(state);
      const { data: pending, error: stateError } = await admin
        .from("yandex_oauth_states").select("*").eq("state_hash", stateHash).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (stateError || !pending) return response("<h2>Ссылка авторизации устарела. Вернитесь в CRM и подключите Диск заново.</h2>", 400);
      const tokenRes = await fetch("https://oauth.yandex.ru/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code", code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error(tokenData.error_description || "Яндекс не выдал токен.");
      const encrypted = await encryptToken(tokenData.access_token);
      const { error: saveError } = await admin.from("yandex_disk_connections").upsert({
        user_id: pending.user_id,
        access_token_ciphertext: encrypted,
        token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        root_folder_path: "disk:/",
        connected_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      await admin.from("yandex_oauth_states").delete().eq("state_hash", stateHash);
      return response("<main style='font:16px Arial;padding:32px'><h2>Яндекс Диск подключён</h2><p>Вернитесь в CRM. Можно закрыть эту вкладку.</p></main>");
    } catch (e) {
      return response("<h2>Не удалось подключить Яндекс Диск</h2><p>" + String(e).replace(/[<>&]/g, "") + "</p>", 500);
    }
  }

  try {
    const user = await currentUser(req);
    if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));

    if (body.action === "authorize") {
      const state = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await admin.from("yandex_oauth_states").insert({
        state_hash: await sha256(state),
        user_id: user.id,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      const authUrl = new URL("https://oauth.yandex.ru/authorize");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("force_confirm", "yes");
      return response({ url: authUrl.toString() });
    }

    if (body.action === "status") {
      const { data } = await admin.from("yandex_disk_connections").select("connected_at,token_expires_at").eq("user_id", user.id).maybeSingle();
      return response({ connected: !!data, connected_at: data?.connected_at ?? null, token_expires_at: data?.token_expires_at ?? null });
    }

    if (body.action === "upload") {
      return response({ error: "Загрузка будет включена после проверки доступа к корневой папке и настройки пути общей папки." }, 409);
    }
    return response({ error: "Неизвестное действие" }, 400);
  } catch (e) {
    return response({ error: String(e) }, 400);
  }
});
