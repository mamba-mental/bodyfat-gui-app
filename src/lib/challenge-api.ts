import type {
  ChallengeCycle,
  ChallengeAmendmentInput,
  ChallengeDailyLog,
  ChallengePreview,
  ChallengePreviewInput,
  ChallengeTemplate,
  ChallengeTemplateDefinition,
  PedInventoryCoverage,
  PedInventoryItem,
  PedInventoryItemInput,
  PedRangeResolution,
  ProtocolCatalog,
  ProtocolWindow,
} from "@/types/challenge"

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const detail = payload?.detail
    const message = typeof detail === "string" ? detail : detail?.message || `Request failed (${response.status})`
    const blockers = Array.isArray(detail?.blockers) ? ` ${detail.blockers.join(" ")}` : ""
    throw new Error(`${message}${blockers}`)
  }
  return response.json()
}

const DATA_API = "/python-api/api/data"

export const challengeApi = {
  templates: () => api<ChallengeTemplate[]>(`${DATA_API}/challenge-templates`),
  template: (id: string) => api<ChallengeTemplate>(`${DATA_API}/challenge-templates/${id}`),
  importDefault: () => api<ChallengeTemplate>(`${DATA_API}/challenge-templates/import-default`, { method: "POST", body: "{}" }),
  setTemplateStatus: (id: string, status: ChallengeTemplate["status"]) =>
    api<ChallengeTemplate>(`${DATA_API}/challenge-templates/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  saveTemplateRevision: (
    id: string,
    structured: ChallengeTemplateDefinition,
    revisionNote: string,
  ) => api(`${DATA_API}/challenge-templates/${id}/revisions`, {
    method: "POST",
    body: JSON.stringify({
      raw_source: "Structured Template Editor revision",
      structured,
      revision_note: revisionNote,
      validation_status: "reviewed",
    }),
  }),
  protocolCatalog: () => api<ProtocolCatalog>(`${DATA_API}/ped-protocols/catalog`),
  protocolWindow: (startWeek: number) => api<ProtocolWindow>(`${DATA_API}/ped-protocols/window`, {
    method: "POST",
    body: JSON.stringify({ start_week: startWeek }),
  }),
  inventory: (userId = "default") => api<PedInventoryItem[]>(`${DATA_API}/ped-inventory?user_id=${encodeURIComponent(userId)}`),
  createInventoryItem: (input: PedInventoryItemInput) => api<PedInventoryItem>(`${DATA_API}/ped-inventory`, {
    method: "POST",
    body: JSON.stringify(input),
  }),
  updateInventoryItem: (id: string, input: PedInventoryItemInput) => api<PedInventoryItem>(`${DATA_API}/ped-inventory/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }),
  deleteInventoryItem: (id: string) => api<{ success: boolean; id: string }>(`${DATA_API}/ped-inventory/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
  inventoryCoverage: (input: { user_id?: string; start_week: number; start_date: string; range_resolutions: PedRangeResolution[] }) =>
    api<PedInventoryCoverage>(`${DATA_API}/ped-inventory/coverage`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  preview: (input: ChallengePreviewInput) => api<ChallengePreview>(`${DATA_API}/challenges/preview`, {
    method: "POST",
    body: JSON.stringify(input),
  }),
  create: (input: ChallengePreviewInput & { name: string; activate: boolean }) =>
    api<ChallengePreview & { cycle_id: string; status: string }>(`${DATA_API}/challenges`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cycles: () => api<ChallengeCycle[]>(`${DATA_API}/cycles`),
  planRevisions: (cycleId: string) => api<Array<Record<string, unknown>>>(`${DATA_API}/challenges/${cycleId}/plan-revisions`),
  dailyLogs: (cycleId: string) => api<ChallengeDailyLog[]>(`${DATA_API}/challenges/${cycleId}/daily-logs`),
  saveDailyLog: (cycleId: string, dayNumber: number, log: Omit<ChallengeDailyLog, "day_number">) =>
    api(`${DATA_API}/challenges/${cycleId}/daily-logs/${dayNumber}`, {
      method: "PUT",
      body: JSON.stringify(log),
    }),
  report: (cycleId: string) => api<Record<string, unknown>>(`${DATA_API}/challenges/${cycleId}/report`, {
    method: "POST",
    body: "{}",
  }),
  amend: (cycleId: string, amendment: ChallengeAmendmentInput) => api(`${DATA_API}/challenges/${cycleId}/amend`, {
    method: "POST",
    body: JSON.stringify(amendment),
  }),
}
