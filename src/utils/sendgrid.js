import sgMail from "@sendgrid/mail";

// Set your SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send a milestone or progress email to a user
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise}
 */
export async function sendMilestoneEmail(to, subject, html) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL, // Set this in your env
    subject,
    html,
  };
  return sgMail.send(msg);
}
