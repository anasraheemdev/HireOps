/**
 * Lightweight HTML email chrome for transactional messages.
 * Wire into your mail provider when sending invites / notifications.
 */
import { BRAND } from "@/lib/brand";

export function wrapEmailHtml(bodyHtml: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:#0a0e16;color:#e8eef7;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0e16;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121821;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <img src="${BRAND.siteUrl}/logo-256.png" alt="${BRAND.name}" width="40" height="40" style="display:block;border-radius:8px;" />
              <div style="margin-top:12px;font-size:18px;font-weight:600;">${BRAND.name}</div>
              <div style="margin-top:4px;font-size:12px;color:#94a3b8;">${BRAND.tagline}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:14px;line-height:1.6;color:#e2e8f0;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#64748b;">
              ${BRAND.copyrightFull}<br/>
              <a href="${BRAND.siteUrl}" style="color:#60a5fa;text-decoration:none;">Open HireOps</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
