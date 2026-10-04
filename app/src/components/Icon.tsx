import type { CSSProperties } from "react";
import type { IconName } from "@/lib/icon-names";

interface IconProps {
  /** 서브셋 폰트에 들어 있는 이름만 허용 — 없는 이름은 아이콘 대신 글자로 노출된다. */
  name: IconName;
  size?: number;
  className?: string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
}

/**
 * Google Material Symbols Outlined 아이콘 래퍼.
 * 폰트는 자체 호스팅 서브셋 (globals.css 의 @font-face).
 * 사용: <Icon name="home" size={24} />
 * 쓸 수 있는 이름: src/lib/icon-names.ts 의 SUBSET_ICONS
 */
export default function Icon({
  name,
  size = 24,
  className = "",
  filled = false,
  weight = 400,
}: IconProps) {
  const style: CSSProperties = {
    fontSize: `${size}px`,
    lineHeight: 1,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
  };
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
