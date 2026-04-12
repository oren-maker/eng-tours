"use client";

import { useState, useEffect, useCallback } from "react";

interface EventOption {
  id: string;
  event_id: string;
  name: string;
}

interface ItemBreakdown {
  item_name: string;
  item_type: string;
  cost_price: number;
  sell_price: number;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  confirmedOrders: number;
  avgRevenue: number;
}

export default function FinancialPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [items, setItems] = useState<ItemBreakdown[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    profitMargin: 0,
    confirmedOrders: 0,
    avgRevenue: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const fetchFinancialData = useCallback(async () => {
    if (!selectedEvent) {
      setItems([]);
      setSummary({
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        profitMargin: 0,
        confirmedOrders: 0,
        avgRevenue: 0,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders?event_id=${selectedEvent}&status=confirmed`);
      if (res.ok) {
        const data = await res.json();
        const orders = data.orders || [];

        // Calculate summary from orders
        const totalRevenue = orders.reduce(
          (sum: number, o: { total_price: number }) => sum + (o.total_price || 0),
          0
        );
        const confirmedOrders = orders.length;
        const avgRevenue = confirmedOrders > 0 ? totalRevenue / confirmedOrders : 0;

        // Placeholder cost calculation (70% of revenue as estimate)
        const totalCost = totalRevenue * 0.7;
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        setSummary({
          totalRevenue,
          totalCost,
          grossProfit,
          profitMargin,
          confirmedOrders,
          avgRevenue,
        });

        // Placeholder items - will be populated when item data is available
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to fetch financial data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(price || 0);

  const handleExport = (type: "excel" | "pdf" | "passengers") => {
    alert(`ייצוא ${type === "excel" ? "Excel" : type === "pdf" ? "PDF" : "רשימת נוסעים"} - בפיתוח`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary-900">סקירה כלכלית</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("excel")}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            ייצוא Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            ייצוא PDF
          </button>
          <button
            onClick={() => handleExport("passengers")}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            רשימת נוסעים
          </button>
        </div>
      </div>

      {/* Event Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">בחר אירוע</label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full sm:w-80 rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">-- בחר אירוע --</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.event_id || ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">טוען נתונים כלכליים...</div>
      )}

      {!loading && selectedEvent && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-green-400">
              <div className="text-sm text-gray-500">סה"כ הכנסות</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {formatPrice(summary.totalRevenue)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-red-400">
              <div className="text-sm text-gray-500">סה"כ עלות</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {formatPrice(summary.totalCost)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-blue-400">
              <div className="text-sm text-gray-500">רווח גולמי</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {formatPrice(summary.grossProfit)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-purple-400">
              <div className="text-sm text-gray-500">שיעור רווח</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {summary.profitMargin.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-yellow-400">
              <div className="text-sm text-gray-500">הזמנות מאושרות</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {summary.confirmedOrders}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-cyan-400">
              <div className="text-sm text-gray-500">הכנסה ממוצעת</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {formatPrice(summary.avgRevenue)}
              </div>
            </div>
          </div>

          {/* Chart Placeholders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                הכנסות vs הוצאות
              </h3>
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center text-gray-400">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="text-sm">גרף עמודות - Recharts</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                התפלגות הכנסות
              </h3>
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center text-gray-400">
                  <div className="text-3xl mb-2">🥧</div>
                  <div className="text-sm">גרף עוגה - Recharts</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                הזמנות לאורך זמן
              </h3>
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center text-gray-400">
                  <div className="text-3xl mb-2">📈</div>
                  <div className="text-sm">גרף קווי - Recharts</div>
                </div>
              </div>
            </div>
          </div>

          {/* Item Breakdown Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">פירוט פריטים</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">פריט</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">עלות לחברה</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">מחיר ללקוח</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">כמות</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">הכנסה</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">עלות</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">רווח</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        {selectedEvent
                          ? "אין נתוני פריטים לאירוע זה"
                          : "בחר אירוע לצפייה בנתונים"}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.item_name}</td>
                        <td className="px-4 py-3">{formatPrice(item.cost_price)}</td>
                        <td className="px-4 py-3">{formatPrice(item.sell_price)}</td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3 text-green-700">{formatPrice(item.revenue)}</td>
                        <td className="px-4 py-3 text-red-700">{formatPrice(item.cost)}</td>
                        <td className="px-4 py-3 font-semibold">{formatPrice(item.profit)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !selectedEvent && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">💰</div>
          <div className="text-lg">בחר אירוע כדי לצפות בנתונים הכלכליים</div>
        </div>
      )}
    </div>
  );
}
