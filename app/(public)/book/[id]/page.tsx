"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

interface Passenger {
  first_name_en: string;
  last_name_en: string;
  passport_number: string;
  passport_expiry: string;
  birth_date: string;
  phone?: string;
  email?: string;
  passport_image_url?: string;
  passport_data?: any;
}

function computeAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
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
  const [faqOpen, setFaqOpen] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [peopleCount, setPeopleCount] = useState(1);
  const [outboundFlight, setOutboundFlight] = useState<string>("");
  const [returnFlight, setReturnFlight] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [openSection, setOpenSection] = useState<"outbound" | "return" | "room" | "ticket" | null>("outbound");
  const [decided, setDecided] = useState<Set<string>>(new Set());
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+972");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then(async (evData) => {
        setEvent(evData);
        const realEventId = evData?.id || eventId;
        const [flightsData, roomsData, ticketsData, faqData] = await Promise.all([
          fetch(`/api/flights?event_id=${realEventId}`).then((r) => r.json()),
          fetch(`/api/rooms`).then((r) => r.json()),
          fetch(`/api/tickets`).then((r) => r.json()),
          fetch(`/api/faq`).then((r) => r.json()).catch(() => []),
        ]);
        if (Array.isArray(flightsData)) setFlights(flightsData);
        if (Array.isArray(roomsData)) setRooms(roomsData.filter((r: any) => r.event_id === realEventId));
        if (Array.isArray(ticketsData)) setTickets(ticketsData.filter((t: any) => t.event_id === realEventId));
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
        next.push({ first_name_en: "", last_name_en: "", passport_number: "", passport_expiry: "", birth_date: "", phone: "", email: "", passport_image_url: "", passport_data: null });
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
      const fullContactPhone = phonePrefix + contactPhone;
      const payload = {
        event_id: event?.id || eventId,
        participants: passengers.map((p, idx) => ({
          ...p,
          age_at_event: computeAge(p.birth_date),
          // Fallback to main contact if not set (passenger #1 always uses main)
          phone: p.phone || (idx === 0 ? fullContactPhone : fullContactPhone),
          email: p.email || (idx === 0 ? contactEmail : contactEmail),
          flight_id: outboundFlight || null,
          return_flight_id: returnFlight || null,
          room_id: selectedRoom || null,
          ticket_id: selectedTicket || null,
        })),
        total_price: totalPrice,
        mode: event?.mode || "registration",
        contact_email: contactEmail,
        contact_phone: fullContactPhone,
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
    if (step === 2) {
      const required: string[] = [];
      if (availableFlights.length > 0) required.push("outbound", "return");
      if (availableRooms.length > 0) required.push("room");
      if (availableTickets.length > 0) required.push("ticket");
      const allDecided = required.every((k) => decided.has(k));
      const hasAnySelection = !!(outboundFlight || returnFlight || selectedRoom || selectedTicket);
      return allDecided && hasAnySelection;
    }
    if (step === 3) {
      const basicValid = passengers.every((p) => p.first_name_en && p.last_name_en && p.passport_number && p.passport_expiry && p.birth_date) && contactEmail && contactPhone;
      if (!basicValid) return false;
      // Terms checkbox required if phone entered
      if (contactPhone && !agreedTerms) return false;
      // Min age check
      const minAge = (event as any)?.min_age;
      if (minAge) {
        for (const p of passengers) {
          const age = computeAge(p.birth_date);
          if (age !== null && age < minAge) return false;
        }
      }
      return true;
    }
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
          <p className="text-gray-600 mb-6">תודה שבחרת ב-ENG TOURS. אנו ניצור איתך קשר בקרוב.</p>

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

      <header className="bg-gradient-to-l from-primary-800 to-primary-600 text-white py-6 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ENG TOURS" className="h-14 w-auto object-contain" />
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

              const totalSections = sections.length;
              const markDecided = (key: string) => setDecided((prev) => new Set(prev).add(key));

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

                  {sections.map((sec, secIdx) => {
                    const open = openSection === sec.key;
                    const wasDecided = decided.has(sec.key);
                    return (
                      <div key={sec.key} className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${open ? "border-primary-300" : wasDecided ? "border-green-200" : "border-red-200"}`}>
                        <button
                          type="button"
                          onClick={() => setOpenSection(open ? null : sec.key)}
                          className={`w-full p-4 flex items-center justify-between gap-3 ${open ? "bg-primary-50" : "hover:bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-2xl">{sec.icon}</span>
                            <div className="text-right flex-1 min-w-0">
                              <div className="font-semibold text-gray-800 flex items-center gap-2">
                                <span>{sec.label}</span>
                                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-normal">שלב {secIdx + 1}/{totalSections}</span>
                                {!wasDecided && <span className="text-xs text-red-600 font-normal">⚠ חובה לבחור</span>}
                              </div>
                              {!open && wasDecided && (
                                <div className="text-xs mt-0.5 truncate text-green-700">
                                  ✓ {summary(sec.key)}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                            {open ? "▲ סגור" : wasDecided ? "✏️ פתח" : "▼ פתח"}
                          </span>
                        </button>

                        {open && (
                          <div className="p-4 border-t border-gray-100 space-y-2">
                            {sec.key === "outbound" && (
                              <>
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                                  onClick={() => { setOutboundFlight(""); markDecided("outbound"); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="outbound" checked={!outboundFlight} readOnly />
                                  <span className="text-sm text-gray-600">ללא טיסת הלוך</span>
                                </label>
                                {availableFlights.map((f) => {
                                  const remaining = (f.total_seats || 0) - (f.booked_seats || 0);
                                  return (
                                    <label key={f.id}
                                      onClick={() => { setOutboundFlight(f.id); markDecided("outbound"); setTimeout(() => goToNext(sec.key), 200); }}
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
                                  onClick={() => { setReturnFlight(""); markDecided("return"); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="return" checked={!returnFlight} readOnly />
                                  <span className="text-sm text-gray-600">ללא טיסת חזור</span>
                                </label>
                                {availableFlights.filter((f) => f.id !== outboundFlight).map((f) => {
                                  const remaining = (f.total_seats || 0) - (f.booked_seats || 0);
                                  return (
                                    <label key={f.id}
                                      onClick={() => { setReturnFlight(f.id); markDecided("return"); setTimeout(() => goToNext(sec.key), 200); }}
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
                                  onClick={() => { setSelectedRoom(""); markDecided("room"); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="room" checked={!selectedRoom} readOnly />
                                  <span className="text-sm text-gray-600">ללא מלון</span>
                                </label>
                                {availableRooms.map((r) => {
                                  const remainingRooms = (r.total_rooms || 0) - (r.booked_rooms || 0);
                                  return (
                                    <label key={r.id}
                                      onClick={() => { setSelectedRoom(r.id); markDecided("room"); setTimeout(() => goToNext(sec.key), 200); }}
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
                                  onClick={() => { setSelectedTicket(""); markDecided("ticket"); setTimeout(() => goToNext(sec.key), 200); }}>
                                  <input type="radio" name="ticket" checked={!selectedTicket} readOnly />
                                  <span className="text-sm text-gray-600">ללא כרטיס</span>
                                </label>
                                {availableTickets.map((t) => {
                                  const remaining = (t.total_qty || 0) - (t.booked_qty || 0);
                                  return (
                                    <label key={t.id}
                                      onClick={() => { setSelectedTicket(t.id); markDecided("ticket"); setTimeout(() => goToNext(sec.key), 200); }}
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

                  <label className={`flex items-start gap-2 mt-4 p-3 rounded-lg border cursor-pointer transition-colors ${contactPhone && !agreedTerms ? "bg-orange-50 border-orange-300" : "bg-white border-primary-200"}`}>
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary-700 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-700 leading-relaxed">
                      על ידי מסירת הפרטים שלך הינך מאשר/ת את{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline font-medium">תנאי שימוש</a>
                      {" ו-"}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline font-medium">מדיניות פרטיות</a>
                      .
                      {contactPhone && !agreedTerms && (
                        <span className="block text-[11px] text-orange-700 font-semibold mt-1">⚠ חובה לאשר כדי להמשיך</span>
                      )}
                    </span>
                  </label>
                </div>

                <div className="space-y-4">
                  {passengers.map((p, i) => (
                    <PassengerCard key={i} passenger={p} index={i} onChange={(field, val) => updatePassenger(i, field, val)} phonePrefixes={phonePrefixes} minAge={(event as any)?.min_age} isDomestic={(event as any)?.is_domestic} />
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
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setFaqOpen(!faqOpen)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50"
            >
              <h3 className="text-xl font-bold text-primary-900">❓ שאלות ותשובות <span className="text-sm font-normal text-gray-500 mr-2">({faqs.length})</span></h3>
              <span className={`text-primary-500 text-lg transition-transform ${faqOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
            {faqOpen && (
              <div className="px-6 pb-6 space-y-2 border-t border-gray-100 pt-4">
                {faqs.map((faq) => {
                  const isOpen = openFaq === faq.id;
                  return (
                    <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                        className="w-full p-3 text-right cursor-pointer hover:bg-gray-50 flex items-center justify-between text-sm font-medium text-gray-800"
                      >
                        <span>{faq.question}</span>
                        <span className={`text-primary-500 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                      </button>
                      {isOpen && (
                        <div className="p-3 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="text-center py-6 text-xs text-gray-500">
        © ENG TOURS - כל הזכויות שמורות
      </footer>
    </div>
  );
}

function PassengerCard({ passenger, index, onChange, phonePrefixes, minAge, isDomestic }: {
  passenger: Passenger;
  index: number;
  onChange: (field: keyof Passenger, value: any) => void;
  phonePrefixes: { value: string; label: string }[];
  minAge?: number | null;
  isDomestic?: boolean;
}) {
  const [showContact, setShowContact] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ocrAttempts, setOcrAttempts] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [docType, setDocType] = useState<"passport" | "id_card" | "drivers_license">(isDomestic ? "id_card" : "passport");
  const fileRef = useRef<HTMLInputElement>(null);
  const allowExtraContact = index > 0;

  const docTypeLabels: Record<string, string> = {
    passport: "דרכון",
    id_card: "תעודת זהות",
    drivers_license: "רישיון נהיגה",
  };

  const hasImage = !!passenger.passport_image_url;
  const hasOcrData = !!passenger.passport_data;
  const ocrExhausted = ocrAttempts >= 3;
  const fieldsLocked = hasOcrData && !manualMode && !ocrExhausted;

  async function handleUpload(file: File) {
    setUploading(true); setOcrError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("document_type", docType);
      const res = await fetch("/api/passport/ocr", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");

      if (!data.is_valid || !data.data?.document_number) {
        setOcrAttempts((n) => n + 1);
        throw new Error(`לא זוהה ${docTypeLabels[docType]} תקין. ודא שהתמונה ברורה.`);
      }

      const d = data.data;
      if (d.given_names || d.full_name_en) {
        const given = d.given_names || d.full_name_en?.split(/\s+/).slice(0, -1).join(" ") || "";
        onChange("first_name_en", given);
      }
      if (d.surname) onChange("last_name_en", d.surname);
      if (d.document_number) onChange("passport_number", d.document_number);
      if (d.expiry_date) onChange("passport_expiry", d.expiry_date);
      if (d.birth_date) onChange("birth_date", d.birth_date);
      if (data.image_url) onChange("passport_image_url", data.image_url);
      onChange("passport_data", data);
      onChange("document_type" as any, docType);
    } catch (e: any) {
      setOcrError(e.message || "שגיאה");
      setOcrAttempts((n) => n + 1);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-primary-700">נוסע #{index + 1}</h4>
        {!manualMode && (
          hasOcrData ? (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-800 border border-green-200 px-2 py-1 rounded-full">✓ {docTypeLabels[docType]} אומת</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("המסמך כבר נבדק. האם להחליף לצילום חדש?")) fileRef.current?.click();
                }}
                className="text-xs text-gray-500 hover:text-primary-700 underline"
              >
                החלף
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50"
            >
              {uploading ? "מעלה..." : `📷 העלה צילום ${docTypeLabels[docType]}`}
            </button>
          )
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
      </div>

      {isDomestic && !hasOcrData && !manualMode && (
        <div className="mb-3 flex gap-2 flex-wrap">
          <span className="text-xs text-gray-600 self-center">סוג מסמך:</span>
          {(["id_card", "drivers_license", "passport"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setDocType(t)}
              className={`text-xs px-3 py-1 rounded-full border transition ${docType === t ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
              {docTypeLabels[t]}
            </button>
          ))}
        </div>
      )}

      {ocrError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs mb-3">
          ❌ {ocrError} <span className="text-gray-500">(ניסיון {ocrAttempts}/3)</span>
        </div>
      )}

      {ocrExhausted && !manualMode && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3 text-xs">
          <div className="font-semibold text-yellow-800 mb-1">⚠ זיהוי אוטומטי לא הצליח אחרי 3 ניסיונות</div>
          <div className="text-yellow-700 mb-2">אפשר להזין את הפרטים ידנית:</div>
          <button type="button" onClick={() => setManualMode(true)}
            className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700">
            ✏️ עבור להזנה ידנית
          </button>
        </div>
      )}

      {hasImage && (
        <div className="mb-3 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={passenger.passport_image_url} alt="passport" className="h-16 w-24 object-cover rounded border border-gray-200" />
          <span className="text-xs text-green-700">✓ תמונת דרכון הועלתה</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">שם פרטי (באנגלית) *</label>
          <input type="text" value={passenger.first_name_en} onChange={(e) => onChange("first_name_en", e.target.value)} required dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">שם משפחה (באנגלית) *</label>
          <input type="text" value={passenger.last_name_en} onChange={(e) => onChange("last_name_en", e.target.value)} required dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">מספר {docTypeLabels[docType]} *</label>
          <input type="text" value={passenger.passport_number} onChange={(e) => onChange("passport_number", e.target.value)} required dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">תוקף {docTypeLabels[docType]} *</label>
          <input type="date" value={passenger.passport_expiry} onChange={(e) => onChange("passport_expiry", e.target.value)} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            תאריך לידה *
            {passenger.birth_date && computeAge(passenger.birth_date) !== null && (() => {
              const age = computeAge(passenger.birth_date)!;
              const min = minAge;
              if (min && age < min) {
                return <span className="text-red-600 mr-2 font-bold">· גיל: {age} ⚠ מתחת למינימום ({min})</span>;
              }
              return <span className="text-primary-700 mr-2">· גיל: {age}</span>;
            })()}
          </label>
          <input type="date" value={passenger.birth_date} onChange={(e) => onChange("birth_date", e.target.value)} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
        </div>
      </div>

      {allowExtraContact && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowContact(!showContact)}
            className="text-xs text-primary-700 hover:text-primary-900 font-medium flex items-center gap-1"
          >
            <span>{showContact ? "▲" : "▼"}</span>
            <span>📇 פרטי איש קשר נוסף (אופציונלי)</span>
            {(passenger.phone || passenger.email) && !showContact && <span className="text-green-600 mr-1">✓</span>}
          </button>
          {showContact && (() => {
            // Parse existing phone into prefix + number
            const fullPhone = passenger.phone || "";
            const matchedPrefix = phonePrefixes.find((p) => fullPhone.startsWith(p.value))?.value;
            const m = fullPhone.match(/^(\+\d{1,4})(.*)$/);
            const currentPrefix = matchedPrefix || (m ? m[1] : "+972");
            const currentNumber = matchedPrefix ? fullPhone.slice(matchedPrefix.length) : (m ? m[2] : fullPhone);

            const updatePhone = (prefix: string, number: string) => {
              const cleaned = number.replace(/[^0-9]/g, "");
              onChange("phone", cleaned ? prefix + cleaned : "");
            };

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">מייל</label>
                  <input type="email" value={passenger.email || ""} onChange={(e) => onChange("email", e.target.value)} dir="ltr"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">טלפון</label>
                  <div className="flex gap-1" dir="ltr">
                    <input
                      type="text"
                      value={currentPrefix}
                      onChange={(e) => updatePhone(e.target.value, currentNumber)}
                      placeholder="+972"
                      className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-primary-500 outline-none"
                    />
                    <input
                      type="tel"
                      value={currentNumber}
                      onChange={(e) => updatePhone(currentPrefix, e.target.value)}
                      placeholder="524802830"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
