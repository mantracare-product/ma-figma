import type { Claim } from "../../../lib/claimsStore";
import type { Stage } from "../../../lib/useProcessStore";

/**
 * Board view of one claim workflow: a column per stage, a card per claim, a select on each card to move it.
 * (A compact board for claims; the Deals kanban was not extracted into a shared PipelineBoard.)
 */
export default function ClaimBoard({
  stages,
  claims,
  onMove,
  onOpen,
}: {
  stages: Stage[];
  claims: Claim[];
  onMove: (claimId: string, stageId: string) => void;
  onOpen?: (claim: Claim) => void;
}) {
  const firstId = stages[0]?.id;
  const stageOf = (c: Claim) => stages.find((s) => s.id === c.currentStageId)?.id || stages.find((s) => s.name === c.statusLabel)?.id || firstId;
  return (
    <div className="flex gap-3 overflow-x-auto pb-3" data-testid="claim-board">
      {stages.map((s) => {
        const items = claims.filter((c) => stageOf(c) === s.id);
        return (
          <div key={s.id} className="w-64 shrink-0 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color || "#94A3B8" }} />
                {s.name}
              </div>
              <span className="text-[10px] font-bold text-slate-500">{items.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[60px]">
              {items.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs space-y-1.5">
                  <button type="button" onClick={() => onOpen?.(c)} className="font-semibold text-blue-700 hover:underline text-left">
                    {c.claimNumber}
                  </button>
                  <div className="text-slate-700">{c.patientName}</div>
                  <div className="text-slate-500">
                    {c.payer?.name} · {c.totalCharge?.toLocaleString?.() ?? c.totalCharge}
                  </div>
                  <select
                    value={s.id}
                    onChange={(e) => onMove(c.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-1.5 py-1 text-[11px] bg-white"
                    aria-label={`Move ${c.claimNumber}`}
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
