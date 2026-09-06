"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * 확인 모달 (종료·출금 승인 등 파괴적 동작) — window.confirm 대체.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "확인",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);
  if (!open) return null;
  return (
    <div className="ad-modal-scrim" onClick={busy ? undefined : onCancel}>
      <div className="ad-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="ad-modal-foot">
          <button type="button" className="ad-btn ad-btn-outline" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            className={`ad-btn ${danger ? "ad-btn-danger" : "ad-btn-primary"} ${busy ? "loading" : ""}`.trim()}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 사유 입력 모달 (거절·반려·종료 사유) — window.prompt 대체. required 면 빈 값 제출 불가.
 */
export function ReasonModal({
  open,
  title,
  message,
  placeholder = "사유를 입력해 주세요",
  confirmLabel = "확인",
  required = true,
  danger = true,
  busy = false,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  placeholder?: string;
  confirmLabel?: string;
  required?: boolean;
  danger?: boolean;
  busy?: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  // 열릴 때마다 폼을 새로 마운트 → 입력값·에러가 자연히 초기화 (effect 로 setState 안 함)
  if (!open) return null;
  return (
    <ReasonForm
      title={title}
      message={message}
      placeholder={placeholder}
      confirmLabel={confirmLabel}
      required={required}
      danger={danger}
      busy={busy}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

function ReasonForm({
  title,
  message,
  placeholder,
  confirmLabel,
  required,
  danger,
  busy,
  onSubmit,
  onCancel,
}: {
  title: string;
  message?: ReactNode;
  placeholder: string;
  confirmLabel: string;
  required: boolean;
  danger: boolean;
  busy: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const submit = () => {
    const trimmed = reason.trim();
    if (required && trimmed.length === 0) {
      setError("사유는 필수입니다. 광고주에게 그대로 전달됩니다.");
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="ad-modal-scrim" onClick={busy ? undefined : onCancel}>
      <div className="ad-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <textarea
          className="ad-input"
          value={reason}
          maxLength={200}
          placeholder={placeholder}
          autoFocus
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
        />
        <div className="ad-muted" style={{ fontSize: "var(--ad-font-xs)", marginTop: 4, textAlign: "right" }}>
          {reason.length}/200
        </div>
        {error && <div className="ad-field-error">{error}</div>}
        <div className="ad-modal-foot">
          <button type="button" className="ad-btn ad-btn-outline" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            className={`ad-btn ${danger ? "ad-btn-danger" : "ad-btn-primary"} ${busy ? "loading" : ""}`.trim()}
            onClick={submit}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
