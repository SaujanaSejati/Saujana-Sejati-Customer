import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-saujana-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("SAUJANA_PUSH_WEBHOOK_SECRET");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@saujanasejati.com";

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret || !vapidPublic || !vapidPrivate) {
    return json({ error: "Push server configuration incomplete" }, 500);
  }

  const suppliedSecret = req.headers.get("x-saujana-webhook-secret") || "";
  if (suppliedSecret !== webhookSecret) return json({ error: "Unauthorized" }, 401);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (payload.type !== "INSERT" || payload.table !== "bookings" || !payload.record) {
    return json({ ignored: true });
  }

  const booking = payload.record as Record<string, unknown>;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (booking.id) {
    const { data: existing } = await supabase
      .from("web_push_subscriptions").select("id")
      .eq("endpoint", String((payload.subscription as Record<string, unknown> | undefined)?.endpoint || ""))
      .limit(1);
    // No-op: the booking trigger is the only public event source; send to all enrolled devices below.
    void existing;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const { data: subscriptions, error } = await supabase
    .from("web_push_subscriptions").select("id, endpoint, subscription, recipient_label");
  if (error) return json({ error: "Could not load push subscriptions" }, 500);
  if (!subscriptions?.length) return json({ sent: 0, message: "No devices enrolled yet" });

  const title = "Booking baharu — Saujana Sejati Ent";
  const customer = String(booking.customer_name || "Pelanggan");
  const cabinet = String(booking.cabinet_type || "Kabinet");
  const date = String(booking.booking_date || "");
  const time = String(booking.booking_time || "");
  const body = `${customer} • ${cabinet}${date ? " • " + date : ""}${time ? " " + time : ""}. Buka dashboard untuk butiran.`;
  const message = JSON.stringify({
    title,
    body,
    tag: `booking-${String(booking.id || Date.now())}`,
    url: "/Saujana-Sejati-Customer/"
  });

  let sent = 0;
  const expired: string[] = [];
  const results = await Promise.allSettled(subscriptions.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, message, { TTL: 60 * 60 });
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) expired.push(row.id);
      else console.error("Push delivery failed for", row.recipient_label, statusCode);
    }
  }));

  if (expired.length) {
    await supabase.from("web_push_subscriptions").delete().in("id", expired);
  }
  return json({ sent, expiredRemoved: expired.length, attempted: results.length });
});
