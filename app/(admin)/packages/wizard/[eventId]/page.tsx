"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

interface Passenger {
  first_name_en: string;
  last_name_en: string;
  passport_number: string;
  birth_date: string;
  phone: string;
  email: string;
}

export default function PackageWizardPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selections
  const [peopleCount, setPeopleCount] = useState(1);
  const [outboundFlight, setOutboundFlight] = useState<string>("");
  const [returnFlight, setReturnFlight] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [passengers, setPassengers] = useState<Passenger[]>([]);

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

  // Initialize passengers array when count changes
  useEffect(() => {
    setPassengers((prev) => {
      const next = [...prev];
      while (next.length < peopleCount) {
        next.push({ first_name_en: "", last_name_en: "", passport_number: "", birth_date: "", phone: "", email: "" });
      }
      return next.slice(0, peopleCount);
    });
  }, [peopleCount]);

  const flightOut = flights.find((f) => f.id === outboundFlight);
  const flightBack = flights.find((f) => f.id === returnFlight);
  const room = rooms.find((r) => r.id === selectedRoom);
  const ticket = tickets.find((t) => t.id === selectedTicket);

  const currency = flightOut?.currency || flightBack?.currency || room?.currency || ticket?.currency || "ILS";
  const flightOutPrice = (flightOut?.price_customer || 0) * peopleCount;
  const flightBackPrice = (flightBack?.price_customer || 0) * peopleCount;
  const roomPrice = (room?.price_customer || 0) * peopleCount;
  const ticketPrice = (ticket?.price_customer || 0) * peopleCount;
  const totalPrice = flightOutPrice + flightBackPrice + roomPrice + ticketPrice;

  const pricePerPerson = (flightOut?.price_customer || 0) + (flightBack?.price_customer || 0) + (room?.price_customer || 0) + (ticket?.price_customer || 0);

  function updatePassenger(idx: number, field: keyof Passenger, value: string) {
    setPassengers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSubmit() {
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
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        alert("הזמנה נוצרה בהצלחה!");
        router.push(`/orders/${data.id || data.order?.id}`);
      } else {
        const err = await res.json();
        alert("שגיאה: " + (err.error || "לא ידוע"));
      }
    } catch (e) {
      alert("שגיאה בשליחה");
    } finally { setSubmitting(false); }
  }

  function canGoNext() {
    if (step === 1) return peopleCount > 0;
    if (step === 2) return !!(outboundFlight || returnFlight || selectedRoom || selectedTicket);
    if (step === 3) return passengers.every((p) => p.first_name_en && p.last_name_en && p.passport_number && p.birth_date);
    return true;
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!event || event.error) return <div className="text-center text-red-500 py-12">אירוע לא נמצא</div>;

  const steps = [
    { num: 1, label: "כמות אנשים" },
    { num: 2, label: "בחירת שירותים" },
    { num: 3, label: "פרטי נוסעים" },
    { num: 4, label: "סיכום והזמנה" },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/packages" className="text-sm text-gray-500 hover:text-primary-700">← חזרה לחבילות</Link>
        <h2 className="text-2xl font-bold text-primary-900 mt-2">הזמנת חבילה - {event.name}</h2>
        {event.destination_country && <p className="text-sm text-gray-500 mt-1">📍 {event.destination_country}</p>}
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
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
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1: People count */}
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
              <p className="text-xs text-gray-400 mt-3">כל המחירים יחושבו לפי כמות האנשים</p>
            </div>
          )}

          {/* Step 2: Select services */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Outbound flight */}
              {flights.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">✈️ טיסת הלוך</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="outbound" checked={!outboundFlight} onChange={() => setOutboundFlight("")} />
                      <span className="text-sm text-gray-600">ללא טיסת הלוך</span>
                    </label>
                    {flights.map((f) => (
                      <label key={f.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        outboundFlight === f.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"
                      }`}>
                        <input type="radio" name="outbound" checked={outboundFlight === f.id} onChange={() => setOutboundFlight(f.id)} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">{f.airline_name} {f.flight_code}</span>
                            <span className="font-bold text-primary-700">{currencySymbol(f.currency)}{f.price_customer}/אדם</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {f.origin_iata} → {f.dest_iata}
                            {f.departure_time && ` · ${new Date(f.departure_time).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Return flight */}
              {flights.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🔁 טיסת חזור</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="return" checked={!returnFlight} onChange={() => setReturnFlight("")} />
                      <span className="text-sm text-gray-600">ללא טיסת חזור</span>
                    </label>
                    {flights.filter((f) => f.id !== outboundFlight).map((f) => (
                      <label key={f.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        returnFlight === f.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"
                      }`}>
                        <input type="radio" name="return" checked={returnFlight === f.id} onChange={() => setReturnFlight(f.id)} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">{f.airline_name} {f.flight_code}</span>
                            <span className="font-bold text-primary-700">{currencySymbol(f.currency)}{f.price_customer}/אדם</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {f.origin_iata} → {f.dest_iata}
                            {f.departure_time && ` · ${new Date(f.departure_time).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Rooms */}
              {rooms.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🏨 בחר חדר</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="room" checked={!selectedRoom} onChange={() => setSelectedRoom("")} />
                      <span className="text-sm text-gray-600">ללא מלון</span>
                    </label>
                    {rooms.map((r) => (
                      <label key={r.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedRoom === r.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"
                      }`}>
                        <input type="radio" name="room" checked={selectedRoom === r.id} onChange={() => setSelectedRoom(r.id)} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">{r.hotels?.name || "מלון"} - {r.room_type}</span>
                            <span className="font-bold text-primary-700">{currencySymbol(r.currency)}{r.price_customer}/אדם</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {r.capacity} אנשים בחדר
                            {r.check_in && ` · ${new Date(r.check_in).toLocaleDateString("he-IL")}`}
                            {r.check_out && ` ← ${new Date(r.check_out).toLocaleDateString("he-IL")}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tickets */}
              {tickets.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🎫 בחר כרטיס</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="ticket" checked={!selectedTicket} onChange={() => setSelectedTicket("")} />
                      <span className="text-sm text-gray-600">ללא כרטיס</span>
                    </label>
                    {tickets.map((t) => (
                      <label key={t.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedTicket === t.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"
                      }`}>
                        <input type="radio" name="ticket" checked={selectedTicket === t.id} onChange={() => setSelectedTicket(t.id)} className="mt-1" />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="font-medium text-gray-800">{t.name}</span>
                          <span className="font-bold text-primary-700">{currencySymbol(t.currency)}{t.price_customer}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Passenger details */}
          {step === 3 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">פרטי הנוסעים</h3>
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
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">טלפון</label>
                        <input type="tel" value={p.phone} onChange={(e) => updatePassenger(i, "phone", e.target.value)} dir="ltr"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">מייל</label>
                        <input type="email" value={p.email} onChange={(e) => updatePassenger(i, "email", e.target.value)} dir="ltr"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">סיכום ההזמנה</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">אירוע:</span>
                  <span className="font-medium">{event.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">כמות נוסעים:</span>
                  <span className="font-medium">{peopleCount}</span>
                </div>
                {flightOut && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">טיסת הלוך:</span>
                    <span className="font-medium">{flightOut.airline_name} {flightOut.flight_code}</span>
                  </div>
                )}
                {flightBack && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">טיסת חזור:</span>
                    <span className="font-medium">{flightBack.airline_name} {flightBack.flight_code}</span>
                  </div>
                )}
                {room && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">מלון:</span>
                    <span className="font-medium">{room.hotels?.name} - {room.room_type}</span>
                  </div>
                )}
                {ticket && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">כרטיס:</span>
                    <span className="font-medium">{ticket.name}</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">נוסעים:</h4>
                <div className="space-y-1 text-sm">
                  {passengers.map((p, i) => (
                    <div key={i} className="text-gray-600">
                      {i + 1}. {p.first_name_en} {p.last_name_en} · דרכון: {p.passport_number}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price Summary Sidebar */}
        <div>
          <div className="bg-white rounded-xl shadow-sm p-5 sticky top-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">💰 סיכום מחיר</h3>
            <div className="space-y-2 text-sm">
              {flightOut && (
                <div className="flex justify-between">
                  <span className="text-gray-600">✈️ הלוך × {peopleCount}</span>
                  <span className="font-medium">{currencySymbol(currency)}{flightOutPrice.toLocaleString()}</span>
                </div>
              )}
              {flightBack && (
                <div className="flex justify-between">
                  <span className="text-gray-600">🔁 חזור × {peopleCount}</span>
                  <span className="font-medium">{currencySymbol(currency)}{flightBackPrice.toLocaleString()}</span>
                </div>
              )}
              {room && (
                <div className="flex justify-between">
                  <span className="text-gray-600">🏨 חדר × {peopleCount}</span>
                  <span className="font-medium">{currencySymbol(currency)}{roomPrice.toLocaleString()}</span>
                </div>
              )}
              {ticket && (
                <div className="flex justify-between">
                  <span className="text-gray-600">🎫 כרטיס × {peopleCount}</span>
                  <span className="font-medium">{currencySymbol(currency)}{ticketPrice.toLocaleString()}</span>
                </div>
              )}
              {totalPrice > 0 && (
                <>
                  <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                    <span>לאדם אחד:</span>
                    <span>{currencySymbol(currency)}{pricePerPerson.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t-2 border-primary-200 flex justify-between items-baseline">
                    <span className="text-gray-700 font-medium">סה״כ:</span>
                    <span className="text-2xl font-bold text-primary-700">
                      {currencySymbol(currency)}{totalPrice.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-5 flex gap-2">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  חזור
                </button>
              )}
              {step < 4 ? (
                <button onClick={() => setStep(step + 1)} disabled={!canGoNext()}
                  className="flex-1 bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  הבא →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                  {submitting ? "שולח..." : "✓ אשר והזמן"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-primary-900 mb-3">❓ שאלות ותשובות</h3>
          <div className="space-y-2">
            {faqs.map((faq) => (
              <details key={faq.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <summary className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between text-sm font-medium text-gray-800">
                  <span>{faq.question}</span>
                  <span className="text-primary-500 text-xs">▼</span>
                </summary>
                <div className="p-3 pt-0 text-sm text-gray-600 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
