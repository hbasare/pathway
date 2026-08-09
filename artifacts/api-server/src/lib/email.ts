import nodemailer from "nodemailer";

async function sendEmailHelper(to: string, subject: string, text: string, html: string, mockPrinter: () => void) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "no-reply@pathways-toc.org";

  if (host && user && pass) {
    if (
      host === "smtp-relay.brevo.com" ||
      pass.startsWith("xsmtpsib-") ||
      pass.startsWith("xkeysib-")
    ) {
      // Send via Brevo transactional HTTP API to bypass Render outbound SMTP port blocking
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": pass,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "Pathways Admin",
            email: from,
          },
          to: [
            {
              email: to,
            }
          ],
          subject: subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Brevo HTTP API error: ${response.status} - ${errText}`);
      }

      console.log(`[EMAIL] Email sent to ${to} via Brevo HTTP API.`);
      return;
    }

    // Real SMTP configuration (e.g. non-Brevo SMTP providers)
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
      to,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL] Email sent to ${to} via SMTP.`);
  } else {
    // Local fallback/mock: print to the console
    mockPrinter();
  }
}

export async function sendWelcomeEmail(email: string, username: string, tempPassword: string) {
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

  await sendEmailHelper(email, subject, text, html, () => {
    console.log("\n========================================================");
    console.log("[MOCK EMAIL] SMTP settings not configured. Printing email:");
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Username: ${username}`);
    console.log(`Temporary Password: ${tempPassword}`);
    console.log(`App Login URL: ${loginUrl}`);
    console.log("========================================================\n");
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const subject = "Reset Your Pathways Password";
  const text = `Hello,

A request has been made to reset the password for your Pathways account.

Please use the link below to reset your password. This link is valid for 1 hour:
${resetUrl}

If you did not request this, please ignore this email.

Best regards,
The Pathways Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-bottom: 20px;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>A request has been made to reset the password for your Pathways account.</p>
      <p>Please click the button below to reset your password. This link is valid for 1 hour:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #6b7280; font-size: 0.875rem;">If the button above does not work, copy and paste this link into your browser:</p>
      <p style="color: #2563eb; font-size: 0.875rem; word-break: break-all;">${resetUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 0.875rem; color: #6b7280; text-align: center;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmailHelper(email, subject, text, html, () => {
    console.log("\n========================================================");
    console.log("[MOCK EMAIL] Password Reset Link:");
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("========================================================\n");
  });
}

export async function sendUsernameRecoveryEmail(email: string, usernames: string[]) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const loginUrl = `${appUrl}/login`;

  const subject = "Your Pathways Usernames";
  const text = `Hello,

A request has been made to retrieve the usernames associated with your email address on Pathways.

Here are the usernames associated with this email:
${usernames.map(u => `- ${u}`).join("\n")}

You can log in to the platform here:
${loginUrl}

Best regards,
The Pathways Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-bottom: 20px;">Retrieve Your Usernames</h2>
      <p>Hello,</p>
      <p>The following usernames are associated with your email address on the Pathways platform:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <ul style="margin: 0; padding-left: 20px; color: #1f2937; font-size: 1.1em; line-height: 1.6;">
          ${usernames.map(u => `<li><code>${u}</code></li>`).join("")}
        </ul>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In to Pathways</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 0.875rem; color: #6b7280; text-align: center;">If you did not request this retrieval, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmailHelper(email, subject, text, html, () => {
    console.log("\n========================================================");
    console.log("[MOCK EMAIL] Username Recovery:");
    console.log(`To: ${email}`);
    console.log(`Usernames: ${usernames.join(", ")}`);
    console.log("========================================================\n");
  });
}
