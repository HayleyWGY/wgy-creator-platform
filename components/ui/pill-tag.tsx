interface PillTagProps {
  label: string;
  className?: string;
}

/** Campaign type tag — beige fill, charcoal text in both themes (per brand). */
export function PillTag({ label, className = "" }: PillTagProps) {
  return (
    <span
      className={`inline-block font-montserrat uppercase ${className}`}
      style={{
        background: "var(--beige)",
        color: "#111111",
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "0.12em",
        padding: "5px 9px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {label}
    </span>
  );
}
