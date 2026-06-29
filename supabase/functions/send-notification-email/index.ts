import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const logInfo = (message: string, context: Record<string, unknown> = {}) => {
  console.info(JSON.stringify({ level: "info", message, ...context }));
};

const logError = (message: string, context: Record<string, unknown> = {}) => {
  console.error(JSON.stringify({ level: "error", message, ...context }));
};

const getErrorName = (error: unknown) => error instanceof Error ? error.name : "UnknownError";

// Escape user-controlled content before rendering it in the email template.
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const MAIL_FROM = Deno.env.get("MAIL_FROM") || "Tamaji WorkFlow <noreply@tamaji.jp>";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://tamaji-workflow.pages.dev";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY)");
    }

    const expected = Deno.env.get("WEBHOOK_SECRET") ?? "";
    const webhookSecret = req.headers.get("x-webhook-secret") ?? "";

    if (!expected || webhookSecret !== expected) {
      logError("Unauthorized webhook request", {
        received: webhookSecret ? "PRESENT (hidden)" : "MISSING",
        expected: expected ? "SET (hidden)" : "NOT SET",
      });

      return jsonResponse({ code: 401, message: "Unauthorized" }, 401);
    }

    const payload = await req.json();
    const { type, table, record } = payload;

    if (type !== "INSERT" || table !== "notifications") {
      return jsonResponse({ message: "Ignored: Only processing INSERT on notifications" });
    }

    const { id, user_id, title, body, url, is_email_sent } = record;

    // Idempotency check: if email already sent, ignore
    if (is_email_sent) {
      return jsonResponse({ message: "Email already sent, skipping." });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      logInfo("Notification email skipped because recipient email was not found", {
        notificationId: id,
        errorName: getErrorName(profileError),
      });
      return jsonResponse({ message: "No email found, skipping." });
    }

    const actionUrl = url ? `${APP_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}` : APP_BASE_URL;
    const escapedTitle = escapeHtml(title || "通知が届いています");
    const escapedBody = escapeHtml(body || "");
    const userName = escapeHtml(profile.display_name || "ユーザー");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #f4f4f4; padding-bottom: 10px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #000; text-decoration: none; }
          .content { background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #eee; }
          .title { font-size: 18px; font-weight: 600; margin-bottom: 15px; }
          .body { color: #555; white-space: pre-wrap; margin-bottom: 25px; }
          .button { display: inline-block; background-color: #000; color: #fff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">Tamaji WorkFlow</span>
          </div>
          <div class="content">
            <div class="title">${escapedTitle}</div>
            <p>${userName}さん、通知が届いています。</p>
            <div class="body">${escapedBody}</div>
            <div style="text-align: center;">
              <a href="${actionUrl}" class="button">詳細を確認する</a>
            </div>
          </div>
          <div class="footer">
            &copy; 2026 Tamaji WorkFlow. このメールは自動送信されています。
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: profile.email,
        subject: `[Tamaji] ${title}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      logError("Resend email request failed", {
        notificationId: id,
        status: res.status,
      });
      return jsonResponse({ error: "Email delivery failed" }, 500);
    }

    await supabaseAdmin
      .from("notifications")
      .update({ is_email_sent: true, sent_at: new Date().toISOString() })
      .eq("id", id);

    logInfo("Notification email sent", { notificationId: id });
    return jsonResponse({ message: "Success" });

  } catch (error) {
    logError("Notification email function failed", { errorName: getErrorName(error) });
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

/**
 * Deployment:
 * 1. Set secrets:
 *    npx supabase secrets set WEBHOOK_SECRET="..."
 *    npx supabase secrets set RESEND_API_KEY="re_..."
 * 2. Configure a database webhook with X-Webhook-Secret.
 * 3. Deploy:
 *    npx supabase functions deploy send-notification-email
 */
