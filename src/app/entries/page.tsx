"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Camera, Download, Edit, Trash2, Plus, TrendingDown, TrendingUp, AlertCircle, X } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"
import { useApp } from "@/contexts/app-context"
import { calculateProgressPercentage } from "@/lib/calculations"
import { BodyFatEntry } from "@/types"
import { WorkspacePageHeader } from "@/components/layout/workspace-page-header"

interface EditingEntry {
  id: string
  date: string
  weight: string
  body_fat_percentage: string
  notes: string
  photo?: string
}

const MAX_EDIT_PHOTO_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB — matches entry-form.tsx

/** Normalise a Date | string to the YYYY-MM-DD value an <input type="date"> expects. */
function toDateInputValue(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""
  // Use local year/month/day to avoid UTC-offset shifting the displayed date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

interface CycleMeta {
  id: string
  name: string
  status: string
  start_date: string
}

export default function EntriesPage() {
  const { state, addEntry, updateEntry, deleteEntry } = useApp()
  const { current_user, entries, loading } = state

  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const editFileInputRef = React.useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterPeriod, setFilterPeriod] = useState<"all" | "week" | "month" | "quarter" | "cycle">("cycle")

  // ReComp Cycle metadata (P5): group the history by the cycle each entry belongs to.
  const [cycles, setCycles] = React.useState<CycleMeta[]>([])
  React.useEffect(() => {
    let alive = true
    fetch("/api/data/cycles")
      .then((r) => (r.ok ? r.json() : []))
      .then((cs) => {
        if (alive) setCycles(Array.isArray(cs) ? cs : [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  const cycleById = React.useMemo(
    () => new Map(cycles.map((c) => [c.id, c])),
    [cycles]
  )
  const activeCycle = React.useMemo(
    () => cycles.find((c) => c.status === "active") ?? null,
    [cycles]
  )

  const filteredEntries = React.useMemo(() => {
    if (filterPeriod === "all") return entries

    if (filterPeriod === "cycle") {
      if (!activeCycle) return entries
      return entries.filter((e) => (e as any).cycle_id === activeCycle.id)
    }

    const now = new Date()
    const cutoffDate = new Date(now)

    switch (filterPeriod) {
      case "week":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        cutoffDate.setMonth(now.getMonth() - 3)
        break
    }

    return entries.filter(entry => new Date(entry.date) >= cutoffDate)
  }, [entries, filterPeriod, activeCycle])

  // Group filtered entries by their cycle, newest cycle first. Entries without a
  // known cycle fall into an "Unassigned" group so every entry stays reachable (P5).
  const cycleGroups = React.useMemo(() => {
    const byCycle = new Map<string, BodyFatEntry[]>()
    for (const entry of filteredEntries) {
      const key = (entry as any).cycle_id ?? "__none__"
      const list = byCycle.get(key) ?? []
      list.push(entry)
      byCycle.set(key, list)
    }
    const groups = Array.from(byCycle.entries()).map(([cycleId, items]) => {
      const meta = cycleById.get(cycleId)
      return {
        cycleId,
        name: meta?.name ?? (cycleId === "__none__" ? "Unassigned" : "Unknown cycle"),
        status: meta?.status ?? null,
        startDate: meta?.start_date ?? "",
        entries: items,
      }
    })
    // Newest cycle first; "Unassigned" (no start date) sinks to the bottom.
    groups.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
    return groups
  }, [filteredEntries, cycleById])

  const handleEditEntry = (entry: any) => {
    const photo = entry.photo ?? undefined
    setEditingEntry({
      id: entry.id,
      date: toDateInputValue(entry.date),
      weight: entry.weight.toString(),
      body_fat_percentage: entry.body_fat_percentage?.toString() || "",
      notes: entry.notes || "",
      photo,
    })
    setEditPhotoPreview(photo ?? null)
    setIsEditDialogOpen(true)
  }

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_EDIT_PHOTO_SIZE_BYTES) {
      setError("Photo must be smaller than 2 MB")
      return
    }
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setEditPhotoPreview(base64)
      setEditingEntry((prev) => prev ? { ...prev, photo: base64 } : null)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveEditPhoto = () => {
    setEditPhotoPreview(null)
    setEditingEntry((prev) => prev ? { ...prev, photo: undefined } : null)
    if (editFileInputRef.current) editFileInputRef.current.value = ""
  }

  const handleUpdateEntry = async () => {
    if (!editingEntry) return
    
    setError(null)
    
    try {
      const originalEntry = entries.find(e => e.id === editingEntry.id)
      if (!originalEntry) return
      
      const updatedEntry: BodyFatEntry = {
        ...originalEntry,
        date: new Date(editingEntry.date),
        weight: parseFloat(editingEntry.weight),
        body_fat_percentage: editingEntry.body_fat_percentage ? parseFloat(editingEntry.body_fat_percentage) : undefined,
        notes: editingEntry.notes || undefined,
        photo: editingEntry.photo,
        updated_at: new Date()
      }
      
      await updateEntry(updatedEntry)
      setIsEditDialogOpen(false)
      setEditingEntry(null)
      setEditPhotoPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry")
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    setError(null)
    
    try {
      await deleteEntry(entryId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry")
    }
  }

  const exportEntries = () => {
    const csvContent = [
      "Date,Weight (lbs),Body Fat (%),Notes",
      ...filteredEntries.map(entry => 
        `${entry.date},${entry.weight},${entry.body_fat_percentage || ''},"${entry.notes || ''}"`
      )
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `body-fat-entries-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const calculateProgress = () => {
    if (!current_user || entries.length === 0) return null

    try {
      const latestEntry = entries[0]
      const startWeight = Number(current_user.current_weight)
      const goalWeight = Number(current_user.goal_weight)
      const currentWeight = Number(latestEntry.weight)

      const weightProgress = calculateProgressPercentage(startWeight, currentWeight, goalWeight)

      const startBF = Number(current_user.current_bf)
      const goalBF = Number(current_user.goal_bf)
      const currentBF = Number(latestEntry.body_fat_percentage || startBF)

      const bfProgress = calculateProgressPercentage(startBF, currentBF, goalBF)

      return {
        weightProgress: Math.max(0, isNaN(weightProgress) ? 0 : weightProgress),
        bfProgress: Math.max(0, isNaN(bfProgress) ? 0 : bfProgress),
        weightChange: isNaN(currentWeight - startWeight) ? 0 : currentWeight - startWeight,
        bfChange: isNaN(currentBF - startBF) ? 0 : currentBF - startBF
      }
    } catch {
      return null
    }
  }

  const progress = calculateProgress()

  // Extracted so the same card renders inside each cycle group (P5) without duplicating JSX.
  const renderEntryCard = (entry: BodyFatEntry) => (
    <Card key={entry.id}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-4">
              <div>
                <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold">{Number(entry.weight).toFixed(1)} lbs</div>
                <div className="text-xs text-muted-foreground">Weight</div>
              </div>

              {entry.body_fat_percentage && (
                <div className="text-center">
                  <div className="text-lg font-bold">{Number(entry.body_fat_percentage).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Body Fat</div>
                </div>
              )}

              {entry.notes && (
                <div className="max-w-xs">
                  <div className="text-sm">{entry.notes}</div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={() => handleEditEntry(entry)}>
              <ClientIcon icon={Edit} className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <ClientIcon icon={Trash2} className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this entry from {new Date(entry.date).toLocaleDateString()}?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (!current_user) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <WorkspacePageHeader eyebrow="Measurements" title="Entry history" description="Review and manage every recorded body-composition check-in." icon={Calendar} />

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete your profile setup to start tracking entries.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <WorkspacePageHeader
        eyebrow="Measurements"
        title="Entry history"
        description="A complete record of your measurements, notes, progress photos, and cycle ownership. Filter the history without losing access to edits or exports."
        icon={Calendar}
        actions={<>
          {filteredEntries.length > 0 && (
            <Button variant="secondary" onClick={exportEntries}>
              <ClientIcon icon={Download} className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
          <Link href="/entries/new">
            <Button variant="default">
              <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </Link>
        </>}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {progress && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weight Progress</CardTitle>
              <ClientIcon icon={progress.weightChange < 0 ? TrendingDown : TrendingUp} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress.weightProgress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {progress.weightChange >= 0 ? '+' : ''}{progress.weightChange.toFixed(1)} lbs from start
              </p>
              <Progress value={Math.min(100, progress.weightProgress)} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Body Fat Progress</CardTitle>
              <ClientIcon icon={progress.bfChange < 0 ? TrendingDown : TrendingUp} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress.bfProgress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {progress.bfChange >= 0 ? '+' : ''}{progress.bfChange.toFixed(1)}% from start
              </p>
              <Progress value={Math.min(100, progress.bfProgress)} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <ClientIcon icon={Calendar} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
              <p className="text-xs text-muted-foreground">
                {entries.length > 0 
                  ? `Latest: ${new Date(entries[0].date).toLocaleDateString()}`
                  : "No entries yet"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as any)} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="cycle">
              {activeCycle ? activeCycle.name : "This Cycle"}
            </TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="quarter">Last 3 Months</TabsTrigger>
            <TabsTrigger value="month">Last Month</TabsTrigger>
            <TabsTrigger value="week">Last Week</TabsTrigger>
          </TabsList>
          <Badge variant="secondary">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>

        <TabsContent value={filterPeriod}>
          {/* Active cycle has no entries in view → nudge the user to log one (P5). */}
          {activeCycle && !cycleGroups.some((g) => g.cycleId === activeCycle.id) && (
            <Card className="mb-4 border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium">{activeCycle.name} <span className="text-xs uppercase tracking-wide text-muted-foreground">current cycle</span></div>
                  <div className="text-sm text-muted-foreground">No entries logged in this cycle yet.</div>
                </div>
                <Link href="/entries/new">
                  <Button variant="default" size="sm">
                    <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
                    Log this cycle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {cycleGroups.length > 0 ? (
            <div className="space-y-8">
              {cycleGroups.map((group) => (
                <section key={group.cycleId} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{group.name}</h2>
                      {group.status === "active" && (
                        <Badge variant="default" className="text-xs">current</Badge>
                      )}
                      {group.status === "stopped" && (
                        <Badge variant="secondary" className="text-xs">archived</Badge>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    {group.entries.map(renderEntryCard)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {filterPeriod === "all"
                    ? "No entries found. Start tracking your progress!"
                    : filterPeriod === "cycle"
                    ? "No entries found in this cycle yet. Log your first measurement!"
                    : "No entries found in the selected time period."
                  }
                </p>
                <Link href="/entries/new">
                  <Button variant="default">
                    <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
                    Add Your First Entry
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>
              Update your body composition entry.
            </DialogDescription>
          </DialogHeader>
          
          {editingEntry && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, date: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-weight" className="text-right">Weight (lbs)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  step="0.1"
                  value={editingEntry.weight}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, weight: e.target.value } : null)}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-bf" className="text-right">Body Fat (%)</Label>
                <Input
                  id="edit-bf"
                  type="number"
                  step="0.1"
                  value={editingEntry.body_fat_percentage}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, body_fat_percentage: e.target.value } : null)}
                  className="col-span-3"
                  placeholder="Optional"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-notes" className="text-right">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editingEntry.notes}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="col-span-3"
                  placeholder="Optional notes"
                />
              </div>

              {/* Progress photo — prefill existing, allow replace or remove */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Photo</Label>
                <div className="col-span-3 space-y-2">
                  {editPhotoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={editPhotoPreview}
                        alt="Progress photo preview"
                        className="w-24 h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveEditPhoto}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      aria-label="Upload a progress photo"
                    >
                      <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
                      Add Photo
                    </Button>
                  )}
                  {editPhotoPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      aria-label="Replace progress photo"
                    >
                      <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
                      Replace
                    </Button>
                  )}
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditPhotoChange}
                    aria-hidden="true"
                  />
                  <p className="text-xs text-muted-foreground">Optional — max 2 MB, JPEG/PNG</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setEditPhotoPreview(null)
            }}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleUpdateEntry} disabled={loading}>
              {loading ? "Updating..." : "Update Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
