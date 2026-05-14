"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Globe, Link as LinkIcon, Music2, X, Plus, BellRing, Loader2 } from "lucide-react";

const SECTIONS = [
  { label: "PR / Gifted Campaigns",       slug: "pr-gifted-campaigns"  },
  { label: "Paid Collaborations",         slug: "paid-collaborations"  },
  { label: "TikTok Commission Campaigns", slug: "tiktok-commission"    },
  { label: "App Partners",                slug: "app-partners"         },
  { label: "Events",                      slug: "events"               },
  { label: "News & Updates",              slug: "news-updates"         },
];

const CAMPAIGN_TYPE_OPTIONS = [
  { label: "PR / Gifted", value: "pr-gifted"    },
  { label: "Paid Collab", value: "paid"         },
  { label: "Event",       value: "event"        },
  { label: "App Partners",value: "app-partners" },
];

const PAYMENT_TERMS_OPTIONS = ["On Delivery", "30 Days", "60 Days", "90 Days", "TBC"];

const inputBase: React.CSSProperties = {
  background: "#333333", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)",
  height: "44px", padding: "0 16px", color: "#ffffff", fontSize: "14px", outline: "none",
  width: "100%", caretColor: "#e4dcd1", fontFamily: "var(--font-montserrat)", fontWeight: 400,
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-montserrat)", fontWeight: 700, textTransform: "uppercase",
  fontSize: "10px", letterSpacing: "0.08em", color: "#706b6b", display: "block", marginBottom: "6px",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column" }}><span style={labelStyle}>{label}</span>{children}</div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#e4dcd1" }}>{children}</span>;
}
function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) { e.target.style.borderColor = "#e4dcd1"; }
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }

export default function EditCampaignPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading]     = useState(true);
  const [campaignType, setCampaignType] = useState("pr-gifted");
  const [title, setTitle]         = useState("");
  const [brand, setBrand]         = useState("");
  const [brandDesc, setBrandDesc] = useState("");
  const [oppDesc, setOppDesc]     = useState("");
  const [deliverables, setDeliverables] = useState<string[]>(["", ""]);
  const [website, setWebsite]     = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok]       = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [spots, setSpots]         = useState("");
  const [sectionSlug, setSectionSlug] = useState(SECTIONS[0].slug);
  const [status, setStatus]       = useState<"draft" | "publish">("draft");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  // Paid fields
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentTerms, setPaymentTerms]   = useState("");

  // Event fields
  const [eventDate, setEventDate]         = useState("");
  const [eventTime, setEventTime]         = useState("");
  const [eventLocation, setEventLocation] = useState("");

  // Image upload
  const [coverImageUrl, setCoverImageUrl]   = useState<string | null>(null);
  const [brandLogoUrl, setBrandLogoUrl]     = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo]   = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef  = useRef<HTMLInputElement>(null);

  const showDeliverables = campaignType === "pr-gifted" || campaignType === "paid";
  const showPayment      = campaignType === "paid";
  const showEventFields  = campaignType === "event";

  useEffect(() => {
    if (!id) return;
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then(({ campaign }) => {
        if (!campaign) return;
        setCampaignType(campaign.campaignType ?? "pr-gifted");
        setTitle(campaign.title ?? "");
        setBrand(campaign.brandName ?? "");
        setBrandDesc(campaign.brandDescription ?? "");
        setOppDesc(campaign.opportunityDescription ?? "");
        setDeliverables(campaign.deliverables?.length ? campaign.deliverables : ["", ""]);
        setWebsite(campaign.brandWebsite ?? "");
        setInstagram(campaign.brandInstagram ?? "");
        setTiktok(campaign.brandTikTok ?? "");
        setApplyLink(campaign.applyLinkUrl ?? "");
        setSpots(campaign.spotsRemaining != null ? String(campaign.spotsRemaining) : "");
        setSectionSlug(campaign.sectionSlug ?? SECTIONS[0].slug);
        setStatus(campaign.status === "published" ? "publish" : "draft");
        setCoverImageUrl(campaign.coverImageUrl ?? null);
        setBrandLogoUrl(campaign.brandLogoUrl ?? null);
        setPaymentAmount(campaign.paymentAmount ?? "");
        setPaymentTerms(campaign.paymentTerms ?? "");
        setEventDate(campaign.eventDate ? campaign.eventDate.split("T")[0] : "");
        setEventTime(campaign.eventTime ?? "");
        setEventLocation(campaign.eventLocation ?? "");
      })
      .catch(() => setError("Failed to load campaign."))
      .finally(() => setLoading(false));
  }, [id]);

  async function uploadFile(file: File, setter: (url: string) => void, setUploading: (v: boolean) => void) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "wgy-campaigns");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setter(data.url);
      else setError("Image upload failed.");
    } catch { setError("Image upload failed."); }
    finally { setUploading(false); }
  }

  async function handleSave(saveStatus: "draft" | "publish") {
    if (!title.trim() || !brand.trim()) { setError("Campaign title and brand name are required."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), brandName: brand.trim(),
          brandDescription: brandDesc.trim() || null,
          opportunityDescription: oppDesc.trim() || null,
          deliverables: showDeliverables ? deliverables.filter((d) => d.trim()) : [],
          brandWebsite: website.trim() || null,
          brandInstagram: instagram.trim() || null,
          brandTikTok: tiktok.trim() || null,
          applyLinkUrl: applyLink.trim() || null,
          spotsRemaining: spots ? parseInt(spots) : null,
          sectionSlug, campaignType, status: saveStatus,
          coverImageUrl, brandLogoUrl,
          paymentAmount: showPayment ? paymentAmount.trim() || null : null,
          paymentTerms: showPayment ? paymentTerms || null : null,
          eventDate: showEventFields ? eventDate || null : null,
          eventTime: showEventFields ? eventTime.trim() || null : null,
          eventLocation: showEventFields ? eventLocation.trim() || null : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to save."); return; }
      router.push("/admin/campaigns");
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px" }}>
        <Loader2 size={28} color="#706b6b" strokeWidth={1.5} className="animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "32px 32px 24px" }}>
        <Link href="/admin/campaigns" style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", marginBottom: "16px" }}>
          <ArrowLeft size={15} color="#706b6b" strokeWidth={1.5} />
          <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>Back to Campaigns</span>
        </Link>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#706b6b" }}>Edit Campaign</p>
        <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px", marginTop: "4px" }}>Edit Campaign</h1>
      </div>

      <div style={{ padding: "0 32px 32px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* LEFT */}
        <div style={{ background: "#2a2a2a", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "0" }}>

          {/* Campaign type selector */}
          <SectionLabel>Campaign Type</SectionLabel>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", marginBottom: "24px" }}>
            {CAMPAIGN_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCampaignType(opt.value)}
                className="font-montserrat font-semibold"
                style={{
                  padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "12px",
                  background: campaignType === opt.value ? "#e4dcd1" : "#2a2a2a",
                  color: campaignType === opt.value ? "#222222" : "#706b6b",
                  border: campaignType === opt.value ? "none" : "1px solid rgba(255,255,255,0.1)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <SectionLabel>Campaign Details</SectionLabel>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <Field label="Campaign Title">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title..."
                className="font-playfair italic font-normal"
                style={{ ...inputBase, height: "52px", fontSize: "20px", fontFamily: "var(--font-playfair)" }}
                onFocus={focusBorder} onBlur={blurBorder} />
            </Field>
            <Field label="Brand Name">
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Fwbeauty"
                className="font-montserrat font-normal" style={inputBase} onFocus={focusBorder} onBlur={blurBorder} />
            </Field>
          </div>

          {/* Event fields */}
          {showEventFields && (
            <div style={{ marginTop: "24px" }}>
              <SectionLabel>Event Details</SectionLabel>
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Field label="Event Date">
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                    className="font-montserrat font-normal" style={{ ...inputBase, colorScheme: "dark" }}
                    onFocus={focusBorder} onBlur={blurBorder} />
                </Field>
                <Field label="Event Time">
                  <input type="text" value={eventTime} onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g. 6:00 PM - 9:00 PM" className="font-montserrat font-normal"
                    style={inputBase} onFocus={focusBorder} onBlur={blurBorder} />
                </Field>
                <Field label="Location">
                  <input type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. Sephora Sheffield, London or Virtual"
                    className="font-montserrat font-normal" style={inputBase} onFocus={focusBorder} onBlur={blurBorder} />
                </Field>
              </div>
            </div>
          )}

          {/* Brand information */}
          <div style={{ marginTop: "24px" }}>
            <SectionLabel>Brand Information</SectionLabel>
            <div style={{ marginTop: "12px" }}>
              <Field label="About the Brand">
                <textarea value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="Tell creators about this brand..." rows={4} className="font-montserrat font-normal"
                  style={{ ...inputBase, height: "auto", padding: "12px 16px", resize: "vertical", lineHeight: "1.6" }}
                  onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
            </div>
          </div>

          {/* The Opportunity / About the Event */}
          <div style={{ marginTop: "24px" }}>
            <SectionLabel>{showEventFields ? "About the Event" : "The Opportunity"}</SectionLabel>
            <div style={{ marginTop: "12px" }}>
              <Field label="Description">
                <textarea value={oppDesc} onChange={(e) => setOppDesc(e.target.value)}
                  placeholder={showEventFields ? "Describe the event..." : "What does this campaign involve? Who are you looking for?"}
                  rows={4} className="font-montserrat font-normal"
                  style={{ ...inputBase, height: "auto", padding: "12px 16px", resize: "vertical", lineHeight: "1.6" }}
                  onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
            </div>
          </div>

          {/* Deliverables (PR/Gifted + Paid only) */}
          {showDeliverables && (
            <div style={{ marginTop: "24px" }}>
              <SectionLabel>Deliverables</SectionLabel>
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {deliverables.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e4dcd1", flexShrink: 0 }} />
                    <input type="text" value={d}
                      onChange={(e) => setDeliverables((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={`Deliverable ${i + 1}`} className="font-montserrat font-normal"
                      style={{ ...inputBase, height: "40px", flex: 1 }} onFocus={focusBorder} onBlur={blurBorder} />
                    {deliverables.length > 1 && (
                      <button onClick={() => setDeliverables((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                        <X size={14} color="#706b6b" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setDeliverables((prev) => [...prev, ""])}
                  className="font-montserrat font-semibold"
                  style={{ fontSize: "12px", color: "#e4dcd1", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "4px 0", display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                  <Plus size={13} strokeWidth={2} /> Add deliverable
                </button>
              </div>
            </div>
          )}

          {/* Payment fields (Paid only) */}
          {showPayment && (
            <div style={{ marginTop: "24px" }}>
              <SectionLabel>Payment</SectionLabel>
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Field label="Payment Amount">
                  <input type="text" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. £150 or TBC" className="font-montserrat font-normal"
                    style={inputBase} onFocus={focusBorder} onBlur={blurBorder} />
                </Field>
                <Field label="Payment Terms">
                  <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
                    className="font-montserrat font-normal"
                    style={{ ...inputBase, cursor: "pointer", appearance: "none" }}
                    onFocus={focusBorder} onBlur={blurBorder}>
                    <option value="" disabled>Select payment terms...</option>
                    {PAYMENT_TERMS_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* Brand links */}
          <div style={{ marginTop: "24px" }}>
            <SectionLabel>Brand Links</SectionLabel>
            <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { label: "Website",   icon: Globe,    val: website,   set: setWebsite,   ph: "Website URL"   },
                { label: "Instagram", icon: LinkIcon, val: instagram, set: setInstagram, ph: "Instagram URL" },
                { label: "TikTok",    icon: Music2,   val: tiktok,   set: setTiktok,   ph: "TikTok URL"    },
              ].map(({ label, icon: Icon, val, set, ph }) => (
                <Field key={label} label={label}>
                  <div style={{ position: "relative" }}>
                    <Icon size={14} color="#706b6b" strokeWidth={1.5} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <input type="text" value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                      className="font-montserrat font-normal" style={{ ...inputBase, paddingLeft: "36px" }}
                      onFocus={focusBorder} onBlur={blurBorder} />
                  </div>
                </Field>
              ))}
            </div>
          </div>

          {/* Application */}
          <div style={{ marginTop: "24px" }}>
            <SectionLabel>Application</SectionLabel>
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <Field label="Apply Link">
                <input type="url" value={applyLink} onChange={(e) => setApplyLink(e.target.value)}
                  placeholder="Google Form or client portal URL" className="font-montserrat font-normal"
                  style={inputBase} onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
              <Field label="Spots Remaining">
                <input type="number" value={spots} onChange={(e) => setSpots(e.target.value)}
                  placeholder="Leave blank for unlimited" className="font-montserrat font-normal"
                  style={inputBase} onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
            </div>
          </div>

          {/* Media */}
          <div style={{ marginTop: "24px" }}>
            <SectionLabel>Media</SectionLabel>
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <Field label="Cover Image">
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, setCoverImageUrl, setUploadingCover); }} />
                <div onClick={() => coverInputRef.current?.click()}
                  style={{ border: "2px dashed rgba(228,220,209,0.2)", borderRadius: "12px", height: "160px", background: "#333333", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: "6px", overflow: "hidden", position: "relative" }}>
                  {uploadingCover ? <Loader2 size={28} color="#706b6b" strokeWidth={1.5} className="animate-spin" />
                    : coverImageUrl ? (
                      <><img src={coverImageUrl} alt="Cover" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                          <Upload size={20} color="#e4dcd1" strokeWidth={1.5} />
                          <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#e4dcd1" }}>Click to replace</p>
                        </div></>
                    ) : (
                      <><Upload size={32} color="#706b6b" strokeWidth={1} />
                        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#706b6b" }}>Click to upload cover image</p>
                        <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#4a4a4a", marginTop: "4px" }}>Recommended: 1200×675px JPG or PNG</p></>
                    )}
                </div>
              </Field>
              <Field label="Brand Logo">
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, setBrandLogoUrl, setUploadingLogo); }} />
                <div onClick={() => logoInputRef.current?.click()}
                  style={{ border: "2px dashed rgba(228,220,209,0.2)", borderRadius: "12px", height: "100px", background: "#333333", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: "4px", overflow: "hidden", position: "relative" }}>
                  {uploadingLogo ? <Loader2 size={22} color="#706b6b" strokeWidth={1.5} className="animate-spin" />
                    : brandLogoUrl ? (
                      <><img src={brandLogoUrl} alt="Logo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <Upload size={16} color="#e4dcd1" strokeWidth={1.5} />
                          <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#e4dcd1" }}>Click to replace</p>
                        </div></>
                    ) : (
                      <><Upload size={20} color="#706b6b" strokeWidth={1} />
                        <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>Click to upload logo</p>
                        <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#4a4a4a" }}>Appears as circle overlay on campaign card</p></>
                    )}
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* RIGHT — Publish settings */}
        <div style={{ background: "#2a2a2a", borderRadius: "12px", padding: "24px", position: "sticky", top: "24px" }}>
          <SectionLabel>Publish Settings</SectionLabel>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <Field label="Post to Section">
              <select value={sectionSlug} onChange={(e) => setSectionSlug(e.target.value)}
                className="font-montserrat font-normal" style={{ ...inputBase, cursor: "pointer", appearance: "none" }}
                onFocus={focusBorder} onBlur={blurBorder}>
                {SECTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <div style={{ background: "#333333", borderRadius: "8px", padding: "4px", display: "flex", gap: "4px" }}>
                {(["draft", "publish"] as const).map((s) => (
                  <button key={s} onClick={() => setStatus(s)} className="font-montserrat font-semibold"
                    style={{ flex: 1, height: "36px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px",
                      background: status === s ? "#e4dcd1" : "transparent", color: status === s ? "#222222" : "#706b6b",
                      transition: "background 0.15s, color 0.15s", textTransform: "capitalize" }}>
                    {s === "publish" ? "Published" : "Draft"}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Preview */}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-montserrat font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#706b6b" }}>Preview</p>
            <div style={{ marginTop: "10px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ height: "80px", background: coverImageUrl ? "transparent" : "#333333", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {coverImageUrl && <img src={coverImageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                <span className="font-playfair font-normal" style={{ fontSize: "14px", color: brand ? "#ffffff" : "rgba(255,255,255,0.3)", position: "relative", zIndex: 1, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  {brand || "Brand name"}
                </span>
              </div>
              <div style={{ padding: "10px 12px", background: "#2a2a2a" }}>
                <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "8px", letterSpacing: "0.10em", background: "#706b6b", color: "#e4dcd1", padding: "2px 8px", borderRadius: "20px" }}>
                  {CAMPAIGN_TYPE_OPTIONS.find((o) => o.value === campaignType)?.label ?? campaignType}
                </span>
                <p className="font-playfair font-normal" style={{ fontSize: "12px", color: title ? "#ffffff" : "rgba(255,255,255,0.3)", marginTop: "4px", lineHeight: 1.3 }}>
                  {title || "Campaign title"}
                </p>
              </div>
            </div>
          </div>

          {error && <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#C0392B", marginTop: "12px" }}>{error}</p>}

          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={() => handleSave("draft")} disabled={saving} className="font-montserrat font-semibold"
              style={{ width: "100%", height: "44px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(228,220,209,0.25)", color: "#e4dcd1", fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            <button onClick={() => handleSave("publish")} disabled={saving} className="font-montserrat font-semibold"
              style={{ width: "100%", height: "44px", borderRadius: "8px", background: "#e4dcd1", border: "none", color: "#222222", fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save & Publish"}
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginTop: "4px" }}>
              <BellRing size={12} color="#706b6b" strokeWidth={1.5} />
              <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>Creators will be notified when published</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`input::placeholder, textarea::placeholder { color: #706b6b; } select option { background: #333333; }`}</style>
    </div>
  );
}
