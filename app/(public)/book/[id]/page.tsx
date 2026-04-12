"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

// ============================================
// Types
// ============================================
interface EventData {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  min_age: number | null;
  max_age: number | null;
  mode: string;
}

interface FlightOption {
  id: string;
  airline_name: string;
  flight_code: string;
  origin_city: string;
  dest_city: string;
  departure_time: string;
  price_customer: number;
  total_seats: number;
  booked_seats: number;
}

interface RoomOption {
  id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  price_customer: number;
  capacity: number;
  total_rooms: number;
  booked_rooms: number;
  hotel_name?: string;
}

interface TicketOption {
  id: string;
  name: string;
  price_customer: number;
  total_qty: number;
  booked_qty: number;
}

interface PackageOption {
  id: string;
  name: string;
  service_level: string;
  price_total: number;
}

interface Participant {
  first_name_en: string;
  last_name_en: string;
  passport_number: string;
  passport_expiry: string;
  birth_date: string;
  phone: string;
  email: string;
  passport_image_url: string;
  flight_id: string;
  room_id: string;
  ticket_id: string;
  package_id: string;
  age_at_event: number | null;
}

interface CouponResult {
  valid: boolean;
  discount_type?: string;
  discount_value?: number;
  applies_to?: string;
  error?: string;
}

// ============================================
// Constants
// ============================================
const STEPS = [
  "כמות משתתפים",
  "פרטי משתתפים",
  "בחירת שירותים",
  "קוד קופון",
  "סיכום מחירים",
  "שליחה",
  "אישור",
];

const emptyParticipant = (): Participant => ({
  first_name_en: "",
  last_name_en: "",
  passport_number: "",
  passport_expiry: "",
  birth_date: "",
  phone: "",
  email: "",
  passport_image_url: "",
  flight_id: "",
  room_id: "",
  ticket_id: "",
  package_id: "",
  age_at_event: null,
});

// ============================================
// Component
// ============================================
export default function PublicBookingPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [participantCount, setParticipantCount] = useState(1);

  // Step 2
  const [participants, setParticipants] = useState<Participant[]>([
    emptyParticipant(),
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Step 3 - service options
  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);

  // Step 4
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Step 7
  const [orderId, setOrderId] = useState("");
  const [, setShareToken] = useState("");

  // Auto-save ref
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Fetch event data
  // ============================================
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data.event);
        }
      } catch (err) {
        console.error("Failed to fetch event:", err);
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchEvent();
  }, [eventId]);

  // Fetch service options when reaching step 3
  useEffect(() => {
    if (step === 3 && eventId) {
      const fetchServices = async () => {
        try {
          const [flightsRes, roomsRes, ticketsRes, packagesRes] =
            await Promise.all([
              fetch(`/api/flights?event_id=${eventId}`),
              fetch(`/api/rooms?event_id=${eventId}`),
              fetch(`/api/tickets?event_id=${eventId}`),
              fetch(`/api/packages?event_id=${eventId}`),
            ]);

          if (flightsRes.ok) {
            const d = await flightsRes.json();
            setFlights(d.flights || []);
          }
          if (roomsRes.ok) {
            const d = await roomsRes.json();
            setRooms(d.rooms || []);
          }
          if (ticketsRes.ok) {
            const d = await ticketsRes.json();
            setTickets(d.tickets || []);
          }
          if (packagesRes.ok) {
            const d = await packagesRes.json();
            setPackages(d.packages || []);
          }
        } catch (err) {
          console.error("Failed to fetch services:", err);
        }
      };
      fetchServices();
    }
  }, [step, eventId]);

  // ============================================
  // Auto-save draft every 30 seconds
  // ============================================
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (step < 6) {
        const draft = {
          eventId,
          step,
          participantCount,
          participants,
          couponCode,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(`booking_draft_${eventId}`, JSON.stringify(draft));
      }
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [step, participantCount, participants, couponCode, eventId]);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`booking_draft_${eventId}`);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.participants?.length > 0) {
          setParticipantCount(draft.participantCount || 1);
          setParticipants(draft.participants);
          setCouponCode(draft.couponCode || "");
        }
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  // ============================================
  // Helpers
  // ============================================
  const calculateAge = (birthDate: string, eventStartDate: string): number => {
    const birth = new Date(birthDate);
    const eventDate = new Date(eventStartDate);
    let age = eventDate.getFullYear() - birth.getFullYear();
    const m = eventDate.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && eventDate.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const validatePassportExpiry = (
    expiryDate: string,
    eventEndDate: string
  ): boolean => {
    const expiry = new Date(expiryDate);
    const eventEnd = new Date(eventEndDate);
    const sixMonthsAfter = new Date(eventEnd);
    sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);
    return expiry >= sixMonthsAfter;
  };

  const updateParticipant = (
    index: number,
    field: keyof Participant,
    value: string | number | null
  ) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-calc age
      if (field === "birth_date" && event?.start_date && value) {
        updated[index].age_at_event = calculateAge(
          value as string,
          event.start_date
        );
      }

      return updated;
    });
  };

  const getParticipantPrice = useCallback(
    (p: Participant): number => {
      if (p.package_id) {
        const pkg = packages.find((pk) => pk.id === p.package_id);
        return pkg ? Number(pkg.price_total) : 0;
      }
      let price = 0;
      if (p.flight_id) {
        const f = flights.find((fl) => fl.id === p.flight_id);
        if (f) price += Number(f.price_customer);
      }
      if (p.room_id) {
        const r = rooms.find((rm) => rm.id === p.room_id);
        if (r) price += Number(r.price_customer);
      }
      if (p.ticket_id) {
        const t = tickets.find((tk) => tk.id === p.ticket_id);
        if (t) price += Number(t.price_customer);
      }
      return price;
    },
    [flights, rooms, tickets, packages]
  );

  const getTotalPrice = useCallback((): number => {
    return participants.reduce(
      (sum, p) => sum + getParticipantPrice(p),
      0
    );
  }, [participants, getParticipantPrice]);

  const getDiscount = useCallback((): number => {
    if (!couponResult?.valid) return 0;
    const total = getTotalPrice();
    if (couponResult.discount_type === "percent") {
      return total * (Number(couponResult.discount_value) / 100);
    }
    return Number(couponResult.discount_value || 0);
  }, [couponResult, getTotalPrice]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // ============================================
  // OCR handler
  // ============================================
  const handlePassportOCR = async (index: number, file: File) => {
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ocr/passport", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const d = result.data;
          setParticipants((prev) => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              first_name_en: d.first_name || updated[index].first_name_en,
              last_name_en: d.last_name || updated[index].last_name_en,
              passport_number:
                d.passport_number || updated[index].passport_number,
              passport_expiry:
                d.expiry_date || updated[index].passport_expiry,
              birth_date: d.birth_date || updated[index].birth_date,
            };
            if (d.birth_date && event?.start_date) {
              updated[index].age_at_event = calculateAge(
                d.birth_date,
                event.start_date
              );
            }
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("OCR failed:", err);
    } finally {
      setOcrLoading(false);
    }
  };

  // ============================================
  // Coupon validation
  // ============================================
  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, event_id: eventId }),
      });
      if (res.ok) {
        const result = await res.json();
        setCouponResult(result);
      }
    } catch {
      setCouponResult({ valid: false, error: "שגיאה באימות" });
    } finally {
      setValidatingCoupon(false);
    }
  };

  // ============================================
  // Submit order
  // ============================================
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const stockRes = await fetch(`/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          mode: event?.mode || "payment",
          participants: participants.map((p) => ({
            ...p,
            age_at_event:
              p.birth_date && event?.start_date
                ? calculateAge(p.birth_date, event.start_date)
                : null,
          })),
          coupon_code: couponResult?.valid ? couponCode : null,
        }),
      });

      if (stockRes.ok) {
        const data = await stockRes.json();
        setOrderId(data.order.id);
        setShareToken(data.order.share_token);
        localStorage.removeItem(`booking_draft_${eventId}`);
        setStep(7);
      } else {
        const err = await stockRes.json();
        alert(err.error || "שגיאה בשליחת ההזמנה");
      }
    } catch {
      alert("שגיאה בשליחת ההזמנה");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // Validation per step
  // ============================================
  const canProceed = (): boolean => {
    if (step === 1) return participantCount >= 1 && participantCount <= 10;
    if (step === 2) {
      return participants.every((p) => {
        const hasName = p.first_name_en.trim() && p.last_name_en.trim();
        const hasPassport = p.passport_number.trim();
        const hasBirthDate = p.birth_date;

        if (p.passport_expiry && event?.end_date) {
          if (!validatePassportExpiry(p.passport_expiry, event.end_date)) {
            return false;
          }
        }

        if (p.birth_date && event?.start_date) {
          const age = calculateAge(p.birth_date, event.start_date);
          if (event.min_age && age < event.min_age) return false;
          if (event.max_age && age > event.max_age) return false;
        }

        return hasName && hasPassport && hasBirthDate;
      });
    }
    if (step === 3) {
      return participants.every(
        (p) => p.package_id || p.flight_id || p.room_id || p.ticket_id
      );
    }
    return true;
  };

  // ============================================
  // Step navigation
  // ============================================
  const nextStep = () => {
    if (step === 1) {
      const newArr = [...participants];
      while (newArr.length < participantCount) newArr.push(emptyParticipant());
      while (newArr.length > participantCount) newArr.pop();
      setParticipants(newArr);
      setActiveTab(0);
    }
    if (step === 6) {
      handleSubmit();
      return;
    }
    setStep((s) => Math.min(s + 1, 7));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // ============================================
  // Loading / Error states
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">טוען...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            אירוע לא נמצא
          </h2>
          <p className="text-gray-500">הקישור לא תקין או שהאירוע אינו פעיל</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-primary-700 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold">ENG Tours</h1>
          <p className="text-white/80 mt-1">{event.name}</p>
          {event.start_date && event.end_date && (
            <p className="text-white/60 text-sm mt-1">
              {new Date(event.start_date).toLocaleDateString("he-IL")} -{" "}
              {new Date(event.end_date).toLocaleDateString("he-IL")}
            </p>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      {step < 7 && (
        <div className="max-w-3xl mx-auto px-4 mt-6 mb-8">
          <div className="flex items-center justify-between">
            {STEPS.slice(0, 6).map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              return (
                <div key={i} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isActive
                          ? "bg-primary-700 text-white shadow-md"
                          : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isCompleted ? "\u2713" : stepNum}
                    </div>
                    <span
                      className={`text-[10px] mt-1 whitespace-nowrap hidden sm:block ${
                        isActive
                          ? "text-primary-700 font-semibold"
                          : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 5 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 ${
                        step > stepNum ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-4">
        {/* ========== STEP 1: Participant Count ========== */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
              כמה משתתפים?
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setParticipantCount(n)}
                  className={`w-14 h-14 rounded-xl text-lg font-bold transition-all ${
                    participantCount === n
                      ? "bg-primary-700 text-white shadow-md scale-110"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-4">
              ניתן להזמין עד 10 משתתפים בהזמנה אחת
            </p>
          </div>
        )}

        {/* ========== STEP 2: Participant Details ========== */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              פרטי משתתפים
            </h3>

            {/* Tabs */}
            {participants.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {participants.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === i
                        ? "bg-primary-700 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    משתתף {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Active participant form */}
            {participants[activeTab] && (
              <div className="space-y-4">
                {/* Passport OCR */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    צילום דרכון (אופציונלי - מילוי אוטומטי)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePassportOCR(activeTab, file);
                      }}
                      className="flex-1 text-sm file:ml-2 file:rounded-lg file:border-0 file:bg-primary-700 file:text-white file:px-3 file:py-1.5 file:text-sm file:cursor-pointer"
                    />
                    {ocrLoading && (
                      <span className="text-sm text-blue-600 self-center">
                        מזהה...
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם פרטי (באנגלית) *
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={participants[activeTab].first_name_en}
                      onChange={(e) =>
                        updateParticipant(
                          activeTab,
                          "first_name_en",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="FIRST NAME"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם משפחה (באנגלית) *
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={participants[activeTab].last_name_en}
                      onChange={(e) =>
                        updateParticipant(
                          activeTab,
                          "last_name_en",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="LAST NAME"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מספר דרכון *
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={participants[activeTab].passport_number}
                      onChange={(e) =>
                        updateParticipant(
                          activeTab,
                          "passport_number",
                          e.target.value
                        )
                      }
                      placeholder="12345678"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      תוקף דרכון
                    </label>
                    <input
                      type="date"
                      value={participants[activeTab].passport_expiry}
                      onChange={(e) =>
                        updateParticipant(
                          activeTab,
                          "passport_expiry",
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {participants[activeTab].passport_expiry &&
                      event?.end_date &&
                      !validatePassportExpiry(
                        participants[activeTab].passport_expiry,
                        event.end_date
                      ) && (
                        <p className="text-red-500 text-xs mt-1">
                          תוקף הדרכון חייב להיות לפחות 6 חודשים מסיום האירוע
                        </p>
                      )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      תאריך לידה *
                    </label>
                    <input
                      type="date"
                      value={participants[activeTab].birth_date}
                      onChange={(e) =>
                        updateParticipant(
                          activeTab,
                          "birth_date",
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {participants[activeTab].age_at_event !== null && (
                      <p className="text-xs text-gray-500 mt-1">
                        גיל במועד האירוע:{" "}
                        {participants[activeTab].age_at_event}
                        {event?.min_age &&
                          participants[activeTab].age_at_event !== null &&
                          participants[activeTab].age_at_event! <
                            event.min_age && (
                            <span className="text-red-500 mr-2">
                              {" "}(מתחת לגיל מינימום {event.min_age})
                            </span>
                          )}
                        {event?.max_age &&
                          participants[activeTab].age_at_event !== null &&
                          participants[activeTab].age_at_event! >
                            event.max_age && (
                            <span className="text-red-500 mr-2">
                              {" "}(מעל גיל מקסימום {event.max_age})
                            </span>
                          )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      טלפון
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={participants[activeTab].phone}
                      onChange={(e) =>
                        updateParticipant(activeTab, "phone", e.target.value)
                      }
                      placeholder="050-1234567"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      אימייל
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={participants[activeTab].email}
                      onChange={(e) =>
                        updateParticipant(activeTab, "email", e.target.value)
                      }
                      placeholder="email@example.com"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== STEP 3: Services ========== */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              בחירת שירותים
            </h3>

            {participants.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {participants.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === i
                        ? "bg-primary-700 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {p.first_name_en || `משתתף ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-5">
              {/* Packages */}
              {packages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    חבילה (כולל הכל)
                  </label>
                  <select
                    value={participants[activeTab]?.package_id || ""}
                    onChange={(e) => {
                      updateParticipant(activeTab, "package_id", e.target.value);
                      if (e.target.value) {
                        updateParticipant(activeTab, "flight_id", "");
                        updateParticipant(activeTab, "room_id", "");
                        updateParticipant(activeTab, "ticket_id", "");
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">ללא חבילה - בחירה ידנית</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.service_level}) -{" "}
                        {formatPrice(Number(pkg.price_total))}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Individual services */}
              {!participants[activeTab]?.package_id && (
                <>
                  {flights.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        טיסה
                      </label>
                      <select
                        value={participants[activeTab]?.flight_id || ""}
                        onChange={(e) =>
                          updateParticipant(activeTab, "flight_id", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">ללא טיסה</option>
                        {flights.map((f) => {
                          const available = f.total_seats - f.booked_seats;
                          return (
                            <option key={f.id} value={f.id} disabled={available <= 0}>
                              {f.airline_name} {f.flight_code} | {f.origin_city} - {f.dest_city} | {formatPrice(Number(f.price_customer))}
                              {available <= 5 && available > 0 ? ` (נותרו ${available})` : ""}
                              {available <= 0 ? " (אזל)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {rooms.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        חדר
                      </label>
                      <select
                        value={participants[activeTab]?.room_id || ""}
                        onChange={(e) =>
                          updateParticipant(activeTab, "room_id", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">ללא חדר</option>
                        {rooms.map((r) => {
                          const available = r.total_rooms - r.booked_rooms;
                          return (
                            <option key={r.id} value={r.id} disabled={available <= 0}>
                              {r.hotel_name ? `${r.hotel_name} - ` : ""}{r.room_type} | {formatPrice(Number(r.price_customer))}
                              {available <= 3 && available > 0 ? ` (נותרו ${available})` : ""}
                              {available <= 0 ? " (אזל)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {tickets.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        כרטיס
                      </label>
                      <select
                        value={participants[activeTab]?.ticket_id || ""}
                        onChange={(e) =>
                          updateParticipant(activeTab, "ticket_id", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">ללא כרטיס</option>
                        {tickets.map((t) => {
                          const available = t.total_qty - t.booked_qty;
                          return (
                            <option key={t.id} value={t.id} disabled={available <= 0}>
                              {t.name} | {formatPrice(Number(t.price_customer))}
                              {available <= 5 && available > 0 ? ` (נותרו ${available})` : ""}
                              {available <= 0 ? " (אזל)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ========== STEP 4: Coupon ========== */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              קוד קופון
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              יש לך קוד הנחה? הזן אותו כאן (אופציונלי)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponResult(null);
                }}
                placeholder="COUPON2026"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={validateCoupon}
                disabled={!couponCode.trim() || validatingCoupon}
                className="bg-primary-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50"
              >
                {validatingCoupon ? "בודק..." : "בדוק"}
              </button>
            </div>
            {couponResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-sm ${
                  couponResult.valid
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {couponResult.valid
                  ? `קופון תקף! הנחה: ${
                      couponResult.discount_type === "percent"
                        ? `${couponResult.discount_value}%`
                        : formatPrice(Number(couponResult.discount_value))
                    }`
                  : couponResult.error || "קופון לא תקף"}
              </div>
            )}
          </div>
        )}

        {/* ========== STEP 5: Price Summary ========== */}
        {step === 5 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              סיכום מחירים
            </h3>

            <div className="space-y-4">
              {participants.map((p, i) => {
                const price = getParticipantPrice(p);
                return (
                  <div key={i} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">
                        {p.first_name_en} {p.last_name_en}
                      </span>
                      <span className="font-bold text-primary-700">
                        {formatPrice(price)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {p.package_id && (
                        <div>חבילה: {packages.find((pk) => pk.id === p.package_id)?.name || "-"}</div>
                      )}
                      {!p.package_id && (
                        <>
                          {p.flight_id && (
                            <div>טיסה: {flights.find((f) => f.id === p.flight_id)?.airline_name || "-"} {flights.find((f) => f.id === p.flight_id)?.flight_code || ""}</div>
                          )}
                          {p.room_id && (
                            <div>חדר: {rooms.find((r) => r.id === p.room_id)?.room_type || "-"}</div>
                          )}
                          {p.ticket_id && (
                            <div>כרטיס: {tickets.find((t) => t.id === p.ticket_id)?.name || "-"}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{"סה\"כ לפני הנחה:"}</span>
                  <span>{formatPrice(getTotalPrice())}</span>
                </div>
                {getDiscount() > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>הנחה (קופון):</span>
                    <span>-{formatPrice(getDiscount())}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-primary-900 pt-2 border-t">
                  <span>{"סה\"כ לתשלום:"}</span>
                  <span>{formatPrice(Math.max(0, getTotalPrice() - getDiscount()))}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 6: Submit ========== */}
        {step === 6 && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {event.mode === "payment" ? "שליחת הזמנה ומעבר לתשלום" : "שליחת רישום"}
            </h3>
            {event.mode === "payment" ? (
              <p className="text-gray-500 mb-6">
                לאחר שליחת ההזמנה, כל משתתף יקבל קישור אישי לתשלום חלקו.
                ההזמנה תאושר לאחר השלמת כל התשלומים.
              </p>
            ) : (
              <p className="text-gray-500 mb-6">
                לאחר שליחת הטופס, ההזמנה תישלח לצוות ENG Tours לאישור.
                תקבלו עדכון במייל וב-WhatsApp.
              </p>
            )}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-right mb-6">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">אירוע:</span>
                <span className="font-medium">{event.name}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">משתתפים:</span>
                <span className="font-medium">{participants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{"סה\"כ:"}</span>
                <span className="font-bold text-primary-700">
                  {formatPrice(Math.max(0, getTotalPrice() - getDiscount()))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 7: Confirmation ========== */}
        {step === 7 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              ההזמנה נשלחה בהצלחה!
            </h3>
            <p className="text-gray-500 mb-6">
              מספר הזמנה: <span className="font-mono">{orderId?.slice(0, 8)}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `הזמנה חדשה ב-ENG Tours\nמספר: ${orderId?.slice(0, 8)}\nאירוע: ${event.name}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-600 transition-all"
              >
                שיתוף ב-WhatsApp
              </a>
              <a
                href={`mailto:?subject=אישור הזמנה ENG Tours&body=${encodeURIComponent(
                  `מספר הזמנה: ${orderId?.slice(0, 8)}\nאירוע: ${event.name}`
                )}`}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all"
              >
                שליחה במייל
              </a>
              {event.start_date && (
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${event.start_date.replace(/-/g, "")}/${(event.end_date || event.start_date).replace(/-/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary-700 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary-800 transition-all"
                >
                  הוספה ליומן
                </a>
              )}
            </div>
          </div>
        )}

        {/* ========== Navigation Buttons ========== */}
        {step < 7 && (
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
              >
                חזרה
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={nextStep}
              disabled={!canProceed() || submitting}
              className="bg-primary-700 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-all"
            >
              {submitting
                ? "שולח..."
                : step === 6
                  ? event.mode === "payment"
                    ? "שלח הזמנה"
                    : "שלח רישום"
                  : "המשך"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
