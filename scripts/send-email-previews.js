// Sends 3 sample email designs to oren@bin.co.il
const KEY = "re_GNSKiKma_7T7N72LbCeHeb2ha8RwDgxqb";
const TO = "oren@bin.co.il";
const FROM = "ENG TOURS <onboarding@resend.dev>";

const SHARED_STYLES = `
  body { margin: 0; padding: 0; background: #f5f1e8; font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(221,153,51,0.12); }
  .header { background: linear-gradient(135deg, #DD9933 0%, #b87a1f 100%); padding: 28px 24px; text-align: center; color: white; }
  .header h1 { margin: 0; font-size: 32px; letter-spacing: 2px; font-weight: 800; }
  .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.95; }
  .content { padding: 28px 24px; line-height: 1.7; }
  .greeting { font-size: 18px; color: #DD9933; font-weight: 600; margin-bottom: 16px; }
  .confirmation-box { background: #fef3c7; border: 2px dashed #DD9933; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; }
  .confirmation-label { font-size: 11px; color: #7c2d12; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  .confirmation-code { font-size: 24px; font-weight: 800; color: #DD9933; font-family: monospace; margin-top: 4px; letter-spacing: 3px; }
  .info-grid { background: #fff8ed; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3e8d0; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #6b7280; font-size: 14px; }
  .info-value { color: #1f2937; font-weight: 600; font-size: 14px; }
  .total-row { padding-top: 12px; border-top: 2px solid #DD9933; margin-top: 8px; }
  .total-value { color: #DD9933; font-size: 20px; font-weight: 800; }
  .btn { display: inline-block; background: #DD9933; color: white !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 4px; font-size: 15px; }
  .btn-outline { background: white; color: #DD9933 !important; border: 2px solid #DD9933; }
  .alert-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-right: 4px solid #DD9933; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
  .alert-title { font-weight: 700; color: #78350f; margin-bottom: 4px; font-size: 15px; }
  .alert-text { color: #92400e; font-size: 14px; margin: 0; }
  .flight-card { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; padding: 20px; margin: 16px 0; }
  .flight-route { display: flex; align-items: center; justify-content: space-between; margin: 12px 0; }
  .airport { text-align: center; }
  .airport-code { font-size: 28px; font-weight: 800; color: #1e40af; }
  .airport-name { font-size: 12px; color: #3730a3; }
  .plane-icon { font-size: 24px; color: #1e40af; }
  .hotel-card { background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 12px; padding: 20px; margin: 16px 0; }
  .checkin-dates { display: flex; justify-content: space-around; margin-top: 12px; }
  .date-block { text-align: center; }
  .date-label { font-size: 11px; color: #6b21a8; text-transform: uppercase; font-weight: 700; }
  .date-value { font-size: 18px; color: #4c1d95; font-weight: 700; margin-top: 4px; }
  .checklist { background: #f0fdf4; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
  .checklist h3 { color: #14532d; margin-top: 0; font-size: 16px; }
  .checklist ul { margin: 8px 0; padding-right: 20px; color: #166534; }
  .checklist li { margin: 6px 0; font-size: 14px; }
  .footer { background: #1f2937; color: #9ca3af; padding: 24px; text-align: center; font-size: 12px; line-height: 1.6; }
  .footer a { color: #fbbf24; text-decoration: none; }
  .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
`;

function wrap(title, bodyHtml) {
  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>${title}</title><style>${SHARED_STYLES}</style></head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <h1>ENG TOURS</h1>
        <p>חוויות טיולים מותאמות אישית</p>
      </div>
      <div class="content">${bodyHtml}</div>
      <div class="footer">
        📞 03-1234567 · 📧 <a href="mailto:info@eng-tours.com">info@eng-tours.com</a> · 🌐 <a href="https://eng-tours.vercel.app">eng-tours.com</a><br>
        © ${new Date().getFullYear()} ENG TOURS · כל הזכויות שמורות
      </div>
    </div>
  </div>
</body></html>`;
}

// === TEMPLATE 1: Order Confirmation ===
const orderConfirmation = wrap("אישור הזמנה", `
  <div class="greeting">🎉 שלום אורן, ההזמנה שלך אושרה!</div>
  <p>תודה שבחרת ב-ENG TOURS. הזמנתך ל<strong>פסטיבל איי יוון</strong> נקלטה במערכת בהצלחה.</p>

  <div class="confirmation-box">
    <div class="confirmation-label">מספר הזמנה</div>
    <div class="confirmation-code">#A1B2C3D4</div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">אירוע:</span><span class="info-value">פסטיבל איי יוון</span></div>
    <div class="info-row"><span class="info-label">יעד:</span><span class="info-value">🇬🇷 יוון (HER)</span></div>
    <div class="info-row"><span class="info-label">תאריכים:</span><span class="info-value">4.7.2026 - 10.7.2026</span></div>
    <div class="info-row"><span class="info-label">משתתפים:</span><span class="info-value">2 נוסעים</span></div>
    <div class="info-row"><span class="info-label">טיסת הלוך:</span><span class="info-value">אל על LY621 · 08:49</span></div>
    <div class="info-row"><span class="info-label">טיסת חזור:</span><span class="info-value">אל על LY622 · 21:30</span></div>
    <div class="info-row"><span class="info-label">מלון:</span><span class="info-value">מלון מרינה · deluxe</span></div>
    <div class="info-row"><span class="info-label">כרטיסים:</span><span class="info-value">VIP × 2</span></div>
    <div class="info-row total-row"><span class="info-label" style="font-weight:600;color:#1f2937">סה״כ לתשלום:</span><span class="info-value total-value">₪10,863</span></div>
  </div>

  <div class="alert-box">
    <div class="alert-title">⏰ שלבי ההזמנה</div>
    <p class="alert-text">ההזמנה עוברת כעת לאישור ספקים. בעוד 1-2 ימי עסקים תקבל אישור סופי + פרטי תשלום.</p>
  </div>

  <div style="text-align:center;margin:24px 0">
    <a href="https://eng-tours.vercel.app/p/EXAMPLE" class="btn">📄 צפה בפרטי ההזמנה</a>
    <a href="mailto:info@eng-tours.com" class="btn btn-outline">💬 יצירת קשר</a>
  </div>

  <p style="color:#6b7280;font-size:13px">יש שאלות? השיבו למייל זה ונחזור אליכם תוך 24 שעות.</p>
`);

// === TEMPLATE 2: Flight Reminder (Day Before) ===
const flightReminder = wrap("תזכורת טיסה — מחר!", `
  <div class="greeting">✈️ שלום אורן, הטיסה שלך מחר!</div>
  <p>עוד <strong style="color:#DD9933">24 שעות</strong> ואתה עולה על המטוס לפסטיבל איי יוון. הנה כל מה שצריך לדעת:</p>

  <div class="flight-card">
    <div style="text-align:center;font-weight:700;color:#1e3a8a;font-size:14px">טיסת הלוך · אל על LY621</div>
    <div class="flight-route">
      <div class="airport">
        <div class="airport-code">TLV</div>
        <div class="airport-name">תל אביב</div>
        <div style="font-size:16px;font-weight:700;color:#1e40af;margin-top:6px">08:49</div>
      </div>
      <div class="plane-icon">✈️</div>
      <div class="airport">
        <div class="airport-code">HER</div>
        <div class="airport-name">הרקליון</div>
        <div style="font-size:16px;font-weight:700;color:#1e40af;margin-top:6px">11:35</div>
      </div>
    </div>
    <div style="text-align:center;font-size:13px;color:#1e3a8a;margin-top:8px">⏱️ משך טיסה: 2:46 שעות</div>
  </div>

  <div class="alert-box">
    <div class="alert-title">🎫 צ׳ק-אין אונליין זמין כעת!</div>
    <p class="alert-text">לחץ על הכפתור כדי לבצע צ׳ק-אין ולבחור את המושב שלך. הצ׳ק-אין נסגר 3 שעות לפני ההמראה.</p>
    <div style="margin-top:12px">
      <a href="https://www.elal.com/checkin" class="btn">✈️ בצע צ׳ק-אין עכשיו</a>
    </div>
  </div>

  <div class="checklist">
    <h3>✅ צ׳ק-ליסט לפני היציאה</h3>
    <ul>
      <li>📘 דרכון בתוקף של לפחות 6 חודשים מעבר למועד החזרה</li>
      <li>🎫 כרטיס עלייה למטוס (מודפס או במובייל)</li>
      <li>💳 כרטיסי אשראי + מזומן (יורו)</li>
      <li>🔌 מתאם חשמל אירופאי (Type C/F)</li>
      <li>💊 תרופות אישיות + דרכון רפואי</li>
      <li>📱 כרטיס SIM בינלאומי / חבילת גלישה</li>
      <li>🧴 איפור/מטפלים עד 100ml בתיק יד</li>
      <li>📸 מטען לטלפון + סוללת גיבוי</li>
    </ul>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">🛄 הגעה לשדה:</span><span class="info-value">3 שעות לפני הטיסה</span></div>
    <div class="info-row"><span class="info-label">🎒 כבודה רשומה:</span><span class="info-value">23 ק״ג לנוסע</span></div>
    <div class="info-row"><span class="info-label">💼 כבודת יד:</span><span class="info-value">8 ק״ג לנוסע</span></div>
    <div class="info-row"><span class="info-label">🚖 מסוף:</span><span class="info-value">3 · בן גוריון</span></div>
  </div>

  <div style="text-align:center;margin:24px 0">
    <a href="https://eng-tours.vercel.app/p/EXAMPLE" class="btn">📄 פרטי ההזמנה המלאים</a>
  </div>

  <p style="color:#6b7280;font-size:13px">💡 נסיעה בטוחה ומהנה! אם יש שאלות בדרך — אנחנו זמינים 24/7 במספר 03-1234567.</p>
`);

// === TEMPLATE 3: Hotel Check-in Day ===
const hotelCheckin = wrap("היום בצ׳ק-אין במלון", `
  <div class="greeting">🏨 ברוך הבא ליוון, אורן!</div>
  <p>היום אתה מבצע צ׳ק-אין למלון. הנה כל הפרטים:</p>

  <div class="hotel-card">
    <div style="text-align:center">
      <div style="font-size:22px;font-weight:800;color:#4c1d95">מלון מרינה</div>
      <div style="font-size:14px;color:#6b21a8;margin-top:4px">⭐⭐⭐⭐ · הרקליון, יוון</div>
    </div>
    <div class="checkin-dates">
      <div class="date-block">
        <div class="date-label">Check-in</div>
        <div class="date-value">4.7.2026</div>
        <div style="font-size:11px;color:#6b21a8;margin-top:2px">החל מ-15:00</div>
      </div>
      <div style="font-size:24px;align-self:center;color:#7e22ce">→</div>
      <div class="date-block">
        <div class="date-label">Check-out</div>
        <div class="date-value">10.7.2026</div>
        <div style="font-size:11px;color:#6b21a8;margin-top:2px">עד 11:00</div>
      </div>
    </div>
  </div>

  <div class="confirmation-box">
    <div class="confirmation-label">מספר אישור הזמנה במלון</div>
    <div class="confirmation-code">HT-901684</div>
  </div>

  <div class="alert-box">
    <div class="alert-title">🎯 מה צריך להביא לקבלה?</div>
    <p class="alert-text">
      דרכון (של כל הנוסעים) · מספר אישור זה · כרטיס אשראי לערבות (₪500-800)
    </p>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">📍 כתובת:</span><span class="info-value">Marina Street 42, Heraklion</span></div>
    <div class="info-row"><span class="info-label">📞 טלפון:</span><span class="info-value">+30 281 123 4567</span></div>
    <div class="info-row"><span class="info-label">🏨 סוג חדר:</span><span class="info-value">Deluxe · 2 אנשים</span></div>
    <div class="info-row"><span class="info-label">🥐 ארוחת בוקר:</span><span class="info-value">כלולה (07:00-10:30)</span></div>
    <div class="info-row"><span class="info-label">📶 WiFi:</span><span class="info-value">חינם בכל המלון</span></div>
    <div class="info-row"><span class="info-label">🚗 חניה:</span><span class="info-value">בתשלום (€10/לילה)</span></div>
  </div>

  <div class="checklist">
    <h3>💡 טיפים למלון</h3>
    <ul>
      <li>צ׳ק-אין מוקדם (לפני 15:00) — בתיאום טלפוני, ייתכן בתשלום</li>
      <li>בקש חדר שקט (רחוק מהמעלית / כביש)</li>
      <li>מיני-בר — בדוק מחירים לפני שצורכים</li>
      <li>תן טיפ לסבל (€1-2 למזוודה)</li>
      <li>שמור את כרטיס המפתח קרוב לגוף בכיסים (נטול חשמל סטטי)</li>
    </ul>
  </div>

  <div style="text-align:center;margin:24px 0">
    <a href="https://maps.google.com/?q=Heraklion+Marina+Hotel" class="btn">🗺️ נווט למלון</a>
    <a href="https://eng-tours.vercel.app/p/EXAMPLE" class="btn btn-outline">📄 פרטי ההזמנה</a>
  </div>

  <p style="color:#6b7280;font-size:13px">חופשה נעימה! 🌊☀️</p>
`);

const emails = [
  { name: "order_confirmation", subject: "🎉 אישור הזמנה — פסטיבל איי יוון #A1B2C3D4", html: orderConfirmation },
  { name: "flight_reminder", subject: "✈️ תזכורת: הטיסה שלכם מחר — בצעו צ׳ק-אין עכשיו", html: flightReminder },
  { name: "hotel_checkin", subject: "🏨 ברוכים הבאים! היום צ׳ק-אין במלון מרינה", html: hotelCheckin },
];

(async () => {
  for (const e of emails) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ from: FROM, to: [TO], subject: e.subject, html: e.html }),
    });
    const d = await res.json();
    console.log(e.name, "→", res.status, d.id || d.message || d);
    await new Promise((r) => setTimeout(r, 1200));
  }
})();
