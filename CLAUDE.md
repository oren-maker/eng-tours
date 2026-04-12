# ENG Tours - מערכת ניהול אירועים

## מי אני
אני Claude, עוזר AI שבונה ומתחזק את הפרויקט הזה יחד עם אורן. אני אחראי על כתיבת הקוד, עיצוב, פיתוח פיצ'רים חדשים, ודחיפה ל-GitHub אחרי כל שינוי.

## מהות הפרויקט
פלטפורמת ניהול אירועי נסיעות המשלבת ממשק אדמין מלא, פורטל ספקים, וטופס הזמנה ציבורי ללקוחות. המערכת מנהלת מספר פרויקטים פעילים במקביל עם תמיכה מלאה במובייל.

## מחסנית טכנולוגית
- **Frontend**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS + shadcn/ui, Mobile-First
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL via Supabase (Managed, RLS, Auth)
- **File Storage**: Supabase Storage
- **Auth**: NextAuth.js + JWT
- **Email**: Resend
- **WhatsApp**: WeSender API
- **OCR דרכון**: Claude Vision API
- **Charts**: Recharts
- **PDF**: React-PDF / Puppeteer
- **Deployment**: Vercel

## מבנה הפרויקט
```
eng-tours/
├── app/
│   ├── (public)/         # עמודים ציבוריים
│   │   ├── events/[id]/  # דף הזמנה לפי אירוע
│   │   └── pay/[token]/  # תשלום חלקי אישי
│   ├── (admin)/          # עמודי אדמין (מוגנים)
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── orders/
│   │   ├── flights/
│   │   ├── hotels/
│   │   ├── tickets/
│   │   ├── financial/
│   │   ├── whatsapp/
│   │   ├── users/
│   │   ├── faq/
│   │   └── settings/
│   ├── (supplier)/       # פורטל ספקים
│   │   └── portal/
│   └── api/              # API Routes
├── components/
├── lib/                  # Utilities, DB, Auth, WeSender
└── public/
```

## מודולים
1. **ניהול אירועים** - יצירה, עריכה, ארכיון, שכפול, מזהה ייחודי (RF/FL/RL/IL/FI)
2. **ניהול טיסות** - הוספה, הקצאת מקומות, שיוך לאירוע
3. **ניהול מלונות וחדרים** - מלונות, חדרים, תאריכים, מחירים
4. **ניהול כרטיסים** - כרטיסים לאירוע, מחירים, מלאי
5. **חבילות** - שילוב טיסה + חדר + כרטיס עם מחיר כולל
6. **הזמנות לקוח** - טופס ציבורי, דרכון OCR, תשלום חלקי
7. **פורטל ספקים** - אישור הזמנות, מספרי אישור, דיווח בעיות
8. **WhatsApp** - לוג, תבניות, התראות, WeSender API
9. **כלכלי** - עמוד רווחיות, גרפים, ייצוא
10. **FAQ** - עריכה, דירוג, שאלות לקוחות
11. **אדמין** - דשבורד, לוג, משתמשים, הגדרות

## סוגי משתמשים
- **אדמין** - גישה מלאה, כניסה עם מייל/טלפון + סיסמה + 2FA
- **ספק** - פורטל ספק בלבד, כניסה עם מייל + סיסמה
- **לקוח** - לא משתמש מערכת, ממלא טופס הזמנה בלבד

## עיצוב עם Figma
- פלאגין Figma מחובר - להשתמש בו כבסיס לעיצוב מקצועי
- סקילים זמינים: figma-use, figma-implement-design, figma-generate-design
- להשתמש גם בסקיל frontend-design לעיצוב מקצועי ללא Figma

## כללי עבודה
- **תמיד commit + push אחרי כל שינוי**
- עיצוב RTL מלא בעברית (ברירת מחדל) עם תמיכה באנגלית
- Mobile-First - כל עמוד מותאם לנייד ולדסקטופ
- קוד נקי וקריא ב-TypeScript
- Audit Log - כל פעולת אדמין נרשמת

## בעל הפרויקט
**אורן** - oren@bin.co.il | GitHub: oren-maker
