import nodemailer from "nodemailer";

export interface TeamInvitationEmailPayload {
  toEmail: string;
  teamName: string;
  eventTitle: string;
  roleTitle?: string | null;
  roleSkills?: string[];
  senderName: string;
  inviteId: string;
  teamId: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  public static async sendTeamInvitationEmail(
    payload: TeamInvitationEmailPayload
  ): Promise<{ success: boolean; messageId?: string; mode: "smtp" | "console_preview" }> {
    const {
      toEmail,
      teamName,
      eventTitle,
      roleTitle,
      roleSkills = [],
      senderName,
      inviteId,
      teamId,
    } = payload;

    const frontendUrl = process.env.APP_FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendUrl}/team/${teamId}?inviteId=${inviteId}`;
    const fromAddress =
      process.env.EMAIL_FROM || '"SquadUp Platform" <notifications@squadup.dev>';

    const subject = `🎯 You've been invited to join ${teamName} on SquadUp!`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; width: 40px; height: 40px; line-height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 10px; font-weight: 800; font-size: 20px; margin-bottom: 12px;">S</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Squad<span style="color: #93c5fd;">Up</span></h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Teammate Invitation</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; line-height: 1.5; margin-top: 0;">
        Hello,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        <strong>${senderName}</strong> has invited you to join their squad <strong>${teamName}</strong> for the upcoming event <strong>${eventTitle}</strong>.
      </p>

      ${
        roleTitle
          ? `
      <!-- Role Card -->
      <div style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">
          Designated Position
        </div>
        <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
          ${roleTitle}
        </div>
        ${
          roleSkills.length > 0
            ? `
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px;">
          Required Technologies
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${roleSkills
            .map(
              (skill) =>
                `<span style="display: inline-block; font-size: 11px; font-weight: 600; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 6px; margin-right: 4px; margin-bottom: 4px;">${skill}</span>`
            )
            .join("")}
        </div>
        `
            : ""
        }
      </div>
      `
          : ""
      }

      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0;">
        Click below to review the squad dossier, match analysis, and accept the invitation:
      </p>

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          Review & Accept Invitation →
        </a>
      </div>

      <p style="font-size: 11px; color: #94a3b8; line-height: 1.4; word-break: break-all; margin-bottom: 0;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      This email was sent by SquadUp on behalf of ${senderName}. If you did not expect this invite, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
    `;

    const transporter = this.getTransporter();

    if (!transporter) {
      console.log(
        `\n📧 [EMAIL SERVICE - CONSOLE PREVIEW] SMTP not configured. To enable real delivery, set SMTP_HOST, SMTP_USER, SMTP_PASS in .env`
      );
      console.log(`To: ${toEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Invite Link: ${inviteLink}\n`);
      return { success: true, mode: "console_preview" };
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      console.log(`[EmailService] Invitation email dispatched to ${toEmail} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, mode: "smtp" };
    } catch (err) {
      console.error(`[EmailService] Error sending email to ${toEmail}:`, err);
      throw err;
    }
  }
}
