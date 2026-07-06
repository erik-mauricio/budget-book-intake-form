"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ReadOnlyField from "@/components/ReadyOnlyField"
import { getPeriodsForFrequency, getCurrentPeriod } from "@/lib/helpers"
import type { ObjectiveBlock, MetricResult } from "@/lib/types"

type BlockProps = {
  block: ObjectiveBlock
  index: number
  canRemove: boolean
  fiscalYear: string
  deptId: string
  onChange: (updated: ObjectiveBlock) => void
  onRemove: () => void
}

export default function ObjectiveBlockPanel({ block, index, canRemove, fiscalYear, deptId, onChange, onRemove }: BlockProps) {
  useEffect(() => {
    if (!deptId) { onChange({ ...block, goalId: "", objectiveId: "", goals: [], objectives: [], metrics: [], results: {}, period: "" }); return }
    supabase.from("goals").select("id, goal, sort_order").eq("department_id", deptId).order("sort_order")
      .then(({ data }) => { if (data) onChange({ ...block, goals: data }) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptId])

  useEffect(() => {
    if (!block.goalId) { onChange({ ...block, objectiveId: "", objectives: [], metrics: [], results: {}, period: "" }); return }
    supabase.from("objectives").select("id, objective, sort_order").eq("goal_id", block.goalId).order("sort_order")
      .then(({ data }) => { if (data) onChange({ ...block, objectives: data }) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.goalId])

  useEffect(() => {
    if (!block.objectiveId || !fiscalYear) { onChange({ ...block, metrics: [], results: {}, period: "" }); return }
    supabase.from("metric_definitions")
      .select(`id, name, frequency, value_type, methodology, limitations, sort_order, metric_targets ( id, fiscal_year, target_operator, target )`)
      .eq("objective_id", block.objectiveId)
      .eq("metric_targets.fiscal_year", fiscalYear)
      .order("sort_order")
      .then(({ data }) => {
        if (!data) return
        const metrics = data as ObjectiveBlock["metrics"]
        const frequency = metrics[0]?.frequency ?? null
        const periodOptions = frequency ? getPeriodsForFrequency(frequency, fiscalYear) : []
        const activePeriod = getCurrentPeriod(periodOptions) ?? ""
        onChange({ ...block, metrics, period: activePeriod })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.objectiveId, fiscalYear])

  const frequency     = block.metrics[0]?.frequency ?? null
  const periodOptions = frequency && fiscalYear ? getPeriodsForFrequency(frequency, fiscalYear) : []
  const activePeriod  = getCurrentPeriod(periodOptions)

  const selectedGoal      = block.goals.find((g) => g.id === block.goalId)
  const selectedObjective = block.objectives.find((o) => o.id === block.objectiveId)

  function updateResult(metricId: string, field: keyof MetricResult, value: string) {
    onChange({
      ...block,
      results: {
        ...block.results,
        [metricId]: { ...{ actual: "", date_retrieved: "", note: "" }, ...block.results[metricId], [field]: value },
      },
    })
  }

  return (
    <div className="rounded-lg border border-border p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Objective {index + 1}
        </p>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            Remove
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Goal</Label>
          <Select
            value={block.goalId}
            disabled={!deptId}
            onValueChange={(v) => onChange({ ...block, goalId: v ?? "", objectiveId: "", objectives: [], metrics: [], results: {}, period: "" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={deptId ? "Select a goal…" : "Select a department first"}>
                {(v: string | null) => block.goals.find((g) => g.id === v)?.goal ?? (deptId ? "Select a goal…" : "Select a department first")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {block.goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.goal}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Objective</Label>
          <Select
            value={block.objectiveId}
            disabled={!block.goalId}
            onValueChange={(v) => onChange({ ...block, objectiveId: v ?? "", metrics: [], results: {}, period: "" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={block.goalId ? "Select an objective…" : "Select a goal first"}>
                {(v: string | null) => block.objectives.find((o) => o.id === v)?.objective ?? (block.goalId ? "Select an objective…" : "Select a goal first")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {block.objectives.map((o) => <SelectItem key={o.id} value={o.id}>{o.objective}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedGoal && selectedObjective && (
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
            <ReadOnlyField label="Goal" value={selectedGoal.goal} />
            <ReadOnlyField label="Objective" value={selectedObjective.objective} />
          </div>
        )}
      </div>

      {periodOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label>Reporting Period</Label>
          <Select
            value={block.period}
            onValueChange={(v) => onChange({ ...block, period: v ?? "" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select period…" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value} disabled={value !== activePeriod}>
                  {label}{value !== activePeriod ? " (unavailable)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {block.period && block.period !== activePeriod && (
            <p className="text-xs text-destructive">
              You can only submit for the current active period
              {activePeriod ? ` (${periodOptions.find((p) => p.value === activePeriod)?.label})` : ""}.
            </p>
          )}
        </div>
      )}

      {block.objectiveId && fiscalYear && (
        block.metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No metrics found for this objective and fiscal year.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actual Values</p>
            {block.metrics.map((metric) => {
              const result = block.results[metric.id] ?? { actual: "", date_retrieved: "", note: "" }
              const target = metric.metric_targets?.[0]
              const targetDisplay = target ? `${target.target_operator} ${target.target}` : "—"
              return (
                <div key={metric.id} className="rounded-lg border border-border p-4 space-y-4">
                  <div className="space-y-3">
                    <ReadOnlyField label="Performance Measure" value={metric.name} />
                    <div className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-32"><ReadOnlyField label="Target" value={targetDisplay} /></div>
                      <div className="flex-1 min-w-32"><ReadOnlyField label="Reporting Frequency" value={metric.frequency} /></div>
                    </div>
                    <ReadOnlyField label="Methodology" value={metric.methodology} />
                    <ReadOnlyField label="Limitations" value={metric.limitations} />
                  </div>
                  <hr className="border-border" />
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-32 space-y-1.5">
                        <Label>Actual <span className="font-normal text-muted-foreground">{metric.value_type === "percent" ? "(%)" : "(number)"}</span></Label>
                        <Input type="number" placeholder={metric.value_type === "percent" ? "e.g. 96" : "e.g. 4800"} value={result.actual} onChange={(e) => updateResult(metric.id, "actual", e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-32 space-y-1.5">
                        <Label>Date Retrieved</Label>
                        <Input type="date" value={result.date_retrieved} onChange={(e) => updateResult(metric.id, "date_retrieved", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes <span className="font-normal text-muted-foreground">optional</span></Label>
                      <Textarea placeholder="Any context, caveats, or additional information…" value={result.note} onChange={(e) => updateResult(metric.id, "note", e.target.value)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
