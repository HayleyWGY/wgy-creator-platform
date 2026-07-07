"use client";

import { CreditCard, Clock } from "lucide-react";

export default function AutomationsPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          Automations
        </p>
        <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>Event Automations</h1>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "560px", lineHeight: 1.5 }}>
          &ldquo;When this happens, do that&rdquo; rules that fire off the back of events — separate from the timed <strong style={{ color: "var(--text)" }}>Onboarding</strong> sequence.
        </p>
      </div>

      <div style={{ padding: "0 32px 40px", maxWidth: "620px" }}>
        <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", padding: "20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CreditCard size={18} color="var(--accent)" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <p className="font-montserrat font-semibold" style={{ fontSize: "14px", color: "var(--text)" }}>Payment-failed nudge</p>
              <span className="font-montserrat font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.08em", background: "rgba(155,126,86,0.3)", color: "#e4aa55", padding: "3px 8px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Clock size={9} /> Arrives with Stripe
              </span>
            </div>
            <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.6 }}>
              When Stripe reports a failed payment, this will automatically DM the creator asking them to update their card. It switches on as part of the Stripe billing integration — nothing to configure here until then.
            </p>
          </div>
        </div>

        <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "16px", lineHeight: 1.6 }}>
          More automation triggers (win-back for inactive members, post-application follow-ups) can be added here later — just say the word.
        </p>
      </div>
    </div>
  );
}
