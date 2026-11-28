import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://propovar1985-hash.github.io";
const MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 5_000;
const MAX_TOTAL_CHARS = 16_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Не настроен серверный секрет: ${name}`);
  return value;
}

async function authenticate(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const supabase = createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user;
}

function validateMessages(input: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) {
    throw new Error(`Передайте от 1 до ${MAX_MESSAGES} сообщений.`);
  }

  let total = 0;
  const messages = input.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Некорректный формат сообщения.");
    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;

    if (role !== "user" && role !== "assistant") {
      throw new Error("Допустимы только сообщения пользователя и помощника.");
    }
    if (typeof content !== "string" || !content.trim() || content.length > MAX_MESSAGE_CHARS) {
      throw new Error("Сообщение пустое или слишком длинное.");
    }

    total += content.length;
    return { role, content: content.trim() };
  });

  if (total > MAX_TOTAL_CHARS) throw new Error("История диалога слишком большая.");
  if (messages[messages.length - 1].role !== "user") {
    throw new Error("Последнее сообщение должно быть от пользователя.");
  }
  return messages;
}

const SYSTEM_PROMPT = `
Ты — MASTER AI, русскоязычный помощник мебельного производства «Мастер мебельщик».
Помогай с мебельными проектами, кухнями, шкафами, гардеробными, материалами,
фурнитурой, организацией производства, закупками, клиентским сервисом и работой с CRM.
Отвечай точно, структурированно и по делу. Если данных недостаточно — задай один
уточняющий вопрос. Не выдумывай цены, размеры, наличие материалов, статусы заказов
или сведения о клиентах.
На текущем этапе у тебя НЕТ доступа к базе CRM, заказам, клиентам или файлам.
Не утверждай, что проверил или изменил данные CRM. Не проси присылать пароли,
API-ключи, токены, платёжные реквизиты или лишние персональные данные.
Расчёты раскроя, кромки, себестоимости и размеров должны выполняться проверенными
расчётными алгоритмами; не выдавай приблизительные догадки за точный производственный расчёт.
`.trim();

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) {
    return json({ error: "Origin не разрешён." }, 403);
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Метод не поддерживается." }, 405);

  try {
    const user = await authenticate(req);
    if (!user) return json({ error: "Сессия CRM недействительна. Войдите в CRM заново." }, 401);

    const contentLength = Number(req.headers.get("Content-Length") || "0");
    if (contentLength > 40_000) return json({ error: "Запрос слишком большой." }, 413);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || (body as Record<string, unknown>).action !== "chat") {
      return json({ error: "Неизвестная команда." }, 400);
    }

    const messages = validateMessages((body as Record<string, unknown>).messages);
    const accountId = getRequiredEnv("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = getRequiredEnv("CLOUDFLARE_API_TOKEN");

    const upstream = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          max_tokens: 1_000,
          temperature: 0.25,
        }),
        signal: AbortSignal.timeout(90_000),
      },
    );

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      // No paid provider fallback: free-quota/capacity errors are returned to the UI.
      const status = upstream.status === 429 ? 429 : 502;
      return json({
        error: status === 429
          ? "Бесплатный лимит AI временно исчерпан. Попробуйте позже."
          : "Облачный AI временно недоступен. Проверьте настройки Cloudflare или повторите позже.",
      }, status);
    }

    const reply = result?.result?.response;
    if (typeof reply !== "string" || !reply.trim()) {
      return json({ error: "AI вернул пустой или неподдерживаемый ответ." }, 502);
    }

    return json({ reply: reply.trim(), model: MODEL });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Внутренняя ошибка.";
    const safeMessage = /Не настроен серверный секрет|Передайте от|Некорректный|Допустимы|Сообщение|История диалога|Последнее сообщение/.test(message)
      ? message
      : "Не удалось обработать запрос. Повторите попытку позже.";
    return json({ error: safeMessage }, 500);
  }
});
