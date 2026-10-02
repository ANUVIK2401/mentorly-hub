/**
 * Outbound email seam. Callers build a Mail and hand it to sendSafely(); the transport behind
 * getMailer() can change (console now, a provider later) without touching them.
 *
 * Privacy: never log a recipient address or message body in production. sendSafely() swallows and
 * logs transport errors without PII, so a mail outage can never fail an application.
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/**
 * Placeholder transport. Logs only that a message was skipped. Set MAIL_DEBUG=1 locally to print the
 * full message (recipient and body) so you can click the status link; never set it on a deployment.
 */
export const consoleMailer: Mailer = {
  async send(mail) {
    if (process.env.MAIL_DEBUG === "1" && process.env.NODE_ENV !== "production") {
      console.info(`[mail] to=${mail.to}\nsubject: ${mail.subject}\n\n${mail.text}`);
      return;
    }
    console.warn("[mail] no mail provider configured; message not sent");
  },
};

// ponytail: console only. Add a provider (e.g. Resend) here, chosen by an env var, when one is approved.
export function getMailer(): Mailer {
  return consoleMailer;
}

export async function sendSafely(mail: Mail, mailer: Mailer = getMailer()): Promise<void> {
  try {
    await mailer.send(mail);
  } catch (error) {
    console.error("[mail] send failed", error instanceof Error ? error.message : "unknown error");
  }
}

/** Absolute site origin for links in emails. */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function applicationReceivedMail(args: {
  to: string;
  name: string;
  projectTitle: string;
  applicationId: string;
}): Mail {
  const link = `${siteUrl()}/application/${args.applicationId}`;
  return {
    to: args.to,
    subject: `We received your application: ${args.projectTitle}`,
    text:
      `Hi ${args.name},\n\n` +
      `Thanks for applying to "${args.projectTitle}". We have your application and will be in touch.\n\n` +
      `You can check its status any time at this private link (anyone with the link can see it, so keep it to yourself):\n${link}\n`,
  };
}
