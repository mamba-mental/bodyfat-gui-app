"use client"

import { Plus } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArchiveModal, StartNewProgramModal } from "@/components/programs"
import type { UserData, BodyFatEntry, ProgramReferenceSnapshot } from "@/types"

interface DashboardHeaderProps {
  currentUser: UserData | null
  entries: BodyFatEntry[]
  programReference: ProgramReferenceSnapshot | null
  loading: boolean
  reportGenerationStatus: string | null
  onArchiveProgram: (name: string, notes: string) => Promise<void>
  onGenerateReport: () => void
}

export function DashboardHeader({
  currentUser,
  entries,
  programReference,
  loading,
  reportGenerationStatus,
  onArchiveProgram,
  onGenerateReport,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      <div className="flex items-center space-x-2">
        <ArchiveModal
          currentUser={currentUser}
          entries={entries}
          programReference={programReference}
          onArchive={onArchiveProgram}
          disabled={loading}
        />
        <StartNewProgramModal />

        <Link href="/setup/custom">
          <Button variant="secondary">
            Update Profile
          </Button>
        </Link>
        <Link href="/entries/new">
          <Button variant="default">
            <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </Link>
        <Button variant="secondary" onClick={onGenerateReport} disabled={loading}>
          {loading && reportGenerationStatus ? 'Generating Report...' : 'Generate Report'}
        </Button>
      </div>
    </div>
  )
}
