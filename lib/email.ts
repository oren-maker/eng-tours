const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = "noreply@eng-tours.com";
const FROM_NAME = "ENG Tours";

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a raw HTML email via Resend
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<SendEmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html: wrapInLayout(htmlBody),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend error:", data);
      return { success: false, error: data?.message || "Send failed" };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("Email send error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a templated email via Resend
 */
export async function sendTemplateEmail(
  to: string,
  templateName: string,
  variables: Record<string, string> = {}
): Promise<SendEmailResult> {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    return { success: false, error: `Template "${templateName}" not found` };
  }

  let subject = template.subject;
  let body = template.body;

  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, "g");
    subject = subject.replace(pattern, value);
    body = body.replace(pattern, value);
  }

  return sendEmail(to, subject, body);
}

// ----- HTML Layout Wrapper -----

function wrapInLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Heebo', sans-serif; background-color: #f3f4f6; direction: rtl; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0369A1; padding: 24px; text-align: center;">
              <span style="color: #ffffff; font-size: 24px; font-weight: 700; font-family: 'Heebo', sans-serif;">ENG Tours</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px; font-family: 'Heebo', sans-serif; color: #374151; font-size: 14px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; font-family: 'Heebo', sans-serif;">
              ENG Tours &copy; ${new Date().getFullYear()} | כל הזכויות שמורות
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ----- Email Templates -----

interface EmailTemplate {
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  order_confirmation: {
    subject: "אישור הזמנה #{{order_number}} - ENG Tours",
    body: `
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">אישור הזמנה</h2>
      <p>שלום {{customer_name}},</p>
      <p>ההזמנה שלך מספר <strong>#{{order_number}}</strong> התקבלה בהצלחה.</p>
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>אירוע:</strong> {{event_name}}</p>
        <p><strong>תאריך:</strong> {{event_date}}</p>
        <p><strong>משתתפים:</strong> {{participant_count}}</p>
        <p><strong>סכום:</strong> {{total_amount}}</p>
      </div>
      <p>נעדכן אותך כשההזמנה תאושר סופית.</p>
      <p>תודה,<br>צוות ENG Tours</p>
    `,
  },

  payment_link: {
    subject: "קישור לתשלום - הזמנה #{{order_number}}",
    body: `
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">קישור לתשלום</h2>
      <p>שלום {{customer_name}},</p>
      <p>מצורף קישור לתשלום עבור הזמנה <strong>#{{order_number}}</strong>.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{payment_url}}" style="display: inline-block; background-color: #0369A1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
          לתשלום
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af;">הקישור תקף ל-48 שעות.</p>
      <p>תודה,<br>צוות ENG Tours</p>
    `,
  },

  supplier_notification: {
    subject: "הזמנה חדשה ממתינה לאישור - #{{order_number}}",
    body: `
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">הזמנה חדשה ממתינה</h2>
      <p>שלום {{supplier_name}},</p>
      <p>התקבלה הזמנה חדשה מספר <strong>#{{order_number}}</strong> שדורשת את אישורך.</p>
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>אירוע:</strong> {{event_name}}</p>
        <p><strong>תאריך:</strong> {{event_date}}</p>
        <p><strong>מספר פריטים:</strong> {{item_count}}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{portal_url}}" style="display: inline-block; background-color: #0369A1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;">
          כניסה לפורטל ספקים
        </a>
      </div>
      <p>תודה,<br>צוות ENG Tours</p>
    `,
  },

  final_confirmation: {
    subject: "אישור סופי להזמנה #{{order_number}} - ENG Tours",
    body: `
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #10B981;">ההזמנה אושרה!</h2>
      <p>שלום {{customer_name}},</p>
      <p>שמחים לבשר שההזמנה <strong>#{{order_number}}</strong> אושרה סופית!</p>
      <div style="background-color: #ecfdf5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>אירוע:</strong> {{event_name}}</p>
        <p><strong>תאריך:</strong> {{event_date}}</p>
        <p><strong>מספר אישור:</strong> {{confirmation_number}}</p>
      </div>
      <p>נתראה באירוע!</p>
      <p>תודה,<br>צוות ENG Tours</p>
    `,
  },

  event_reminder: {
    subject: "תזכורת: {{event_name}} מתקרב!",
    body: `
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">תזכורת לאירוע</h2>
      <p>שלום {{customer_name}},</p>
      <p>רצינו להזכיר לך שהאירוע <strong>{{event_name}}</strong> מתקיים בקרוב.</p>
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>תאריך:</strong> {{event_date}}</p>
        <p><strong>מיקום:</strong> {{event_location}}</p>
        <p><strong>מספר הזמנה:</strong> #{{order_number}}</p>
      </div>
      <p>מחכים לראותך!</p>
      <p>תודה,<br>צוות ENG Tours</p>
    `,
  },

  "2fa_code": {
    subject: "קוד אימות - ENG Tours",
    body: `
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">קוד אימות</h2>
      <p>שלום,</p>
      <p>קוד האימות שלך הוא:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; background-color: #f3f4f6; padding: 16px 32px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827; font-family: monospace;">
          {{code}}
        </span>
      </div>
      <p style="font-size: 12px; color: #9ca3af;">הקוד תקף ל-5 דקות. אל תשתף אותו עם אף אחד.</p>
    `,
  },

  faq_question: {
    subject: "שאלה חדשה מ-{{customer_name}}",
    body: `
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">שאלה חדשה</h2>
      <p>התקבלה שאלה חדשה מלקוח:</p>
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>שם:</strong> {{customer_name}}</p>
        <p><strong>אימייל:</strong> {{customer_email}}</p>
        <p><strong>טלפון:</strong> {{customer_phone}}</p>
      </div>
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>שאלה:</strong></p>
        <p>{{question}}</p>
      </div>
    `,
  },
};
