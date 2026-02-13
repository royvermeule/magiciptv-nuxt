import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const { smtpHost, smtpPort, smtpFrom } = useRuntimeConfig();

  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
  });

  await transport.sendMail({
    from: smtpFrom,
    to,
    subject,
    html,
  });
}
