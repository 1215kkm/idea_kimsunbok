"use client";

import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  minWidth?: number;
  selectedKey?: string | null;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
}

/**
 * 목업의 .tbl 이식 — loading 스켈레톤 · empty · danger 행 · selected 행 · 클릭 행.
 * 액션 버튼은 셀 안에서 <div className="ad-row-actions"> 로 감싸고, 버튼 onClick 에서 stopPropagation.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyText = "데이터가 없습니다.",
  minWidth,
  selectedKey = null,
  rowClassName,
  onRowClick,
  skeletonRows = 4,
}: DataTableProps<T>) {
  return (
    <div className="ad-tbl-wrap">
      <table className="ad-tbl" style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === "right" ? "r" : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`sk-${i}`}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <span className="ad-skeleton" style={{ width: `${55 + ((i * 17 + c.key.length * 7) % 40)}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr className="ad-empty">
              <td colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : (
            rows.map((row) => {
              const k = rowKey(row);
              const cls = [
                onRowClick ? "clickable" : "",
                selectedKey === k ? "selected" : "",
                rowClassName ? rowClassName(row) : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <tr
                  key={k}
                  className={cls || undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" && e.target === e.currentTarget) onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === "right" ? "r" : undefined}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
