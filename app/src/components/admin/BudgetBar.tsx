import { remainingBudget, type CampaignBudget } from "@/lib/reward-ledger";

const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 예산 3단 미니바: 지급 / 잔여(잠김) / 반환 */
export default function BudgetBar({ budget }: { budget: CampaignBudget }) {
  const L = budget.budgetLocked || 0;
  const paid = budget.budgetPaid || 0;
  const refund = budget.budgetRefunded || 0;
  const remaining = remainingBudget(budget);
  const p = L > 0 ? (paid / L) * 100 : 0;
  const r = L > 0 ? (refund / L) * 100 : 0;
  const left = Math.max(0, 100 - p - r);
  return (
    <div>
      <div className="ad-bbar" title={`지급 ${fmt(paid)} / 잠김 ${fmt(L)} / 반환 ${fmt(refund)}`}>
        <div className="paid" style={{ width: `${p}%` }} />
        <div className="left" style={{ width: `${left}%` }} />
        <div className="refund" style={{ width: `${r}%` }} />
      </div>
      <div className="ad-bbar-legend ad-num">
        {refund > 0 ? (
          <>
            <span>
              <i className="paid" />
              {fmt(paid)}
            </span>
            <span>
              <i className="refund" />
              반환 {fmt(refund)}
            </span>
          </>
        ) : (
          <>
            <span>
              <i className="paid" />
              {fmt(paid)}
            </span>
            <span>
              <i className="left" />
              잔여 {fmt(remaining)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
