import nodemailer from "nodemailer";

export async function sendWelcomeEmail(email: string, username: string, tempPassword: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "no-reply@pathways-toc.org";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const loginUrl = `${appUrl}/login`;

  const subject = "Welcome to Pathways - Your Account Credentials";
  const text = `Hello,

An account has been created for you on Pathways.

Here are your temporary login credentials:
Username: ${username}
Temporary Password: ${tempPassword}

Please log in and change your password using the link below:
${loginUrl}

Best regards,
The Pathways Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-bottom: 20px;">Welcome to Pathways</h2>
      <p>Hello,</p>
      <p>An account has been created for you on the Pathways Theory of Change platform.</p>
      <p>Here are your temporary login credentials:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Username:</strong> <code style="font-size: 1.1em; color: #1f2937;">${username}</code></p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="font-size: 1.1em; color: #1f2937;">${tempPassword}</code></p>
      </div>
      <p style="margin-bottom: 30px;">You will be prompted to change your password immediately upon your first login.</p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In to Pathways</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 0.875rem; color: #6b7280; text-align: center;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  `;

  if (host && user && pass) {
    // Real SMTP configuration (e.g. Brevo)
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for port 465, false for other ports
      auth: {
        user,
        pass,
      },
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000,   // 5 seconds
      socketTimeout: 10000,    // 10 seconds
    });

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL] Welcome email sent to ${email} via SMTP.`);
  } else {
    // Local fallback/mock: print to the console
    console.log("\n========================================================");
    console.log("[MOCK EMAIL] SMTP settings not configured. Printing email:");
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Username: ${username}`);
    console.log(`Temporary Password: ${tempPassword}`);
    console.log(`App Login URL: ${loginUrl}`);
    console.log("========================================================\n");
  }
}
