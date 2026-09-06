"use client";

export interface FilterChip<K extends string> {
  key: K;
  label: string;
  count?: number;
}

export default function FilterChips<K extends string>({
  chips,
  active,
  onChange,
}: {
  chips: FilterChip<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="ad-filters" role="tablist">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          role="tab"
          aria-selected={active === c.key}
          className={`ad-fchip ${active === c.key ? "active" : ""}`.trim()}
          onClick={() => onChange(c.key)}
        >
          {c.label}
          {typeof c.count === "number" && <span className="ad-n">{c.count}</span>}
        </button>
      ))}
    </div>
  );
}
