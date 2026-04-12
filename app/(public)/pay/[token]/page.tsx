"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface ParticipantPayment {
  id: string;
  first_name_en: string;
  last_name_en: string;
  phone: string;
  email: string;
  amount_paid: number;
  order_id: string;
  order_total: number;
  order_status: string;
  event_name: string;
  event_start_date: string;
  event_end_date: string;
  participant_share: number;
}

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ParticipantPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const res = await fetch(`/api/payments/${token}`);
        if (res.ok) {
          const result = await res.json();
          setData(result.participant);
        } else {
          setError("קישור תשלום לא תקין או שפג תוקפו");
        }
      } catch {
        setError("שגיאה בטעינת פרטי תשלום");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPaymentData();
  }, [token]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">טוען פרטי תשלום...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            שגיאה
          </h2>
          <p className="text-gray-500">{error || "קישור תשלום לא תקין"}</p>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, (data.participant_share || 0) - (data.amount_paid || 0));
  const isPaid = remaining <= 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-primary-700 text-white py-6 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold">ENG Tours</h1>
          <p className="text-white/80 mt-1">תשלום אישי</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-8">
        {/* Participant info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            פרטי התשלום
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">שם:</span>
              <span className="font-medium">
                {data.first_name_en} {data.last_name_en}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">אירוע:</span>
              <span className="font-medium">{data.event_name}</span>
            </div>
            {data.event_start_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">תאריך:</span>
                <span>
                  {new Date(data.event_start_date).toLocaleDateString("he-IL")}
                  {data.event_end_date && (
                    <>
                      {" - "}
                      {new Date(data.event_end_date).toLocaleDateString("he-IL")}
                    </>
                  )}
                </span>
              </div>
            )}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-500">חלקך בהזמנה:</span>
                <span className="font-bold">
                  {formatPrice(data.participant_share)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">שולם:</span>
                <span className="text-green-700 font-medium">
                  {formatPrice(data.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">יתרה לתשלום:</span>
                <span
                  className={`font-bold text-lg ${
                    isPaid ? "text-green-600" : "text-primary-700"
                  }`}
                >
                  {isPaid ? "שולם במלואו" : formatPrice(remaining)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment action */}
        {isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-green-800">
              התשלום הושלם!
            </h3>
            <p className="text-green-600 text-sm mt-1">
              תודה, חלקך בהזמנה שולם במלואו.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              תשלום
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              מערכת התשלום תיפתח בקרוב. לתיאום תשלום, פנו לצוות ENG Tours.
            </p>
            {/* Payment gateway placeholder - TBD */}
            <div className="bg-gray-100 rounded-lg p-8 text-gray-400">
              <p>שער תשלום - בקרוב</p>
              <p className="text-xs mt-2">
                (כרטיס אשראי / העברה בנקאית / תשלומים)
              </p>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `שלום, אשמח לבצע תשלום עבור הזמנה ב-ENG Tours.\nסכום: ${formatPrice(remaining)}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 bg-green-500 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-600 transition-all"
            >
              צור קשר ב-WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
