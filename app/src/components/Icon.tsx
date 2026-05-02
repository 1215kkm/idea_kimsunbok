import type { CSSProperties } from "react";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
}

/**
 * Google Material Symbols Outlined 아이콘 래퍼.
 * 폰트 link는 layout.tsx의 <head>에 포함되어 있다.
 * 사용: <Icon name="home" size={24} />
 * 이름 목록: https://fonts.google.com/icons
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
