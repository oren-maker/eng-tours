"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

interface Passenger {
  first_name_en: string;
  last_name_en: string;
  passport_number: string;
  birth_date: string;
}

export default function PublicBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-primary-700">טוען...</div></div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const params = useParams();
  const search = useSearchParams();
  const eventId = params.id as string;
  const isPreview = search.get("preview") === "1";

  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const [peopleCount, setPeopleCount] = useState(1);
  const [outboundFlight, setOutboundFlight] = useState<string>("");
  const [returnFlight, setReturnFlight] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [openSection, setOpenSection] = useState<"outbound" | "return" | "room" | "ticket" | null>("outbound");
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+972");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/flights?event_id=${eventId}`).then((r) => r.json()),
      fetch(`/api/rooms`).then((r) => r.json()),
      fetch(`/api/tickets`).then((r) => r.json()),
      fetch(`/api/faq`).then((r) => r.json()).catch(() => []),
    ])
      .then(([evData, flightsData, roomsData, ticketsData, faqData]) => {
        setEvent(evData);
        if (Array.isArray(flightsData)) setFlights(flightsData);
        if (Array.isArray(roomsData)) setRooms(roomsData.filter((r: any) => r.event_id === eventId));
        if (Array.isArray(ticketsData)) setTickets(ticketsData.filter((t: any) => t.event_id === eventId));
        const faqArr = Array.isArray(faqData) ? faqData : (faqData?.faqs || []);
        setFaqs(faqArr.filter((f: any) => f.is_active !== false));
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const phonePrefixes = [
    { value: "+972", label: "🇮🇱 +972 ישראל" },
    { value: "+1", label: "🇺🇸 +1 ארה״ב" },
    { value: "+44", label: "🇬🇧 +44 בריטניה" },
    { value: "+33", label: "🇫🇷 +33 צרפת" },
    { value: "+49", label: "🇩🇪 +49 גרמניה" },
    { value: "+39", label: "🇮🇹 +39 איטליה" },
    { value: "+34", label: "🇪🇸 +34 ספרד" },
    { value: "+30", label: "🇬🇷 +30 יוון" },
    { value: "+31", label: "🇳🇱 +31 הולנד" },
    { value: "+7", label: "🇷🇺 +7 רוסיה" },
  ];

  useEffect(() => {
    setPassengers((prev) => {
      const next = [...prev];
      while (next.length < peopleCount) {
        next.push({ first_name_en: "", last_name_en: "", passport_number: "", birth_date: "" });
      }
      return next.slice(0, peopleCount);
    });
  }, [peopleCount]);

  // Stock filters - only show items with enough availability
  const availableFlights = flights.filter((f) => ((f.total_seats || 0) - (f.booked_seats || 0)) >= peopleCount);
  const availableRooms = rooms.filter((r) => {
    const remainingRooms = (r.total_rooms || 0) - (r.booked_rooms || 0);
    const capacity = r.capacity || 1;
    return remainingRooms * capacity >= peopleCount;
  });
  const availableTickets = tickets.filter((t) => ((t.total_qty || 0) - (t.booked_qty || 0)) >= peopleCount);

  const flightOut = availableFlights.find((f) => f.id === outboundFlight);
  const flightBack = availableFlights.find((f) => f.id === returnFlight);
  const room = availableRooms.find((r) => r.id === selectedRoom);
  const ticket = availableTickets.find((t) => t.id === selectedTicket);

  const currency = flightOut?.currency || flightBack?.currency || room?.currency || ticket?.currency || "ILS";
  const flightOutPrice = (flightOut?.price_customer || 0) * peopleCount;
  const flightBackPrice = (flightBack?.price_customer || 0) * peopleCount;
  const roomPrice = (room?.price_customer || 0) * peopleCount;
  const ticketPrice = (ticket?.price_customer || 0) * peopleCount;
  const totalPrice = flightOutPrice + flightBackPrice + roomPrice + ticketPrice;

  function updatePassenger(idx: number, field: keyof Passenger, value: string) {
    setPassengers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSubmit() {
    if (isPreview) {
      alert("מצב תצוגה מקדימה - ההזמנה לא נשמרה");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        event_id: eventId,
        participants: passengers.map((p) => ({
          ...p,
          flight_id: outboundFlight || null,
          return_flight_id: returnFlight || null,
          room_id: selectedRoom || null,
          ticket_id: selectedTicket || null,
        })),
        total_price: totalPrice,
        mode: event?.mode || "registration",
        contact_email: contactEmail,
        contact_phone: phonePrefix + contactPhone,
      };
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setOrderId(data.id || data.order?.id || "");
        setSuccess(true);
      } else {
        const err = await res.json();
        alert("שגיאה: " + (err.error || "לא ידוע"));
      }
    } catch { alert("שגיאה בשליחה"); }
    finally { setSubmitting(false); }
  }

  function canNext() {
    if (step === 1) return peopleCount > 0;
    if (step === 2) return !!(outboundFlight || returnFlight || selectedRoom || selectedTicket);
    if (step === 3) return passengers.every((p) => p.first_name_en && p.last_name_en && p.passport_number && p.birth_date) && contactEmail && contactPhone;
    return true;
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-primary-700">טוען...</div></div>;
  if (!event || event.error) return <div className="min-h-screen flex items-center justify-center"><div className="text-red-500">אירוע לא נמצא</div></div>;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-primary-900 mb-3">הזמנתך התקבלה!</h2>
          <p className="text-gray-600 mb-6">תודה שבחרת ב-ENG Tours. אנו ניצור איתך קשר בקרוב.</p>

          {orderId && (
            <div className="bg-gradient-to-l from-primary-50 to-orange-50 border-2 border-primary-200 rounded-xl p-5 mb-6">
              <p className="text-sm text-gray-600 mb-2">מספר ההזמנה שלך</p>
              <div className="text-2xl font-bold font-mono text-primary-800 tracking-wider select-all" dir="ltr">
                #{orderId.toUpperCase()}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(orderId);
                  alert("מספר ההזמנה הועתק!");
                }}
                className="mt-3 text-xs text-primary-700 hover:text-primary-900 underline"
              >
                📋 העתק מספר הזמנה
              </button>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
            💡 שמור את מספר ההזמנה - תצטרך אותו כדי לבדוק את סטטוס ההזמנה או לפנות אלינו
          </div>

          <div className="text-xs text-gray-400 mt-4">
            אישור הזמנה נשלח למייל שציינת
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: "כמות אנשים" },
    { num: 2, label: "בחירת שירותים" },
    { num: 3, label: "פרטי נוסעים" },
    { num: 4, label: "סיכום" },
  ];

  function availText(remaining: number) {
    if (remaining <= 0) return "❌ לא זמין";
    if (remaining < 5) return `נשארו ${remaining} בלבד!`;
    return `${remaining} זמינים`;
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
      {isPreview && (
        <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium">
          👁️ תצוגה מקדימה - ההזמנה לא תישמר
        </div>
      )}

      <header className="bg-gradient-to-l from-primary-800 to-primary-600 text-white py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">ENG Tours</h1>
          <p className="text-sm text-white/80">טופס הזמנה - {event.name}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    step >= s.num ? "bg-primary-700 text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span className={`text-xs mt-1 ${step >= s.num ? "text-primary-700 font-medium" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`h-1 flex-1 mx-2 ${step > s.num ? "bg-primary-700" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">כמה אנשים בהזמנה?</h3>
                <div className="flex items-center gap-4">
                  <button onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                    className="w-12 h-12 rounded-lg border border-gray-200 text-xl hover:bg-gray-50">-</button>
                  <span className="text-5xl font-bold text-primary-700 w-20 text-center">{peopleCount}</span>
                  <button onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))}
                    className="w-12 h-12 rounded-lg border border-gray-200 text-xl hover:bg-gray-50">+</button>
                  <span className="text-sm text-gray-500 mr-2">אנשים</span>
                </div>
                <p className="text-xs text-gray-400 mt-3">רק אפשרויות עם מלאי זמין ל-{peopleCount} אנשים יוצגו</p>
              </div>
            )}

            {step === 2 && (() => {
              const sections: { key: "outbound" | "return" | "room" | "ticket"; label: string; icon: string; available: boolean }[] = [];
              if (availableFlights.length > 0) sections.push({ key: "outbound", label: "טיסת הלוך", icon: "✈️", available: true });
              if (availableFlights.length > 0) sections.push({ key: "return", label: "טיסת חזור", icon: "🔁", available: true });
              if (availableRooms.length > 0) sections.push({ key: "room", label: "חדר במלון", icon: "🏨", available: true });
              if (availableTickets.length > 0) sections.push({ key: "ticket", label: "כרטיס", icon: "🎫", available: true });

              const goToNext = (current: string) => {
                const idx = sections.findIndex((s) => s.key === current);
                const next = sections[idx + 1];
                setOpenSection(next ? next.key : null);
              };

              const summary = (key: string) => {
                if (key === "outbound") return flightOut ? `${flightOut.airline_name} ${flightOut.flight_code} · ${currencySymbol(flightOut.currency)}${flightOut.price_customer}/אדם` : "ללא";
                if (key === "return") return flightBack ? `${flightBack.airline_name} ${flightBack.flight_code} · ${currencySymbol(flightBack.currency)}${flightBack.price_customer}/אדם` : "ללא";
                if (key === "room") return room ? `${room.hotels?.name || "מלון"} · ${room.room_type} · ${currencySymbol(room.currency)}${room.price_customer}/אדם` : "ללא";
                if (key === "ticket") return ticket ? `${ticket.name} · ${currencySymbol(ticket.currency)}${ticket.price_customer}` : "ללא";
                return "";
              };

              const isSelected = (key: string) => {
                if (key === "outbound") return outboundFlight !== undefined;
                if (key === "return") return returnFlight !== undefined;
                if (key === "room") return selectedRoom !== undefined;
                if (key === "ticket") return selectedTicket !== undefined;
                return false;
              };
              const isPicked = (key: string) => {
                if (key === "outbound") return !!outboundFlight;
                if (key === "return") return !!returnFlight;
                if (key === "room") return !!selectedRoom;
                if (key === "ticket") return !!selectedTicket;
                return false;
              };

              return (
                <div className="space-y-3">
                  {sections.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                      <div className="text-4xl mb-3">😔</div>
                      <p className="text-gray-500">אין שירותים זמינים לכמות המבוקשת</p>
                    </div>
                  )}

                  {sections.map((sec) => {
                    const open = openSection === sec.key;
                    const picked = isSelected(sec.key);
                    return (
                      <div key={sec.key} className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${open ? "border-primary-300" : isPicked(sec.key) ? "border-green-200" : "border-transparent"}`}>
                        <button
                          type="button"
                          onClick={() => setOpenSection(open ? null : sec.key)}
                          className={`w-full p-4 flex items-center justify-between gap-3 ${open ? "bg-primary-50" : "hover:bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-2xl">{sec.icon}</span>
                            <div className="text-right flex-1 min-w-0">
                              <div className="font-semibold text-gray-800">{sec.label}</div>
                              {!open && picked && (
                                <div className={`text-xs mt-0.5 truncate ${isPicked(sec.key) ? "text-green-700" : "text-gray-500"}`}>
                                  {isPicked(sec.key) ? "✓ " : ""}{summary(sec.key)}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                            {open ? "▲ סגור" : picked ? "✏️ פתח" : "▼ פתח"}
                          </span>
                        </button>

                        {open && (
                          <div className="p-4 border-t border-gray-100 space-y-2">
                            {sec.key === "outbound" && (
                              <>
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                                  onClick={() => { setOutboundFlight(""); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="outbound" checked={!outboundFlight} readOnly />
                                  <span className="text-sm text-gray-600">ללא טיסת הלוך</span>
                                </label>
                                {availableFlights.map((f) => {
                                  const remaining = (f.total_seats || 0) - (f.booked_seats || 0);
                                  return (
                                    <label key={f.id}
                                      onClick={() => { setOutboundFlight(f.id); setTimeout(() => goToNext(sec.key), 200); }}
                                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${outboundFlight === f.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"}`}>
                                      <input type="radio" name="outbound" checked={outboundFlight === f.id} readOnly className="mt-1" />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-800">{f.airline_name} {f.flight_code}</span>
                                          <span className="font-bold text-primary-700">{currencySymbol(f.currency)}{f.price_customer}/אדם</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {f.origin_iata} → {f.dest_iata}
                                          {f.departure_time && ` · ${new Date(f.departure_time).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}`}
                                        </p>
                                        <p className={`text-xs mt-1 ${remaining < 5 ? "text-orange-600 font-medium" : "text-green-600"}`}>{availText(remaining)}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </>
                            )}

                            {sec.key === "return" && (
                              <>
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                                  onClick={() => { setReturnFlight(""); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="return" checked={!returnFlight} readOnly />
                                  <span className="text-sm text-gray-600">ללא טיסת חזור</span>
                                </label>
                                {availableFlights.filter((f) => f.id !== outboundFlight).map((f) => {
                                  const remaining = (f.total_seats || 0) - (f.booked_seats || 0);
                                  return (
                                    <label key={f.id}
                                      onClick={() => { setReturnFlight(f.id); setTimeout(() => goToNext(sec.key), 200); }}
                                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${returnFlight === f.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"}`}>
                                      <input type="radio" name="return" checked={returnFlight === f.id} readOnly className="mt-1" />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-800">{f.airline_name} {f.flight_code}</span>
                                          <span className="font-bold text-primary-700">{currencySymbol(f.currency)}{f.price_customer}/אדם</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {f.origin_iata} → {f.dest_iata}
                                          {f.departure_time && ` · ${new Date(f.departure_time).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}`}
                                        </p>
                                        <p className={`text-xs mt-1 ${remaining < 5 ? "text-orange-600 font-medium" : "text-green-600"}`}>{availText(remaining)}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </>
                            )}

                            {sec.key === "room" && (
                              <>
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                                  onClick={() => { setSelectedRoom(""); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="room" checked={!selectedRoom} readOnly />
                                  <span className="text-sm text-gray-600">ללא מלון</span>
                                </label>
                                {availableRooms.map((r) => {
                                  const remainingRooms = (r.total_rooms || 0) - (r.booked_rooms || 0);
                                  return (
                                    <label key={r.id}
                                      onClick={() => { setSelectedRoom(r.id); setTimeout(() => goToNext(sec.key), 200); }}
                                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${selectedRoom === r.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"}`}>
                                      <input type="radio" name="room" checked={selectedRoom === r.id} readOnly className="mt-1" />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-800">{r.hotels?.name || "מלון"} - {r.room_type}</span>
                                          <span className="font-bold text-primary-700">{currencySymbol(r.currency)}{r.price_customer}/אדם</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{r.capacity} אנשים בחדר</p>
                                        <p className={`text-xs mt-1 ${remainingRooms < 3 ? "text-orange-600 font-medium" : "text-green-600"}`}>
                                          {remainingRooms > 0 ? `${remainingRooms} חדרים זמינים` : "אזל המלאי"}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </>
                            )}

                            {sec.key === "ticket" && (
                              <>
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                                  onClick={() => { setSelectedTicket(""); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="ticket" checked={!selectedTicket} readOnly />
                                  <span className="text-sm text-gray-600">ללא כרטיס</span>
                                </label>
                                {availableTickets.map((t) => {
                                  const remaining = (t.total_qty || 0) - (t.booked_qty || 0);
                                  return (
                                    <label key={t.id}
                                      onClick={() => { setSelectedTicket(t.id); setTimeout(() => goToNext(sec.key), 200); }}
                                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${selectedTicket === t.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"}`}>
                                      <input type="radio" name="ticket" checked={selectedTicket === t.id} readOnly className="mt-1" />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-800">{t.name}</span>
                                          <span className="font-bold text-primary-700">{currencySymbol(t.currency)}{t.price_customer}</span>
                                        </div>
                                        <p className={`text-xs mt-1 ${remaining < 5 ? "text-orange-600 font-medium" : "text-green-600"}`}>{availText(remaining)}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {step === 3 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">פרטי הנוסעים</h3>

                <div className="border border-primary-200 bg-primary-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-primary-900 mb-3">פרטי יצירת קשר</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">אימייל *</label>
                      <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required dir="ltr"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">טלפון *</label>
                      <div className="flex gap-1" dir="ltr">
                        <input
                          type="text"
                          list="phone-prefixes"
                          value={phonePrefix}
                          onChange={(e) => setPhonePrefix(e.target.value)}
                          placeholder="+972"
                          className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-primary-500 outline-none"
                        />
                        <datalist id="phone-prefixes">
                          {phonePrefixes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </datalist>
                        <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required placeholder="524802830"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {passengers.map((p, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-primary-700 mb-3">נוסע #{i + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">שם פרטי (באנגלית) *</label>
                          <input type="text" value={p.first_name_en} onChange={(e) => updatePassenger(i, "first_name_en", e.target.value)} required dir="ltr"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">שם משפחה (באנגלית) *</label>
                          <input type="text" value={p.last_name_en} onChange={(e) => updatePassenger(i, "last_name_en", e.target.value)} required dir="ltr"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">מספר דרכון *</label>
                          <input type="text" value={p.passport_number} onChange={(e) => updatePassenger(i, "passport_number", e.target.value)} required dir="ltr"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">תאריך לידה *</label>
                          <input type="date" value={p.birth_date} onChange={(e) => updatePassenger(i, "birth_date", e.target.value)} required
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">סיכום ההזמנה</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">אירוע:</span><span className="font-medium">{event.name}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">כמות נוסעים:</span><span className="font-medium">{peopleCount}</span></div>
                  {flightOut && <div className="flex justify-between py-2 border-b"><span className="text-gray-600">טיסת הלוך:</span><span className="font-medium">{flightOut.airline_name} {flightOut.flight_code}</span></div>}
                  {flightBack && <div className="flex justify-between py-2 border-b"><span className="text-gray-600">טיסת חזור:</span><span className="font-medium">{flightBack.airline_name} {flightBack.flight_code}</span></div>}
                  {room && <div className="flex justify-between py-2 border-b"><span className="text-gray-600">מלון:</span><span className="font-medium">{room.hotels?.name} - {room.room_type}</span></div>}
                  {ticket && <div className="flex justify-between py-2 border-b"><span className="text-gray-600">כרטיס:</span><span className="font-medium">{ticket.name}</span></div>}
                </div>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">נוסעים:</h4>
                  <div className="space-y-1 text-sm">
                    {passengers.map((p, i) => (
                      <div key={i} className="text-gray-600">{i + 1}. {p.first_name_en} {p.last_name_en} · דרכון: {p.passport_number}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm p-5 sticky top-4">
              {step > 1 && totalPrice > 0 && (
                <>
                  <h3 className="text-base font-semibold text-gray-800 mb-3">💰 סיכום מחיר</h3>
                  <div className="space-y-2 text-sm mb-3">
                    {flightOut && <div className="flex justify-between"><span className="text-gray-600">הלוך × {peopleCount}</span><span className="font-medium">{currencySymbol(currency)}{flightOutPrice.toLocaleString()}</span></div>}
                    {flightBack && <div className="flex justify-between"><span className="text-gray-600">חזור × {peopleCount}</span><span className="font-medium">{currencySymbol(currency)}{flightBackPrice.toLocaleString()}</span></div>}
                    {room && <div className="flex justify-between"><span className="text-gray-600">חדר × {peopleCount}</span><span className="font-medium">{currencySymbol(currency)}{roomPrice.toLocaleString()}</span></div>}
                    {ticket && <div className="flex justify-between"><span className="text-gray-600">כרטיס × {peopleCount}</span><span className="font-medium">{currencySymbol(currency)}{ticketPrice.toLocaleString()}</span></div>}
                    <div className="pt-2 mt-2 border-t-2 border-primary-200 flex justify-between items-baseline">
                      <span className="text-gray-700 font-medium">סה״כ:</span>
                      <span className="text-2xl font-bold text-primary-700">{currencySymbol(currency)}{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
              {step === 1 && (
                <p className="text-sm text-gray-500 mb-3 text-center">סיכום המחיר יוצג לאחר בחירת השירותים</p>
              )}

              <div className="flex gap-2">
                {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">חזור</button>}
                {step < 4 ? (
                  <button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1 bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50">הבא →</button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {submitting ? "שולח..." : "✓ שלח הזמנה"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-primary-900 mb-4">❓ שאלות ותשובות</h3>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details key={faq.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <summary className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between text-sm font-medium text-gray-800">
                    <span>{faq.question}</span>
                    <span className="text-primary-500 text-xs">▼</span>
                  </summary>
                  <div className="p-3 pt-0 text-sm text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="text-center py-6 text-xs text-gray-500">
        © ENG Tours - כל הזכויות שמורות
      </footer>
    </div>
  );
}
