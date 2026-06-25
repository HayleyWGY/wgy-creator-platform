"use client";

import { AlertCircle } from "lucide-react";
import { WgyButton } from "@/components/ui/wgy-button";

export default function PaymentFailedPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: "var(--bg)", maxWidth: "390px", margin: "0 auto", padding: "0 24px" }}
    >
      {/* Logo (theme-aware via CSS mask) */}
      <div className="flex justify-center" style={{ marginTop: "48px" }}>
        <span className="wgy-logo" role="img" aria-label="WGY" style={{ height: "40px", width: "96px", display: "block" }} />
      </div>

      <div className="flex flex-col items-center text-center" style={{ marginTop: "64px" }}>
        <AlertCircle size={48} strokeWidth={1.5} style={{ color: "var(--error)" }} />

        <h1
          className="font-montserrat"
          style={{ fontSize: "28px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em", color: "var(--text)", marginTop: "20px" }}
        >
          Payment <em className="font-accent" style={{ textTransform: "none" }}>failed</em>
        </h1>

        <p
          className="font-montserrat"
          style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginTop: "10px", lineHeight: 1.6 }}
        >
          Your membership payment was unsuccessful.
          <br />
          Please update your payment details to continue.
        </p>

        {/* Update payment button */}
        <WgyButton
          variant="primary"
          fullWidth
          style={{ marginTop: "32px" }}
          onClick={() => {
            // TODO Phase 3: Add Stripe portal URL
            window.location.href = "#";
          }}
        >
          Update Payment Details
        </WgyButton>

        {/* Contact link */}
        <a
          href="mailto:support@wegotyouagency.com"
          className="font-montserrat"
          style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginTop: "16px", textDecoration: "none" }}
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}
