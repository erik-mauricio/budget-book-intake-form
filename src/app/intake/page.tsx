"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ObjectiveBlockPanel from "@/components/ObjectiveBlockPanel"
import ReviewPanel from "@/components/ReviewPanel"
import { getPeriodsForFrequency, getCurrentPeriod } from "@/lib/helpers"
import { type Department, type ObjectiveBlock, makeBlock } from "@/lib/types"

export default function IntakeForm() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptId, setDeptId]           = useState("")
  const [reporter, setReporter]       = useState("")
  const [fiscalYear, setFiscalYear]   = useState("")

  const [blocks, setBlocks] = useState<ObjectiveBlock[]>([makeBlock()])

  const [showReview, setShowReview]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    supabase.from("departments").select("id, name").order("name").then(({ data }) => { if (data) setDepartments(data) })
  }, [])

  const updateBlock = useCallback((id: string, updated: ObjectiveBlock) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? updated : b))
  }, [])

  function addBlock() {
    setBlocks((prev) => [...prev, makeBlock()])
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  function isBlockReady(block: ObjectiveBlock): boolean {
    if (!block.objectiveId || !block.period || block.metrics.length === 0) return false
    const frequency     = block.metrics[0]?.frequency ?? null
    const periodOptions = frequency && fiscalYear ? getPeriodsForFrequency(frequency, fiscalYear) : []
    const active        = getCurrentPeriod(periodOptions)
    return block.period === active
  }

  const canReview = !!deptId && !!reporter && !!fiscalYear && blocks.every(isBlockReady)

  async function handleConfirmSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    for (const block of blocks) {
      const frequency     = block.metrics[0]?.frequency ?? null
      const periodOptions = frequency && fiscalYear ? getPeriodsForFrequency(frequency, fiscalYear) : []
      const selected      = periodOptions.find((p) => p.value === block.period)
      if (!selected) { setSubmitError("Invalid period in one of the objective blocks."); setSubmitting(false); return }

      const { data: report, error: reportError } = await supabase
        .from("reports")
        .upsert(
          {
            department_id: deptId,
            reporter,
            fiscal_year: fiscalYear,
            period_label: block.period,
            period_start: selected.start.toISOString().slice(0, 10),
            period_end:   selected.end.toISOString().slice(0, 10),
          },
          { onConflict: "department_id,fiscal_year,period_label" }
        )
        .select()
        .single()

      if (reportError || !report) {
        setSubmitError(reportError?.message ?? "Failed to save a report.")
        setSubmitting(false)
        return
      }

      const resultRows = block.metrics.map((m) => ({
        report_id: report.id,
        metric_definition_id: m.id,
        actual:         block.results[m.id]?.actual         || null,
        date_retrieved: block.results[m.id]?.date_retrieved || null,
        note:           block.results[m.id]?.note           || null,
      }))

      const { error: resultsError } = await supabase
        .from("metric_results")
        .upsert(resultRows, { onConflict: "report_id,metric_definition_id" })

      if (resultsError) {
        setSubmitError(resultsError.message)
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    setSubmitSuccess(true)
    setShowReview(false)
  }

  const deptName = departments.find((d) => d.id === deptId)?.name ?? ""

  if (submitSuccess) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <h1 className="text-xl font-semibold">Submitted Successfully</h1>
          <p className="text-sm text-muted-foreground">
            {blocks.length} objective{blocks.length > 1 ? "s" : ""} reported for {deptName}, {fiscalYear}.
          </p>
          <Button variant="outline" onClick={() => { setBlocks([makeBlock()]); setShowReview(false); setSubmitSuccess(false) }}>
            Submit Another Report
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-10">

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Department Reporting Form</h1>
          <p className="text-sm text-muted-foreground">
            Submit actual values for each reporting period. Do not enter goals, objectives, or targets here.
          </p>
        </div>

        {showReview ? (
          <ReviewPanel
            blocks={blocks}
            deptName={deptName}
            reporter={reporter}
            fiscalYear={fiscalYear}
            onBack={() => { setShowReview(false); setSubmitError(null) }}
            onConfirm={handleConfirmSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        ) : (
          <>
            {/* Section A */}
            <section className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Section A — Report Info
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-50 space-y-1.5">
                  <Label>Department</Label>
                  <Select value={deptId} onValueChange={(v) => { setDeptId(v ?? ""); setBlocks([makeBlock()]) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department…">
                        {(v: string | null) => departments.find((d) => d.id === v)?.name ?? "Select department…"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-50 space-y-1.5">
                  <Label htmlFor="reporter">Reporter Name</Label>
                  <Input id="reporter" placeholder="Jane Doe" value={reporter} onChange={(e) => setReporter(e.target.value)} />
                </div>

                <div className="flex-1 min-w-50 space-y-1.5">
                  <Label>Fiscal Year</Label>
                  <Select value={fiscalYear} onValueChange={(v) => { setFiscalYear(v ?? ""); setBlocks([makeBlock()]) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select fiscal year…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FY2023-24">FY2023-24</SelectItem>
                      <SelectItem value="FY2024-25">FY2024-25</SelectItem>
                      <SelectItem value="FY2025-26">FY2025-26</SelectItem>
                      <SelectItem value="FY2026-27">FY2026-27</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            {/* Section B — objective blocks */}
            <section className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Section B — Objectives &amp; Actual Values
              </p>

              {blocks.map((block, i) => (
                <ObjectiveBlockPanel
                  key={block.id}
                  block={block}
                  index={i}
                  canRemove={blocks.length > 1}
                  fiscalYear={fiscalYear}
                  deptId={deptId}
                  onChange={(updated) => updateBlock(block.id, updated)}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}

              <Button variant="outline" onClick={addBlock} disabled={!deptId || !fiscalYear} className="w-full">
                + Add Another Objective
              </Button>
            </section>

            <div className="space-y-2">
              <Button disabled={!canReview} className="w-full" onClick={() => setShowReview(true)}>
                Review Submission
              </Button>
              {!canReview && (
                <p className="text-xs text-muted-foreground">
                  Complete Section A and all objective blocks to review.
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </main>
  )
}
