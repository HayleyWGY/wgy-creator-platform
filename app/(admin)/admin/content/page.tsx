"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Eye, Search, Upload, X } from "lucide-react";
import Image from "next/image";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

interface ContentItem {
  id: string;
  title: string;
  contentType: string;
  section: string;
  categories: string[];
  status: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  readingTimeMinutes: number | null;
  thumbnailUrl: string | null;
  bannerImageUrl: string | null;
  body: string | null;
  pdfUrl: string | null;
  editableTemplateUrl: string | null;
  videoEmbedUrl: string | null;
  videoTranscript: string | null;
  sortOrder: number;
}

const CONTENT_TYPES = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF Guide" },
  { value: "template", label: "Template" },
];

const SECTIONS = [
  { value: "pitching", label: "Pitching & Outreach" },
  { value: "content", label: "Content Creation" },
  { value: "brand-deals", label: "Brand Deals" },
  { value: "growth", label: "Growth" },
  { value: "mindset", label: "Mindset & Business" },
];

const CATEGORY_OPTIONS = [
  "Beginner", "Advanced", "Quick Read", "Deep Dive",
  "Templates", "Scripts", "Case Study", "Checklist",
];

const EMPTY_FORM = {
  title: "",
  contentType: "article",
  section: "pitching",
  categories: [] as string[],
  status: "draft",
  scheduledAt: "",
  sortOrder: 0,
  body: "",
  pdfUrl: "",
  editableTemplateUrl: "",
  videoEmbedUrl: "",
  videoTranscript: "",
  thumbnailUrl: "",
  bannerImageUrl: "",
};

function StatusPill({ status }: { status: string }) {
  if (status === "published") {
    return (
      <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#e4dcd1", color: "#222222", padding: "3px 8px", borderRadius: "20px" }}>
        Live
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: "rgba(155,126,86,0.3)", color: "#e4aa55", padding: "3px 8px", borderRadius: "20px" }}>
        Scheduled
      </span>
    );
  }
  return (
    <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", border: "1px solid rgba(255,255,255,0.15)", color: "#706b6b", padding: "3px 8px", borderRadius: "20px" }}>
      Draft
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const colours: Record<string, { bg: string; text: string }> = {
    article: { bg: "rgba(228,220,209,0.15)", text: "#e4dcd1" },
    video: { bg: "rgba(61,53,80,0.5)", text: "#c4b5fd" },
    pdf: { bg: "rgba(39,174,96,0.15)", text: "#27AE60" },
    template: { bg: "rgba(155,126,86,0.2)", text: "#9b7e56" },
  };
  const c = colours[type] ?? colours.article;
  return (
    <span className="font-montserrat font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.08em", background: c.bg, color: c.text, padding: "2px 7px", borderRadius: "20px" }}>
      {type}
    </span>
  );
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const thumbnailRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLInputElement>(null);

  async function fetchItems() {
    setLoading(true);
    const res = await fetch("/api/content");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, []);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      contentType: item.contentType,
      section: item.section,
      categories: item.categories ?? [],
      status: item.status,
      scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : "",
      sortOrder: item.sortOrder,
      body: item.body ?? "",
      pdfUrl: item.pdfUrl ?? "",
      editableTemplateUrl: item.editableTemplateUrl ?? "",
      videoEmbedUrl: item.videoEmbedUrl ?? "",
      videoTranscript: item.videoTranscript ?? "",
      thumbnailUrl: item.thumbnailUrl ?? "",
      bannerImageUrl: item.bannerImageUrl ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, scheduledAt: form.scheduledAt || null };
    const url = editingId ? `/api/content/${editingId}` : "/api/content";
    const method = editingId ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    setModalOpen(false);
    fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this content item?")) return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    fetchItems();
  }

  async function uploadFile(file: File, field: string) {
    setUploadingField(field);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) setForm((f) => ({ ...f, [field]: data.url }));
    setUploadingField(null);
  }

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  const filtered = items.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || item.contentType === filterType;
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="font-montserrat font-bold uppercase text-[#e4dcd1]" style={{ fontSize: "10px", letterSpacing: "0.12em" }}>
            Learning Lounge
          </p>
          <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px", marginTop: "4px" }}>
            Content
          </h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 font-montserrat font-semibold uppercase text-[#222222] bg-[#e4dcd1] hover:bg-white transition-colors rounded"
          style={{ fontSize: "11px", letterSpacing: "0.10em", padding: "10px 16px" }}
        >
          <Plus size={14} />
          Add Content
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="w-full bg-white/5 border border-white/10 rounded pl-8 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All types</option>
          {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All statuses</option>
          <option value="published">Live</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-white/30 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-white/30 text-sm">No content found.</p>
      ) : (
        <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8" style={{ background: "rgba(255,255,255,0.04)" }}>
                <th className="text-left font-montserrat font-bold uppercase text-[#706b6b] px-4 py-3" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Title</th>
                <th className="text-left font-montserrat font-bold uppercase text-[#706b6b] px-4 py-3" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Type</th>
                <th className="text-left font-montserrat font-bold uppercase text-[#706b6b] px-4 py-3" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Section</th>
                <th className="text-left font-montserrat font-bold uppercase text-[#706b6b] px-4 py-3" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Status</th>
                <th className="text-left font-montserrat font-bold uppercase text-[#706b6b] px-4 py-3" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Published</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.thumbnailUrl && (
                        <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
                          <Image src={item.thumbnailUrl} alt="" fill style={{ objectFit: "cover" }} />
                        </div>
                      )}
                      <span className="font-montserrat text-white font-medium" style={{ fontSize: "13px" }}>{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TypePill type={item.contentType} /></td>
                  <td className="px-4 py-3">
                    <span className="font-montserrat text-white/50" style={{ fontSize: "12px" }}>
                      {SECTIONS.find((s) => s.value === item.section)?.label ?? item.section}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                  <td className="px-4 py-3">
                    <span className="font-montserrat text-white/40" style={{ fontSize: "12px" }}>
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={`/learn/${item.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </a>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className="relative w-full max-w-2xl rounded-lg"
            style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.10)", margin: "0 16px" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 className="font-playfair italic text-white" style={{ fontSize: "20px" }}>
                {editingId ? "Edit Content" : "Add Content"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                  placeholder="Enter content title..."
                />
              </div>

              {/* Type + Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Content Type</label>
                  <select
                    value={form.contentType}
                    onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  >
                    {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Section</label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  >
                    {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-2" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`font-montserrat font-semibold uppercase transition-colors rounded-full px-3 py-1 ${
                        form.categories.includes(cat)
                          ? "bg-[#e4dcd1] text-[#222222]"
                          : "border border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"
                      }`}
                      style={{ fontSize: "9px", letterSpacing: "0.08em" }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail + Banner uploads */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Thumbnail</label>
                  <input ref={thumbnailRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "thumbnailUrl")} />
                  {form.thumbnailUrl ? (
                    <div className="relative w-full h-20 rounded overflow-hidden group" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                      <Image src={form.thumbnailUrl} alt="Thumbnail" fill style={{ objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, thumbnailUrl: "" }))}
                        className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => thumbnailRef.current?.click()}
                      disabled={uploadingField === "thumbnailUrl"}
                      className="w-full h-20 flex flex-col items-center justify-center gap-1 rounded hover:border-white/30 transition-colors text-white/30 hover:text-white/50"
                      style={{ border: "1px dashed rgba(255,255,255,0.15)" }}
                    >
                      <Upload size={14} />
                      <span className="font-montserrat text-[10px]">{uploadingField === "thumbnailUrl" ? "Uploading..." : "Upload image"}</span>
                    </button>
                  )}
                </div>
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Banner Image</label>
                  <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "bannerImageUrl")} />
                  {form.bannerImageUrl ? (
                    <div className="relative w-full h-20 rounded overflow-hidden group" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                      <Image src={form.bannerImageUrl} alt="Banner" fill style={{ objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, bannerImageUrl: "" }))}
                        className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => bannerRef.current?.click()}
                      disabled={uploadingField === "bannerImageUrl"}
                      className="w-full h-20 flex flex-col items-center justify-center gap-1 rounded hover:border-white/30 transition-colors text-white/30 hover:text-white/50"
                      style={{ border: "1px dashed rgba(255,255,255,0.15)" }}
                    >
                      <Upload size={14} />
                      <span className="font-montserrat text-[10px]">{uploadingField === "bannerImageUrl" ? "Uploading..." : "Upload banner"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Article body */}
              {form.contentType === "article" && (
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Article Body</label>
                  <RichTextEditor
                    value={form.body}
                    onChange={(html) => setForm((f) => ({ ...f, body: html }))}
                    placeholder="Write your article..."
                  />
                </div>
              )}

              {/* Video fields */}
              {form.contentType === "video" && (
                <>
                  <div>
                    <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Video Embed URL</label>
                    <input
                      value={form.videoEmbedUrl}
                      onChange={(e) => setForm((f) => ({ ...f, videoEmbedUrl: e.target.value }))}
                      placeholder="https://www.youtube.com/embed/..."
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Transcript / Notes (optional)</label>
                    <textarea
                      value={form.videoTranscript}
                      onChange={(e) => setForm((f) => ({ ...f, videoTranscript: e.target.value }))}
                      rows={4}
                      placeholder="Video transcript or key notes..."
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                    />
                  </div>
                </>
              )}

              {/* PDF fields */}
              {form.contentType === "pdf" && (
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>PDF File</label>
                  <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "pdfUrl")} />
                  {form.pdfUrl ? (
                    <div className="flex items-center gap-3 p-3 rounded" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <span className="font-montserrat text-sm text-white/70 flex-1 truncate">{form.pdfUrl}</span>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, pdfUrl: "" }))} className="text-white/40 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pdfRef.current?.click()}
                      disabled={uploadingField === "pdfUrl"}
                      className="w-full h-14 flex items-center justify-center gap-2 rounded hover:border-white/30 transition-colors text-white/30 hover:text-white/50"
                      style={{ border: "1px dashed rgba(255,255,255,0.15)" }}
                    >
                      <Upload size={14} />
                      <span className="font-montserrat text-sm">{uploadingField === "pdfUrl" ? "Uploading..." : "Upload PDF"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Template fields */}
              {form.contentType === "template" && (
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Editable Template URL / File</label>
                  <input ref={templateRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "editableTemplateUrl")} />
                  {form.editableTemplateUrl ? (
                    <div className="flex items-center gap-3 p-3 rounded" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <span className="font-montserrat text-sm text-white/70 flex-1 truncate">{form.editableTemplateUrl}</span>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, editableTemplateUrl: "" }))} className="text-white/40 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => templateRef.current?.click()}
                        disabled={uploadingField === "editableTemplateUrl"}
                        className="w-full h-14 flex items-center justify-center gap-2 rounded hover:border-white/30 transition-colors text-white/30 hover:text-white/50"
                        style={{ border: "1px dashed rgba(255,255,255,0.15)" }}
                      >
                        <Upload size={14} />
                        <span className="font-montserrat text-sm">{uploadingField === "editableTemplateUrl" ? "Uploading..." : "Upload file"}</span>
                      </button>
                      <input
                        value={form.editableTemplateUrl}
                        onChange={(e) => setForm((f) => ({ ...f, editableTemplateUrl: e.target.value }))}
                        placeholder="Or paste a Google Docs / Notion link..."
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Status + Sort */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published (Live)</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                    min={0}
                  />
                </div>
              </div>

              {form.status === "scheduled" && (
                <div>
                  <label className="block font-montserrat font-bold uppercase text-[#706b6b] mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.10em" }}>Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => setModalOpen(false)}
                className="font-montserrat font-semibold uppercase text-white/50 hover:text-white transition-colors"
                style={{ fontSize: "11px", letterSpacing: "0.08em", padding: "10px 16px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="font-montserrat font-semibold uppercase bg-[#e4dcd1] text-[#222222] hover:bg-white disabled:opacity-40 transition-colors rounded"
                style={{ fontSize: "11px", letterSpacing: "0.10em", padding: "10px 20px" }}
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
