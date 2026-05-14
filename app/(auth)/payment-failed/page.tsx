"use client";

import { AlertCircle } from "lucide-react";

export default function PaymentFailedPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: "#222222", maxWidth: "390px", margin: "0 auto", padding: "0 24px" }}
    >
      {/* Logo */}
      <div className="flex justify-center" style={{ marginTop: "48px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/wgy-logo-white.png"
          alt="WGY"
          style={{ height: "40px", width: "auto" }}
        />
      </div>

      <div className="flex flex-col items-center text-center" style={{ marginTop: "64px" }}>
        <AlertCircle size={48} color="#C0392B" strokeWidth={1.5} />

        <h1
          className="font-playfair italic font-normal text-white"
          style={{ fontSize: "28px", marginTop: "20px" }}
        >
          Payment Failed
        </h1>

        <p
          className="font-montserrat font-normal"
          style={{ fontSize: "13px", color: "#706b6b", marginTop: "10px", lineHeight: 1.6 }}
        >
          Your membership payment was unsuccessful.
          <br />
          Please update your payment details to continue.
        </p>

        {/* Update payment button */}
        <button
          className="w-full font-montserrat font-semibold"
          style={{
            height: "48px",
            borderRadius: "8px",
            background: "#e4dcd1",
            color: "#222222",
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            marginTop: "32px",
          }}
          onClick={() => {
            // TODO Phase 3: Add Stripe portal URL
            window.location.href = "#";
          }}
        >
          Update Payment Details
        </button>

        {/* Contact link */}
        <a
          href="mailto:support@wegotyouagency.com"
          className="font-montserrat font-normal"
          style={{ fontSize: "13px", color: "#706b6b", marginTop: "16px", textDecoration: "none" }}
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}
