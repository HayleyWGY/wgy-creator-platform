interface PillTagProps {
  label: string;
  className?: string;
}

export function PillTag({ label, className = "" }: PillTagProps) {
  return (
    <span
      className={`inline-block px-[10px] py-[3px] rounded-pill bg-accent text-background-primary font-montserrat font-semibold uppercase text-[9px] tracking-[0.10em] ${className}`}
    >
      {label}
    </span>
  );
}
