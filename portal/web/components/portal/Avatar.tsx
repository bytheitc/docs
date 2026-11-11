// Shows a provider avatar only if it is an https URL; otherwise initials.
export function Avatar({ name, url, className = "avatar" }: { name: string; url?: string; className?: string }) {
  const safe = url && /^https:\/\//i.test(url) ? url : null;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return (
    <span className={className} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {safe ? <img src={safe} alt="" referrerPolicy="no-referrer" loading="lazy" /> : initials}
    </span>
  );
}
