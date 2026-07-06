"use client"

import { useState, useEffect } from "react"
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

const PERIOD_DATES: Record<string, { label: string; start: string; end: string }> = {
  Q1: { label: "Q1 — July 1 – September 30",   start: "2024-07-01", end: "2024-09-30" },
  Q2: { label: "Q2 — October 1 – December 31",  start: "2024-10-01", end: "2024-12-31" },
  Q3: { label: "Q3 — January 1 – March 31",     start: "2025-01-01", end: "2025-03-31" },
  Q4: { label: "Q4 — April 1 – June 30",        start: "2025-04-01", end: "2025-06-30" },
}

type Department = { id: string; name: string }
type Goal       = { id: string; goal: string; sort_order: number }
type Objective  = { id: string; objective: string; sort_order: number }
type MetricTarget = { id: string; fiscal_year: string; target_operator: string; target: string }
type Metric = {
  id: string
  name: string
  frequency: string
  value_type: string
  methodology: string
  limitations: string
  sort_order: number
  metric_targets: MetricTarget[]
}

type MetricResult = {
  actual: string
  date_retrieved: string
  note: string
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  )
}

export default function IntakeForm() {
  const [departments, setDepartments]   = useState<Department[]>([])
  const [goals, setGoals]               = useState<Goal[]>([])
  const [objectives, setObjectives]     = useState<Objective[]>([])
  const [metrics, setMetrics]           = useState<Metric[]>([])

  const [deptId, setDeptId]         = useState("")
  const [reporter, setReporter]     = useState("")
  const [fiscalYear, setFiscalYear] = useState("")
  const [period, setPeriod]         = useState("")
  const [goalId, setGoalId]         = useState("")
  const [objectiveId, setObjectiveId] = useState("")

  const [results, setResults] = useState<Record<string, MetricResult>>({})
  const [existingReportId, setExistingReportId] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Load departments once
  useEffect(() => {
    supabase.from("departments").select("id, name").order("name").then(({ data }) => {
      if (data) setDepartments(data)
    })
  }, [])

  // Load goals when department changes
  useEffect(() => {
    if (!deptId) { setGoals([]); setGoalId(""); return }
    supabase
      .from("goals")
      .select("id, goal, sort_order")
      .eq("department_id", deptId)
      .order("sort_order")
      .then(({ data }) => { if (data) setGoals(data) })
  }, [deptId])

  // Load objectives when goal changes
  useEffect(() => {
    if (!goalId) { setObjectives([]); setObjectiveId(""); return }
    supabase
      .from("objectives")
      .select("id, objective, sort_order")
      .eq("goal_id", goalId)
      .order("sort_order")
      .then(({ data }) => { if (data) setObjectives(data) })
  }, [goalId])

  // Load metrics when objective + fiscal year are set
  useEffect(() => {
    if (!objectiveId || !fiscalYear) { setMetrics([]); return }
    supabase
      .from("metric_definitions")
      .select(`
        id, name, frequency, value_type, methodology, limitations, sort_order,
        metric_targets ( id, fiscal_year, target_operator, target )
      `)
      .eq("objective_id", objectiveId)
      .eq("metric_targets.fiscal_year", fiscalYear)
      .order("sort_order")
      .then(({ data }) => { if (data) setMetrics(data as Metric[]) })
  }, [objectiveId, fiscalYear])

  // Check for existing report + pre-fill when dept + fiscal year + period are all set
  useEffect(() => {
    if (!deptId || !fiscalYear || !period) {
      setExistingReportId(null)
      setResults({})
      return
    }
    supabase
      .from("reports")
      .select("id, reporter")
      .eq("department_id", deptId)
      .eq("fiscal_year", fiscalYear)
      .eq("period_label", period)
      .maybeSingle()
      .then(async ({ data: existingReport }) => {
        if (!existingReport) { setExistingReportId(null); return }
        setExistingReportId(existingReport.id)
        if (existingReport.reporter) setReporter(existingReport.reporter)
        const { data: existingResults } = await supabase
          .from("metric_results")
          .select("id, metric_definition_id, actual, date_retrieved, note")
          .eq("report_id", existingReport.id)
        if (existingResults) {
          const prefilled: Record<string, MetricResult> = {}
          for (const r of existingResults) {
            prefilled[r.metric_definition_id] = {
              actual: r.actual ?? "",
              date_retrieved: r.date_retrieved ?? "",
              note: r.note ?? "",
            }
          }
          setResults(prefilled)
        }
      })
  }, [deptId, fiscalYear, period])

  function updateResult(metricId: string, field: keyof MetricResult, value: string) {
    setResults((prev) => ({
      ...prev,
      [metricId]: {
        ...{ actual: "", date_retrieved: "", note: "" },
        ...prev[metricId],
        [field]: value,
      },
    }))
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    const { start, end } = PERIOD_DATES[period]

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .upsert(
        {
          department_id: deptId,
          reporter,
          fiscal_year: fiscalYear,
          period_label: period,
          period_start: start,
          period_end: end,
        },
        { onConflict: "department_id,fiscal_year,period_label" }
      )
      .select()
      .single()

    if (reportError || !report) {
      setSubmitError(reportError?.message ?? "Failed to save report.")
      setSubmitting(false)
      return
    }

    const resultRows = metrics.map((m) => ({
      report_id: report.id,
      metric_definition_id: m.id,
      actual: results[m.id]?.actual || null,
      date_retrieved: results[m.id]?.date_retrieved || null,
      note: results[m.id]?.note || null,
    }))

    const { error: resultsError } = await supabase
      .from("metric_results")
      .upsert(resultRows, { onConflict: "report_id,metric_definition_id" })

    if (resultsError) {
      setSubmitError(resultsError.message)
    } else {
      setExistingReportId(report.id)
      setSubmitSuccess(true)
    }
    setSubmitting(false)
  }

  const selectedGoal      = goals.find((g) => g.id === goalId)
  const selectedObjective = objectives.find((o) => o.id === objectiveId)

  const canSubmit =
    !!deptId && !!reporter && !!fiscalYear && !!period && !!objectiveId && metrics.length > 0

  const isUpdate = !!existingReportId

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-10">

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Department Reporting Form</h1>
          <p className="text-sm text-muted-foreground">
            Submit actual values for each reporting period. Do not enter goals, objectives, or
            targets here.
          </p>
        </div>

        {/* Section A */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Section A — Report Info
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-50 space-y-1.5">
              <Label>Department</Label>
              <Select
                value={deptId}
                onValueChange={(v) => {
                  setDeptId(v ?? "")
                  setGoalId("")
                  setObjectiveId("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department...">
                    {(v: string | null) => departments.find((d) => d.id === v)?.name ?? "Select department..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-50 space-y-1.5">
              <Label htmlFor="reporter">Reporter Name</Label>
              <Input
                id="reporter"
                placeholder="Jane Doe"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-50 space-y-1.5">
              <Label>Fiscal Year</Label>
              <Select value={fiscalYear} onValueChange={(v) => setFiscalYear(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select fiscal year..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FY2023-24">FY2023-24</SelectItem>
                  <SelectItem value="FY2024-25">FY2024-25</SelectItem>
                  <SelectItem value="FY2025-26">FY2025-26</SelectItem>
                  <SelectItem value="FY2026-27">FY2026-27</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-50 space-y-1.5">
              <Label>Reporting Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select period..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIOD_DATES).map(([q, { label }]) => (
                    <SelectItem key={q} value={q}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isUpdate && (
            <p className="text-xs text-muted-foreground">
              A report already exists for this period. Submitting will update it.
            </p>
          )}
        </section>

        <hr className="border-border" />

        {/* Section B */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Section B — Select What You Are Reporting On
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select
                value={goalId}
                disabled={!deptId}
                onValueChange={(v) => { setGoalId(v ?? ""); setObjectiveId("") }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={deptId ? "Select a goal..." : "Select a department first"}>
                    {(v: string | null) => goals.find((g) => g.id === v)?.goal ?? (deptId ? "Select a goal..." : "Select a department first")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.goal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Objective</Label>
              <Select
                value={objectiveId}
                disabled={!goalId}
                onValueChange={(v) => setObjectiveId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={goalId ? "Select an objective..." : "Select a goal first"}>
                    {(v: string | null) => objectives.find((o) => o.id === v)?.objective ?? (goalId ? "Select an objective..." : "Select a goal first")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {objectives.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.objective}</SelectItem>
                  ))}
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
        </section>

        <hr className="border-border" />

        {/* Section C */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Section C — Actual Values
          </p>

          {!objectiveId || !fiscalYear ? (
            <p className="text-sm text-muted-foreground">
              Complete Sections A and B to load metrics.
            </p>
          ) : metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No metrics found for this objective and fiscal year.
            </p>
          ) : (
            <div className="space-y-6">
              {metrics.map((metric) => {
                const result = results[metric.id] ?? { actual: "", date_retrieved: "", note: "" }
                const target = metric.metric_targets?.[0]
                const targetDisplay = target
                  ? `${target.target_operator} ${target.target}`
                  : "—"

                return (
                  <div key={metric.id} className="rounded-lg border border-border p-5 space-y-5">
                    <div className="space-y-3">
                      <ReadOnlyField label="Performance Measure" value={metric.name} />
                      <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-32">
                          <ReadOnlyField label="Target" value={targetDisplay} />
                        </div>
                        <div className="flex-1 min-w-32">
                          <ReadOnlyField label="Reporting Frequency" value={metric.frequency} />
                        </div>
                      </div>
                      <ReadOnlyField label="Methodology" value={metric.methodology} />
                      <ReadOnlyField label="Limitations" value={metric.limitations} />
                    </div>

                    <hr className="border-border" />

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-32 space-y-1.5">
                          <Label>
                            Actual{" "}
                            <span className="font-normal text-muted-foreground">
                              {metric.value_type === "percent" ? "(%)" : "(number)"}
                            </span>
                          </Label>
                          <Input
                            type="number"
                            placeholder={metric.value_type === "percent" ? "e.g. 96" : "e.g. 4800"}
                            value={result.actual}
                            onChange={(e) => updateResult(metric.id, "actual", e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-32 space-y-1.5">
                          <Label>Date Retrieved</Label>
                          <Input
                            type="date"
                            value={result.date_retrieved}
                            onChange={(e) => updateResult(metric.id, "date_retrieved", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>
                          Notes{" "}
                          <span className="font-normal text-muted-foreground">optional</span>
                        </Label>
                        <Textarea
                          placeholder="Any context, caveats, or additional information..."
                          value={result.note}
                          onChange={(e) => updateResult(metric.id, "note", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="space-y-2">
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          {submitSuccess && (
            <p className="text-sm text-green-600">
              Report {isUpdate ? "updated" : "submitted"} successfully.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              disabled={!canSubmit || submitting}
              className="flex-1"
              onClick={handleSubmit}
            >
              {submitting ? "Saving…" : isUpdate ? "Update Report" : "Submit Report"}
            </Button>
          </div>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground">
              Complete all required fields in Sections A and B to submit.
            </p>
          )}
        </div>

      </div>
    </main>
  )
}
