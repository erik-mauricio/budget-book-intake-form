"use client"

import { useState } from "react"
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

const DEPARTMENTS = [
  { id: "occ", name: "County Executive Office" },
  { id: "hr", name: "Human Resources" },
  { id: "it", name: "Information Technology" },
  { id: "finance", name: "Finance" },
]

const GOALS = [
  { id: "g1", dept: "occ", label: "Increase community support and engagement." },
  { id: "g2", dept: "occ", label: "Improve operational efficiency." },
  { id: "g3", dept: "hr", label: "Strengthen workforce development." },
]

const OBJECTIVES = [
  {
    id: "o1",
    goal: "g1",
    label: "Enhance regional collaboration and resource coordination across county departments.",
  },
  {
    id: "o2",
    goal: "g1",
    label: "Expand public outreach programs to underserved communities.",
  },
  {
    id: "o3",
    goal: "g2",
    label: "Reduce administrative processing times by streamlining workflows.",
  },
]

type MetricDef = {
  id: string
  objective: string
  measure: string
  target: string
  unit: "%" | "number"
  frequency: string
  methodology: string
  limitations: string
}

const METRICS: MetricDef[] = [
  {
    id: "m1",
    objective: "o1",
    measure: "Percent of collaborative efforts led by OCC that result in a completed task.",
    target: ">= 90%",
    unit: "%",
    frequency: "Quarterly",
    methodology: "Tracked via project management system.",
    limitations: "Self-reported data from department leads.",
  },
  {
    id: "m2",
    objective: "o1",
    measure: "Number of inter-departmental meetings facilitated per quarter.",
    target: ">= 12",
    unit: "number",
    frequency: "Quarterly",
    methodology: "Count from meeting logs.",
    limitations: "Excludes informal standups.",
  },
  {
    id: "m3",
    objective: "o2",
    measure: "Average reach per post or reel on Instagram.",
    target: ">= 4650",
    unit: "number",
    frequency: "Monthly",
    methodology: "Pulled from Meta Business Suite.",
    limitations: "Algorithm changes may affect reach.",
  },
]

const PERIOD_DATES: Record<string, string> = {
  Q1: "July 1 – September 30",
  Q2: "October 1 – December 31",
  Q3: "January 1 – March 31",
  Q4: "April 1 – June 30",
}

type MetricResult = {
  metricId: string
  actual: string
  dateRetrieved: string
  notes: string
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  )
}

export default function Form() {
  const [deptId, setDeptId] = useState("")
  const [reporter, setReporter] = useState("")
  const [fiscalYear, setFiscalYear] = useState("")
  const [period, setPeriod] = useState("")
  const [goalId, setGoalId] = useState("")
  const [objectiveId, setObjectiveId] = useState("")
  const [results, setResults] = useState<Record<string, MetricResult>>({})

  const availableGoals = GOALS.filter((g) => g.dept === deptId)
  const availableObjectives = OBJECTIVES.filter((o) => o.goal === goalId)
  const availableMetrics = METRICS.filter((m) => m.objective === objectiveId)

  const selectedGoal = GOALS.find((g) => g.id === goalId)
  const selectedObjective = OBJECTIVES.find((o) => o.id === objectiveId)

  function updateResult(metricId: string, field: keyof Omit<MetricResult, "metricId">, value: string) {
    setResults((prev) => ({
      ...prev,
      [metricId]: {
        ...{ metricId, actual: "", dateRetrieved: "", notes: "" },
        ...prev[metricId],
        [field]: value,
      },
    }))
  }

  const canSubmit =
    deptId && reporter && fiscalYear && period && objectiveId && availableMetrics.length > 0

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-10">

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Department Reporting Form</h1>
          <p className="text-sm text-muted-foreground">
            This form is used to submit actual values each reporting period. Do not enter goals,
            objectives, or targets here.
          </p>
        </div>

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
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
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
                  {Object.entries(PERIOD_DATES).map(([q, dates]) => (
                    <SelectItem key={q} value={q}>
                      {q} — {dates}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {period && (
                <p className="text-xs text-muted-foreground">{PERIOD_DATES[period]}</p>
              )}
            </div>
          </div>
        </section>

        <hr className="border-border" />

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
                onValueChange={(v) => {
                  setGoalId(v ?? "")
                  setObjectiveId("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={deptId ? "Select a goal..." : "Select a department first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableGoals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label}
                    </SelectItem>
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
                  <SelectValue placeholder={goalId ? "Select an objective..." : "Select a goal first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableObjectives.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGoal && selectedObjective && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                <ReadOnlyField label="Goal" value={selectedGoal.label} />
                <ReadOnlyField label="Objective" value={selectedObjective.label} />
              </div>
            )}
          </div>
        </section>

        <hr className="border-border" />

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Section C — Actual Values
          </p>

          {!objectiveId ? (
            <p className="text-sm text-muted-foreground">
              Complete Sections A and B to load metrics.
            </p>
          ) : availableMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No metrics found for this objective.
            </p>
          ) : (
            <div className="space-y-6">
              {availableMetrics.map((metric) => {
                const result = results[metric.id] ?? { actual: "", dateRetrieved: "", notes: "" }
                return (
                  <div key={metric.id} className="rounded-lg border border-border p-5 space-y-5">
                    <div className="space-y-3">
                      <ReadOnlyField label="Performance Measure" value={metric.measure} />
                      <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-32"><ReadOnlyField label="Target" value={metric.target} /></div>
                        <div className="flex-1 min-w-32"><ReadOnlyField label="Reporting Frequency" value={metric.frequency} /></div>
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
                              {metric.unit === "%" ? "(%)" : "(number)"}
                            </span>
                          </Label>
                          <Input
                            type="number"
                            placeholder={metric.unit === "%" ? "e.g. 96" : "e.g. 4800"}
                            value={result.actual}
                            onChange={(e) => updateResult(metric.id, "actual", e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-32 space-y-1.5">
                          <Label>Date Retrieved</Label>
                          <Input
                            type="date"
                            value={result.dateRetrieved}
                            onChange={(e) => updateResult(metric.id, "dateRetrieved", e.target.value)}
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
                          value={result.notes}
                          onChange={(e) => updateResult(metric.id, "notes", e.target.value)}
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
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              Save Draft
            </Button>
            <Button disabled={!canSubmit} className="flex-1">
              Submit Report
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
