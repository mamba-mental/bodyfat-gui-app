"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Calendar, TrendingDown, Scale, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { ArchivedProgram } from "@/types"

interface ProgramHistoryProps {
  archivedPrograms: ArchivedProgram[]
  onViewDetails?: (programId: string) => void
  onCompare?: (programId: string) => void
}

export function ProgramHistory({
  archivedPrograms,
  onViewDetails,
  onCompare,
}: ProgramHistoryProps) {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())

  const toggleExpand = (programId: string) => {
    const newExpanded = new Set(expandedPrograms)
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId)
    } else {
      newExpanded.add(programId)
    }
    setExpandedPrograms(newExpanded)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDuration = (days: number) => {
    const weeks = Math.floor(days / 7)
    const remainingDays = days % 7
    if (weeks === 0) return `${days} days`
    if (remainingDays === 0) return `${weeks} weeks`
    return `${weeks}w ${remainingDays}d`
  }

  if (archivedPrograms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Program History</CardTitle>
          <CardDescription>
            No archived programs yet. Archive your current program to save it here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Program History</CardTitle>
        <CardDescription>
          {archivedPrograms.length} archived program{archivedPrograms.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {archivedPrograms.map((program) => {
          const isExpanded = expandedPrograms.has(program.id)
          const weightChange = (program.final_weight || 0) - program.initial_weight
          const bfChange = (program.final_bf || 0) - program.initial_bf

          return (
            <Collapsible
              key={program.id}
              open={isExpanded}
              onOpenChange={() => toggleExpand(program.id)}
            >
              <div className="rounded-lg border">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <h4 className="font-medium">{program.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(program.start_date)} - {program.end_date ? formatDate(program.end_date) : 'Present'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant={program.status === 'completed' ? 'default' : 'secondary'}>
                        {program.status}
                      </Badge>
                      <div className="text-right text-sm">
                        <span className={weightChange < 0 ? 'text-green-600' : 'text-muted-foreground'}>
                          {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} lbs
                        </span>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-4 py-4 space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">
                            {program.summary?.duration_days
                              ? formatDuration(program.summary.duration_days)
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="text-muted-foreground">Weight</p>
                          <p className="font-medium">
                            {program.initial_weight.toFixed(1)} → {(program.final_weight || 0).toFixed(1)} lbs
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="text-muted-foreground">Body Fat</p>
                          <p className="font-medium">
                            {program.initial_bf.toFixed(1)}% → {(program.final_bf || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="text-muted-foreground">Entries</p>
                          <p className="font-medium">{program.entry_count}</p>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Average */}
                    {program.summary?.average_weekly_loss !== undefined && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Average Weekly Loss: </span>
                        <span className={program.summary.average_weekly_loss > 0 ? 'text-green-600 font-medium' : ''}>
                          {program.summary.average_weekly_loss.toFixed(2)} lbs/week
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {program.summary?.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{program.summary.notes}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      {onViewDetails && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(program.id)}
                        >
                          View Details
                        </Button>
                      )}
                      {onCompare && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCompare(program.id)}
                        >
                          Compare to Current
                        </Button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </CardContent>
    </Card>
  )
}
