"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { UserData, BodyFatEntry, ProgramReferenceSnapshot } from "@/types"

interface ArchiveModalProps {
  currentUser: UserData | null
  entries: BodyFatEntry[]
  programReference: ProgramReferenceSnapshot | null
  onArchive: (name: string, notes: string) => Promise<void>
  disabled?: boolean
}

export function ArchiveModal({
  currentUser,
  entries,
  programReference,
  onArchive,
  disabled = false,
}: ArchiveModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [archiving, setArchiving] = useState(false)

  // Calculate summary preview
  const latestEntry = entries[0]
  const initialWeight = programReference?.initial_weight || currentUser?.current_weight || 0
  const initialBf = programReference?.initial_bf || currentUser?.current_bf || 0
  const currentWeight = latestEntry?.weight || currentUser?.current_weight || 0
  const currentBf = latestEntry?.body_fat_percentage || currentUser?.current_bf || 0

  const weightChange = currentWeight - initialWeight
  const bfChange = currentBf - initialBf

  const startDate = programReference?.start_date
    ? new Date(programReference.start_date)
    : new Date()
  const durationDays = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const durationWeeks = Math.floor(durationDays / 7)

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const programName = name.trim() || `Program ${new Date().toLocaleDateString()}`
      await onArchive(programName, notes.trim())

      // After successful archive, navigate to setup page to enter new baseline values
      router.push("/setup/custom?newProgram=true")
    } catch (error) {
      console.error("Failed to archive program:", error)
    } finally {
      setArchiving(false)
    }
  }

  const canArchive = entries.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled || !canArchive}>
          <Archive className="mr-2 h-4 w-4" />
          Archive & Start New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Archive & Start New Program
          </DialogTitle>
          <div className="text-sm text-muted-foreground space-y-3">
            <p className="font-medium">
              ⚠️ This action will archive your current program and reset all progress tracking.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-2">
                This will affect:
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc pl-4">
                <li>All dashboard progress calculations will reset to 0.0</li>
                <li>Previous gains/losses will NOT carry over</li>
                <li>After archiving, you'll enter NEW baseline weight & body fat %</li>
                <li>Current program entries and reports will be preserved for reference</li>
              </ul>
            </div>
            <p>
              Your historical data (entries, reports) will remain intact and accessible.
              On the next page, you'll enter fresh starting stats for your new 16-week program.
            </p>
          </div>
        </DialogHeader>

        {/* Summary Preview */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <h4 className="font-medium text-sm">Program Summary Preview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <span className="ml-2 font-medium">{durationWeeks} weeks ({durationDays} days)</span>
            </div>
            <div>
              <span className="text-muted-foreground">Entries:</span>
              <span className="ml-2 font-medium">{entries.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Weight Change:</span>
              <span className={`ml-2 font-medium ${weightChange < 0 ? 'text-green-600' : weightChange > 0 ? 'text-red-600' : ''}`}>
                {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} lbs
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Body Fat Change:</span>
              <span className={`ml-2 font-medium ${bfChange < 0 ? 'text-green-600' : bfChange > 0 ? 'text-red-600' : ''}`}>
                {bfChange >= 0 ? '+' : ''}{bfChange.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Start Weight:</span>
              <span className="ml-2 font-medium">{initialWeight.toFixed(1)} lbs</span>
            </div>
            <div>
              <span className="text-muted-foreground">Final Weight:</span>
              <span className="ml-2 font-medium">{currentWeight.toFixed(1)} lbs</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Program Name (optional)</Label>
            <Input
              id="program-name"
              placeholder={`Program ${new Date().toLocaleDateString()}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-notes">Notes (optional)</Label>
            <Textarea
              id="program-notes"
              placeholder="Add any notes about this program..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleArchive} disabled={archiving}>
            {archiving ? "Archiving..." : "Archive & Start New"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
