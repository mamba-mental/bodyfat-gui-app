"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function StartNewProgramModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleContinue = () => {
    setOpen(false)
    router.push("/setup/custom?newProgram=true")
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-dashed">
          Start New Program
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Start New Program
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground space-y-3">
            <p className="font-medium">
              ⚠️ This action will create a new baseline for all your progress tracking.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-2">
                This will affect:
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc pl-4">
                <li>All dashboard progress calculations (weight change, BF change, etc.)</li>
                <li>All percentage-based metrics and deltas</li>
                <li>Your starting point for this new program</li>
              </ul>
            </div>
            <p>
              You will enter new starting stats on the next page. Your historical data
              will remain intact, but all new calculations will use the new baseline.
            </p>
            <p className="font-semibold">
              Are you sure you want to continue?
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>
            I Understand, Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
