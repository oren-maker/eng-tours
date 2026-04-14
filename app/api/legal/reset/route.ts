export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { slug } = await request.json();
  if (!slug || !["terms", "privacy"].includes(slug)) {
    return NextResponse.json({ error: "slug לא תקין" }, { status: 400 });
  }
  const supabase = createServiceClient();

  // Import defaults from migration script content (redefined here for self-contained)
  const today = new Date().toLocaleDateString("he-IL");
  const defaults: Record<string, { title: string; content: string }> = {
    terms: {
      title: "תנאי שימוש",
      content: `# תנאי שימוש — ENG TOURS\n\n**עודכן לאחרונה:** ${today}\n\nברוכים הבאים ל-ENG TOURS. השימוש באתר מהווה הסכמה לתנאי השימוש.\n\n## 1. שירותי החברה\nהחברה מספקת שירותי תיווך וארגון אירועי נסיעה — טיסות, בתי מלון וכרטיסים לאירועים.\n\n## 2. הרשמה וחשבון\nבמסירת פרטי קשר (טלפון/מייל) אתה מסכים לקבל הודעות הקשורות להזמנה.\n\n## 3. תשלום וביטול\nביטול כפוף לתנאי הביטול של ההזמנה ולחוק הגנת הצרכן.\n\n## 4. אחריות\nהחברה פועלת כמתווך. אחריות לשירות הסופי חלה על הספקים.\n\n## 5. דין וסמכות\nדין ישראלי. סמכות שיפוט בלעדית — בתי המשפט במחוז תל אביב.`,
    },
    privacy: {
      title: "מדיניות פרטיות",
      content: `# מדיניות פרטיות — ENG TOURS\n\n**עודכן לאחרונה:** ${today}\n\n## 1. מידע שנאסף\nשם, דרכון, טלפון, מייל, פרטי אמצעי תשלום (ללא מספרי כרטיס מלאים).\n\n## 2. שימוש במידע\nביצוע ההזמנה, שליחת אישורים ב-WhatsApp/מייל, עיבוד תשלומים.\n\n## 3. שיתוף\nעם ספקי שירות (חברות תעופה/מלונות) לצורך ביצוע ההזמנה בלבד.\n\n## 4. אבטחה\nהצפנת תעבורה (HTTPS), סיסמאות מוצפנות ב-bcrypt, גישה מוגבלת.\n\n## 5. זכויות\nעיון, תיקון, מחיקה, העברת מידע, התנגדות לשיווק — פנה אלינו.`,
    },
  };

  const d = defaults[slug];
  const { data, error } = await supabase
    .from("legal_documents")
    .update({ title: d.title, content: d.content, updated_at: new Date().toISOString(), updated_by: session.user.id })
    .eq("slug", slug)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
