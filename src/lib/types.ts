export type Department   = { id: string; name: string }
export type Goal         = { id: string; goal: string; sort_order: number }
export type Objective    = { id: string; objective: string; sort_order: number }
export type MetricTarget = { id: string; fiscal_year: string; target_operator: string; target: string }
export type Metric = {
  id: string; name: string; frequency: string; value_type: string
  methodology: string; limitations: string; sort_order: number
  metric_targets: MetricTarget[]
}
export type MetricResult = { actual: string; date_retrieved: string; note: string }

export type ObjectiveBlock = {
  id: string
  goalId: string
  objectiveId: string
  period: string
  goals: Goal[]
  objectives: Objective[]
  metrics: Metric[]
  results: Record<string, MetricResult>
}

export function makeBlock(): ObjectiveBlock {
  return { id: crypto.randomUUID(), goalId: "", objectiveId: "", period: "", goals: [], objectives: [], metrics: [], results: {} }
}
