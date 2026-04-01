"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDate } from "@/lib/date-utils"
import type { DashboardMetrics } from "./hooks/useDashboardData"
import type { BodyFatEntry, Report, CalculationResult } from "@/types"

interface ProgressSummaryProps {
  metrics: DashboardMetrics
  programEntries: BodyFatEntry[]
  reports: Report[]
  currentCalculation: CalculationResult | null
  reportGenerationStatus: string | null
  reportGenerationEntryDate: string | null
}

export function ProgressSummary({
  metrics,
  programEntries,
  reports,
  currentCalculation,
  reportGenerationStatus,
  reportGenerationEntryDate,
}: ProgressSummaryProps) {
  const {
    currentWeight,
    currentBF,
    goalWeight,
    goalBF,
    weightProgress,
    bfProgress,
    programData,
  } = metrics

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Progress Summary</CardTitle>
        <CardDescription>Key metrics and goals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Goal Progress Section */}
        <div className="space-y-4">
          <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-emerald-700">&#x1F4AA; Weight Loss Progress</span>
              <span className="font-bold text-emerald-800">{Math.max(0, weightProgress).toFixed(1)}%</span>
            </div>
            <div className="relative">
              <Progress value={Math.max(0, Math.min(100, weightProgress))} className="h-3 bg-emerald-100" />
              <div
                className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, weightProgress))}%` }}
              />
            </div>
            <div className="text-center text-xs text-emerald-600">
              {currentWeight.toFixed(1)} lbs &#8594; {goalWeight.toFixed(1)} lbs
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-blue-700">&#x1F3AF; Body Fat Reduction</span>
              <span className="font-bold text-blue-800">{Math.max(0, bfProgress).toFixed(1)}%</span>
            </div>
            <div className="relative">
              <Progress value={Math.max(0, Math.min(100, bfProgress))} className="h-3 bg-blue-100" />
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, bfProgress))}%` }}
              />
            </div>
            <div className="text-center text-xs text-blue-600">
              {currentBF.toFixed(1)}% &#8594; {goalBF.toFixed(1)}%
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-purple-700">&#x23F0; Timeline Progress</span>
              <span className="font-bold text-purple-800">{Math.round(programData.programProgress)}%</span>
            </div>
            <div className="relative">
              <Progress value={programData.programProgress} className="h-3 bg-purple-100" />
              <div
                className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
                style={{ width: `${Math.min(100, programData.programProgress)}%` }}
              />
            </div>
            <div className="text-center text-xs text-purple-600">
              Day {programData.daysIntoProgram} of {Math.round(programData.totalWeeks * 7)}
            </div>
          </div>

          {currentCalculation?.confidence_score && (
            <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-amber-700">&#x1F9E0; AI Confidence Score</span>
                <span className="font-bold text-amber-800">{currentCalculation.confidence_score}/100</span>
              </div>
              <div className="relative">
                <Progress value={currentCalculation.confidence_score || 0} className="h-3 bg-amber-100" />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                  style={{ width: `${currentCalculation.confidence_score || 0}%` }}
                />
              </div>
              <div className="text-xs text-amber-600 text-center">Plan reliability assessment</div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <span className="text-lg">&#x1F4CA;</span>
            Recent Activity
          </h4>
          <div className="space-y-3">
            {programEntries.slice(0, 2).map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center space-x-3 p-2 rounded-lg bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  &#x1F4C8;
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-medium text-blue-900">
                    {entry.weight.toFixed(1)} lbs
                    {entry.body_fat_percentage && ` (${entry.body_fat_percentage.toFixed(1)}% BF)`}
                  </p>
                  <p className="text-xs text-blue-600">
                    {formatDate(entry.date)}
                    {index === 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs">Latest</span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {reports.slice(0, 1).map((report) => (
              <div
                key={report.id}
                className="flex items-center space-x-3 p-2 rounded-lg bg-gradient-to-r from-emerald-50/50 to-green-50/50 border border-emerald-100/50"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  &#x1F504;
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-medium text-emerald-900">Report generated</p>
                  <p className="text-xs text-emerald-600">
                    {new Date(report.generated_at).toLocaleDateString()}
                    <span className="ml-2 px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full text-xs">New</span>
                  </p>
                </div>
              </div>
            ))}

            {programEntries.length === 0 && reports.length === 0 && (
              <div className="text-center py-2 text-muted-foreground">
                <p className="text-xs">No activity yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Report Diagnostics */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <span className="text-lg">&#x1F50E;</span>
            Report Diagnostics
          </h4>
          <div className="text-xs space-y-1 text-muted-foreground">
            <p>
              <span className="font-semibold">Status:</span>{" "}
              {reportGenerationStatus || "No report generation in progress."}
            </p>
            <p>
              <span className="font-semibold">Entry used:</span>{" "}
              {reportGenerationEntryDate || reports[0]?.entry_date || "Not recorded"}
            </p>
            {reports[0] && (
              <p>
                <span className="font-semibold">Last report:</span>{" "}
                {new Date(reports[0].generated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
