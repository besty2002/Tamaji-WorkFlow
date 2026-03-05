import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// HTML Escape 함수: 보안을 위해 사용자 입력을 이스케이프 처리합니다.
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
    // 1. 필수 환경 변수 확인
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const MAIL_FROM = Deno.env.get("MAIL_FROM") || "Tamaji WorkFlow <noreply@tamaji.jp>";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://tamaji-workflow.pages.dev";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY)");
    }

    // 2. Webhook Secret 인증 (X-Webhook-Secret 헤더 사용)
    // Supabase Webhook은 자체 Authorization 헤더를 주입하므로 커스텀 헤더를 사용해야 합니다.
    const expected = Deno.env.get("WEBHOOK_SECRET") ?? "";
    const webhookSecret = req.headers.get("x-webhook-secret") ?? "";

    if (!expected || webhookSecret !== expected) {
      console.error("Unauthorized access attempt.", {
        received: webhookSecret ? "PRESENT (hidden)" : "MISSING",
        expected: expected ? "SET (hidden)" : "NOT SET"
      });

      return new Response(
        JSON.stringify({ code: 401, message: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 3. Payload 파싱 및 유효성 검사
    const payload = await req.json();
    const { type, table, record } = payload;

    // notifications 테이블의 INSERT 이벤트인 경우만 처리
    if (type !== "INSERT" || table !== "notifications") {
      return new Response(JSON.stringify({ message: "Ignored: Only processing INSERT on notifications" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id, user_id, title, body, url, is_email_sent } = record;

    // Idempotency check: if email already sent, ignore
    if (is_email_sent) {
      return new Response(JSON.stringify({ message: "Email already sent, skipping." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Supabase Admin Client를 사용하여 유저 이메일 조회 (service_role 사용)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      console.warn(`User ${user_id} email not found or lookup failed:`, profileError);
      return new Response(JSON.stringify({ message: "No email found, skipping." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. 이메일 템플릿 구성
    const actionUrl = url ? `${APP_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}` : APP_BASE_URL;
    const escapedTitle = escapeHtml(title || "새 알림");
    const escapedBody = escapeHtml(body || "");
    const userName = profile.display_name || "User";

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
            <p>안녕하세요 ${userName}님,</p>
            <div class="body">${escapedBody}</div>
            <div style="text-align: center;">
              <a href="${actionUrl}" class="button">View Details</a>
            </div>
          </div>
          <div class="footer">
            &copy; 2026 Tamaji WorkFlow. This is an automated message.
          </div>
        </div>
      </body>
      </html>
    `;

    // 6. Resend API로 발송
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
      const errorText = await res.text();
      console.error("Resend error:", errorText);
      return new Response(JSON.stringify({ error: "Resend failed" }), { status: 500 });
    }

    // 7. Update notification record: is_email_sent = true, sent_at = now()
    await supabaseAdmin
      .from("notifications")
      .update({ is_email_sent: true, sent_at: new Date().toISOString() })
      .eq("id", id);

    console.log(`Email sent successfully to ${profile.email} and record updated.`);
    return new Response(JSON.stringify({ message: "Success" }), { status: 200 });

  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

/**
 * [배포 및 설정 가이드]
 * 
 * 1. Supabase Secrets 설정:
 *    npx supabase secrets set WEBHOOK_SECRET="tamaji_webhook_secret_2026"
 *    npx supabase secrets set RESEND_API_KEY="re_..."
 * 
 * 2. Database Webhook (HTTP Request) 설정:
 *    - URL: https://<PROJECT_REF>.functions.supabase.co/send-notification-email
 *    - HTTP Header:
 *        Key: X-Webhook-Secret
 *        Value: tamaji_webhook_secret_2026
 * 
 * 3. 배포:
 *    npx supabase functions deploy send-notification-email
 */
