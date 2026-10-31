export type ScanCoverage = {
 complete: boolean
 scope: 'catalogue' | 'partial'
 pagesFetched: number
 expectedPages?: number
 termination?: 'short-page' | 'last-page'
 failedPages?: number
}

// A row count alone cannot prove a scan reached the end of a catalogue.
export function canDeactivateMissing(coverage?: ScanCoverage, requested = true) {
 if (!requested || !coverage || coverage.complete !== true || coverage.scope !== 'catalogue') return false
 if (!Number.isInteger(coverage.pagesFetched) || coverage.pagesFetched < 1 || (coverage.failedPages ?? 0) !== 0) return false
 if (coverage.termination === 'last-page') return Number.isInteger(coverage.expectedPages) && coverage.expectedPages === coverage.pagesFetched
 return coverage.termination === 'short-page'
}
