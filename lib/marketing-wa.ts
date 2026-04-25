export const DEFAULT_WA_TEMPLATE = `שלום {{first_name}},

תודה שהתעניינת ברכישת כרטיס לאירוע {{title}}!

ניתן לרכוש את הכרטיס בקישור הבא:
{{ticket_link}}

נתראה באירוע 🎉`;

export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}
