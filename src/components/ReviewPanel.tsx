import { Button } from "@/components/ui/button"
import ReadOnlyField from "@/components/ReadyOnlyField"
import type { ObjectiveBlock } from "@/lib/types"

type ReviewPanelProps = {
  blocks: ObjectiveBlock[]
  deptName: string
  reporter: string
  fiscalYear: string
  onBack: () => void
  onConfirm: () => void
  submitting: boolean
  submitError: string | null
}

export default function ReviewPanel({ blocks, deptName, reporter, fiscalYear, onBack, onConfirm, submitting, submitError }: ReviewPanelProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Review Your Submission</h2>
        <p className="text-sm text-muted-foreground">Confirm all entries before submitting.</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
        <ReadOnlyField label="Department" value={deptName} />
        <ReadOnlyField label="Reporter" value={reporter} />
        <ReadOnlyField label="Fiscal Year" value={fiscalYear} />
      </div>

      {blocks.map((block, i) => {
        const goal      = block.goals.find((g) => g.id === block.goalId)
        const objective = block.objectives.find((o) => o.id === block.objectiveId)
        return (
          <div key={block.id} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Objective {i + 1}</p>
            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="space-y-2">
                <ReadOnlyField label="Goal" value={goal?.goal ?? "—"} />
                <ReadOnlyField label="Objective" value={objective?.objective ?? "—"} />
                <ReadOnlyField label="Period" value={block.period} />
              </div>
              {block.metrics.map((metric) => {
                const result = block.results[metric.id]
                return (
                  <div key={metric.id} className="rounded-md border border-border bg-muted/20 p-3 space-y-1">
                    <p className="text-xs font-medium">{metric.name}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span><span className="text-muted-foreground text-xs">Actual: </span>{result?.actual || "—"}</span>
                      <span><span className="text-muted-foreground text-xs">Date: </span>{result?.date_retrieved || "—"}</span>
                    </div>
                    {result?.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-1">
          Back to Edit
        </Button>
        <Button onClick={onConfirm} disabled={submitting} className="flex-1">
          {submitting ? "Submitting…" : "Confirm & Submit"}
        </Button>
      </div>
    </div>
  )
}
