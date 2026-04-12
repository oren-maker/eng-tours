const summaryCards = [
  { label: 'סה"כ הזמנות', value: "0", icon: "📋", color: "bg-purple-50 border-purple-300" },
  { label: "אירועים פעילים", value: "0", icon: "🎪", color: "bg-blue-50 border-blue-300" },
  { label: "ממתינות לאישור", value: "0", icon: "⏳", color: "bg-yellow-50 border-yellow-300" },
  { label: "לא הושלמו", value: "0", icon: "⚠️", color: "bg-red-50 border-red-300" },
];

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">דשבורד</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl p-5 shadow-sm border-r-4 ${card.color} bg-white transition-transform hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-3xl font-bold text-gray-800">{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">יומן אדמין</h3>
          <div className="text-center text-gray-400 py-12">
            לוח שנה עם אירועים פעילים
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">פעילות אחרונה</h3>
          <div className="text-center text-gray-400 py-12">
            Audit Log - פעולות אחרונות
          </div>
        </div>
      </div>
    </div>
  );
}
