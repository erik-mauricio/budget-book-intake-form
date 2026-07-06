export type PeriodOption = { value: string; label: string; start: Date; end: Date }

export function getPeriodsForFrequency(frequency: string, fiscalYearLabel: string): PeriodOption[] {
  const startYear = parseInt(fiscalYearLabel.slice(2, 6), 10)
  if (isNaN(startYear)) return []
  const fy = fiscalYearLabel
  const freq = frequency.toLowerCase()

  if (freq === "annual") {
    return [{ value: `Annual_${fy}`, label: `Annual ${fy}`, start: new Date(startYear, 6, 1), end: new Date(startYear + 1, 5, 30) }]
  }
  if (freq === "semi-annual") {
    return [
      { value: `H1_${fy}`, label: `H1 ${fy}`, start: new Date(startYear, 6, 1),     end: new Date(startYear, 11, 31) },
      { value: `H2_${fy}`, label: `H2 ${fy}`, start: new Date(startYear + 1, 0, 1), end: new Date(startYear + 1, 5, 30) },
    ]
  }
  if (freq === "quarterly") {
    return [
      { value: `Q1_${fy}`, label: `Q1 ${fy}`, start: new Date(startYear, 6, 1),     end: new Date(startYear, 8, 30) },
      { value: `Q2_${fy}`, label: `Q2 ${fy}`, start: new Date(startYear, 9, 1),     end: new Date(startYear, 11, 31) },
      { value: `Q3_${fy}`, label: `Q3 ${fy}`, start: new Date(startYear + 1, 0, 1), end: new Date(startYear + 1, 2, 31) },
      { value: `Q4_${fy}`, label: `Q4 ${fy}`, start: new Date(startYear + 1, 3, 1), end: new Date(startYear + 1, 5, 30) },
    ]
  }
  if (freq === "monthly") {
    const months = ["July","August","September","October","November","December","January","February","March","April","May","June"]
    return months.map((name, i) => {
      const year  = i < 6 ? startYear : startYear + 1
      const month = (i + 6) % 12
      return { value: `${name}_${fy}`, label: `${name} ${fy}`, start: new Date(year, month, 1), end: new Date(year, month + 1, 0) }
    })
  }
  return []
}

export function getCurrentPeriod(periods: PeriodOption[]): string | null {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return periods.find(({ start, end }) => {
    const e = new Date(end); e.setHours(23, 59, 59, 999)
    return now >= start && now <= e
  })?.value ?? null
}
