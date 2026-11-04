"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadHistory, type HistoryItem } from "@/lib/history-client";
import V2Shell from "@/components/v2/V2Shell";
import BigButton from "@/components/v2/BigButton";

function day(at: number | null): string {
  if (!at) return "";
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function V2History() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadHistory(user)
      .then(setItems)
      .catch(() => setFailed(true));
  }, [user]);

  return (
    <V2Shell title="내역 보기" back="/v2/home">
      {failed ? (
        <p className="py-10 text-center text-[26px] text-[#6B7394]">내역을 못 불러왔어요. 잠시 뒤에 다시 열어 주세요.</p>
      ) : items === null ? (
        <p className="py-10 text-center text-[26px] text-[#6B7394]">잠시만요…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-[26px] text-[#6B7394]">아직 내역이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.id} className="flex gap-4 rounded-3xl border-2 border-[#BEC4D4] bg-white px-5 py-4">
              <span className="text-[40px] leading-none" aria-hidden>
                {it.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="break-keep text-[26px] font-black">{it.title}</div>
                <div className="text-[20px] text-[#6B7394]">
                  {day(it.at)}
                  {it.spent ? ` · ${it.spent.toLocaleString()}원 씀` : ""}
                </div>
                <div
                  className={`mt-2 text-[30px] font-black ${
                    it.delta < 0 ? "text-[#EF4444]" : it.delta === 0 ? "text-[#6B7394]" : "text-[#10B981]"
                  }`}
                >
                  {it.delta === 0 ? "모으는 중" : `${it.delta > 0 ? "+" : ""}${it.delta.toLocaleString()} P`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <BigButton href="/v2/home" tone="gold" icon="🏠">
        처음으로
      </BigButton>
    </V2Shell>
  );
}
