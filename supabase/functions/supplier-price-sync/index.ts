import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const cors = {
  "Access-Control-Allow-Origin": "https://propovar1985-hash.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const SOURCES: Record<string, { url: string; kind: string; discount: number }> = {
  "ginis.ru": { url: "https://ginis.ru/catalog/", kind: "html", discount: 30 },
  "amix.biz": { url: "https://amix.biz/excel/amix/price.xls", kind: "xls", discount: 30 },
  "smart812.ru": { url: "https://smart812.ru/catalog/furnitura_mebelnaya/", kind: "html", discount: 30 },
  "tdserver.ru": { url: "https://www.tdserver.ru/catalog/laminirovannoe_dsp/ldsp_egger_egger/?items_count=96", kind: "html", discount: 0 },
};
const reply = (data: unknown, status=200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const clean = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
function fromJsonLd(html: string, sourceUrl: string) {
  const out: any[] = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      const walk = (x: any) => {
        if (!x) return;
        if (Array.isArray(x)) return x.forEach(walk);
        if (x["@graph"]) walk(x["@graph"]);
        const type = Array.isArray(x["@type"]) ? x["@type"] : [x["@type"]];
        if (type.includes("Product")) {
          const offers = Array.isArray(x.offers) ? x.offers[0] : x.offers;
          const price = num(offers?.price ?? offers?.lowPrice);
          if (price && x.name) out.push({ sku: x.sku ?? x.mpn ?? x.productID ?? null, name: clean(x.name), source_price: price, unit: "шт.", availability: offers?.availability ?? null, product_url: offers?.url ?? sourceUrl, raw_data: x });
        }
        walk(x.itemListElement);
      };
      walk(parsed);
    } catch { /* пропускаем некорректный JSON-LD */ }
  }
  return out;
}
function parseHtml(html: string, url: string) {
  const products = fromJsonLd(html, url);
  if (products.length) return products;
  // Не импортируем цены из произвольного текста страницы: только явные товарные блоки schema.org.
  const blocks = [...html.matchAll(/<(?:div|li|article)[^>]*(?:itemtype=["'][^"']*Product|class=["'][^"']*(?:product-item|product-card|catalog-item)[^"']*)[^>]*>([\s\S]*?)<\/(?:div|li|article)>/gi)];
  for (const b of blocks) {
    const chunk = b[1];
    const name = clean(chunk.match(/(?:itemprop=["']name["'][^>]*>|class=["'][^"']*name[^"']*["'][^>]*>)([\s\S]*?)<\//i)?.[1]);
    const priceRaw = chunk.match(/(?:itemprop=["']price["'][^>]*content=["']([^"']+)|(?:price|стоимость)[^>]*>\s*([\d\s]+(?:[.,]\d{1,2})?))/i);
    const price = num(priceRaw?.[1] ?? priceRaw?.[2]);
    const sku = clean(chunk.match(/(?:Артикул|Код)\s*:?\s*([^<\s]+)/i)?.[1]);
    if (name && price) products.push({ sku: sku || null, name, source_price: price, unit: "шт.", product_url: url, raw_data: { parser: "product-card" } });
  }
  return products;
}
function parseAmix(buffer: ArrayBuffer) {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const out: any[] = [];
  for (const sheet of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheet], { header: 1, raw: true, defval: "" });
    let header: string[] = [];
    for (const row of rows) {
      const cells = row.map((v: any) => clean(v));
      if (cells.some((v: string) => /артикул|наименование|название/i.test(v)) && cells.some((v: string) => /цена|рознич|стоимость/i.test(v))) { header = cells; continue; }
      if (!header.length) continue;
      const idx = (re: RegExp) => header.findIndex(h => re.test(h));
      const ni = idx(/наименование|название|товар/i), si = idx(/артикул|код/i), pi = idx(/цена|рознич|стоимость/i), ui = idx(/ед\.?\s*изм|единиц/i);
      const name = clean(row[ni]), price = num(row[pi]);
      if (name && price) out.push({ sku: si >= 0 ? clean(row[si]) : null, name, source_price: price, unit: ui >= 0 ? clean(row[ui]) : "шт.", raw_data: { sheet, row: cells } });
    }
  }
  return out;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "Требуется вход в CRM." }, 401);
    const body = await req.json();
    const supplierId = String(body.supplier_id || "");
    const { data: supplier, error: supplierError } = await admin.from("crm_suppliers").select("*").eq("id", supplierId).single();
    if (supplierError || !supplier) return reply({ error: "Поставщик не найден." }, 404);
    const host = new URL(supplier.website_url).hostname.replace(/^www\./, "");
    const config = SOURCES[host];
    if (!config) return reply({ error: "Для этого поставщика ещё не настроен проверенный источник автоматической загрузки." }, 422);
    const started = new Date().toISOString();
    let rows: any[] = [];
    let sourceDate: string | null = null;
    const res = await fetch(config.url, { headers: { "User-Agent": "Mozilla/5.0 CRM Supplier Price Sync" }, redirect: "follow" });
    if (!res.ok) throw new Error("Сайт поставщика вернул HTTP " + res.status);
    if (config.kind === "xls") {
      rows = parseAmix(await res.arrayBuffer());
    } else {
      const html = await res.text();
      rows = parseHtml(html, config.url);
      const dateMatch = html.match(/Дата и время обновления цен[^<]*<[^>]*>\s*([^<]+)/i);
      sourceDate = dateMatch?.[1] ? clean(dateMatch[1]) : null;
    }
    if (!rows.length) throw new Error("Источник доступен, но не удалось надёжно распознать товарные строки с ценами. Ничего не записано.");
    const discount = config.discount;
    const records = rows.map((p: any) => ({
      supplier_id: supplier.id,
      external_id: p.sku || p.product_url || p.name,
      sku: p.sku,
      name: p.name,
      category: supplier.category,
      unit: p.unit || "шт.",
      source_price: p.source_price,
      discount_percent: discount,
      price: Math.round(p.source_price * (1 - discount / 100) * 100) / 100,
      currency: "RUB",
      availability: p.availability || null,
      product_url: p.product_url || config.url,
      source_url: config.url,
      source_updated_at: sourceDate ? new Date(sourceDate).toISOString() : null,
      synced_at: new Date().toISOString(),
      is_active: true,
      raw_data: p.raw_data || {},
    }));
    const { error: upsertError } = await admin.from("crm_supplier_products").upsert(records, { onConflict: "supplier_id,external_id" });
    if (upsertError) throw upsertError;
    const { error: logError } = await admin.from("crm_supplier_sync_log").insert({
      supplier_id: supplier.id, supplier_name: supplier.name, status: "success", products_found: records.length,
      message: "Импортировано " + records.length + " позиций. Скидка " + discount + "%."
    });
    if (logError) console.error(logError);
    return reply({ ok: true, supplier: supplier.name, count: records.length, discount_percent: discount, source_url: config.url, source_updated_at: sourceDate, synced_at: new Date().toISOString() });
  } catch (e) {
    return reply({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
