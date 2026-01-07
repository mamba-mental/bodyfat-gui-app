"use client"

import { Plus } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import type { UserData, BodyFatEntry } from "@/types"

interface DashboardHeaderProps {
  currentUser: UserData | null
  entries: BodyFatEntry[]
  loading: boolean
  reportGenerationStatus: string | null
  onStartNewProgram: () => void
  onGenerateReport: () => void
}

export function DashboardHeader({
  currentUser,
  entries,
  loading,
  reportGenerationStatus,
  onStartNewProgram,
  onGenerateReport,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      <div className="flex items-center space-x-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-dashed">
              Start New Program
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start a New Program?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset your progress tracking to start from today.
                Your current weight ({entries[0]?.weight || currentUser?.current_weight} lbs) will become your new starting weight.
                Past entries will be preserved in history but won't affect new program stats.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onStartNewProgram}>Start New Program</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Link href="/setup/custom">
          <Button variant="secondary">
            Update Profile
          </Button>
        </Link>
        <Link href="/entries/new">
          <Button>
            <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </Link>
        <Button variant="outline" onClick={onGenerateReport} disabled={loading}>
          {loading && reportGenerationStatus ? 'Generating Report...' : 'Generate Report'}
        </Button>
      </div>
    </div>
  )
}
