"use client";

import { useState } from "react";
import LeadForm, { InterestOption } from "./lead-form";

export default function HeroBody({
  slug,
  affiliateCode,
  introText,
  customHtml,
  theme,
  interestOptions,
}: {
  slug: string;
  affiliateCode: string;
  introText: string;
  customHtml: string;
  theme: string;
  interestOptions: InterestOption[];
}) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      {!submitted && introText && (
        <p className="text-base md:text-lg leading-relaxed text-white/85 text-center mb-5 whitespace-pre-line">
          {introText}
        </p>
      )}
      {!submitted && customHtml && (
        <div className="mb-5 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: customHtml }} />
      )}
      <LeadForm
        slug={slug}
        affiliateCode={affiliateCode}
        theme={theme}
        interestOptions={interestOptions}
        onSuccess={() => setSubmitted(true)}
      />
      {!submitted && (
        <p className="mt-5 text-center text-[11px] text-white/55">
          הפרטים נשמרים אצלנו בלבד. נשלח אליך מידע רק לגבי האירוע הזה.
        </p>
      )}
    </>
  );
}
