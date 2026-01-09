"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, TrendingUp, Target, Activity, Brain, AlertCircle, CheckCircle, FileDown, TrashIcon, Eye } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"
import { useApp } from "@/contexts/app-context"
import { ProgressTrendChart } from "@/components/charts/progress-trend-chart"
import { generatePDFFromHTML, generateStyledPDF } from "@/lib/pdf-generator"
import { Report } from "@/types"
import TurndownService from 'turndown'

export default function ReportsPage() {
  const { state, generateNewReport, deleteReport } = useApp()
  const {
    current_user,
    current_calculation,
    entries,
    reports,
    loading,
    error,
    report_generation_status,
    report_generation_entry_date,
  } = state

  console.log('[ReportsPage] render', { loading, report_generation_status, reportsCount: reports.length })

  const buildFileApiPath = (report: Report, ext: string): string | undefined => {
    if (report.file_base) {
      return `/api/reports/files/${report.file_base}.${ext}`
    }
    const storagePath =
      ext === "pdf" ? report.pdf_path :
      ext === "md" ? report.markdown_path :
      ext === "html" ? report.html_path :
      undefined
    if (storagePath) {
      const filename = storagePath.split('/').pop()
      if (filename) {
        return `/api/reports/files/${filename}`
      }
    }
    return undefined
  }

  const handleGenerateReport = async () => {
    await generateNewReport()
  }

  const handleDownloadHTML = (report: any) => {
    // Always use in-memory html_content for consistency
    if (report?.html_content) {
      const blob = new Blob([report.html_content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleDownloadMarkdown = (report: any) => {
    // Convert the Python-generated HTML to markdown using Turndown
    if (report?.html_content) {
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
        bulletListMarker: '-'
      })
      
      // Add custom rule for tables to preserve formatting
      turndownService.addRule('tables', {
        filter: 'table',
        replacement: function(content) {
          return '\n\n' + content + '\n\n'
        }
      })

      const markdown = turndownService.turndown(report.html_content)

      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleDownloadPDF = async (report: Report) => {
    // Use the Python-generated HTML as the source for PDF
    if (report.html_content) {
      await generatePDFFromHTML(report.html_content, `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
      return
    }

    // Fallback: try the styled generator if no html_content available
    try {
      await generateStyledPDF(report)
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Unable to generate PDF: no report content available')
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      await deleteReport(reportId)
    }
  }

  const handleViewFullReport = (report: any) => {
    if (report?.html_content) {
      const win = window.open("", "_blank")
      if (win) {
        win.document.write(report.html_content)
        win.document.close()
        win.document.title = report.title
      }
    }
  }

  if (!current_user) {
    return (
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis and reports of your body composition progress
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete your profile setup to generate reports.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive PRIME analysis and progress reports
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleGenerateReport} disabled={loading}>
            <ClientIcon icon={FileText} className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Generate New Report"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {report_generation_status && (
        <Alert>
          <ClientIcon icon={CheckCircle} className="h-4 w-4" />
          <AlertDescription>
            Report status: {report_generation_status}
            {report_generation_entry_date && (
              <span className="ml-1">(Entry date: {report_generation_entry_date})</span>
            )}
          </AlertDescription>
        </Alert>
      )}
 
      {loading && (

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="font-medium">Generating PRIME calculation report...</span>
              </div>
              <Progress value={undefined} className="w-full" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  Calculating optimal progression path...
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></span>
                  Analyzing body composition data...
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></span>
                  Generating AI insights and recommendations...
                </p>
              </div>
              {report_generation_status && (
                <p className="text-xs font-medium text-primary">
                  Current status: {report_generation_status}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                This may take up to 5 minutes. Please do not refresh the page.
              </p>
            </div>

          </CardContent>
        </Card>
      )}

      {current_calculation && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="progression">Progression</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="history">Report History</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Report Diagnostics</CardTitle>
                  <ClientIcon icon={Brain} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium">
                    {report_generation_status || 'No report generation in progress.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Entry used: {report_generation_entry_date || reports[0]?.entry_date || 'Not recorded'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last report: {reports.length > 0 ? new Date(reports[0].generated_at).toLocaleString() : 'None generated yet'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <ClientIcon icon={FileText} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {reports.length > 0 
                      ? `Latest: ${new Date(reports[0].generated_at).toLocaleString()}`
                      : 'No reports yet'
                    }
                  </p>
                </CardContent>
              </Card>


              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weekly Entries</CardTitle>
                  <ClientIcon icon={Target} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{entries.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {entries && entries.length > 0 && entries[0]
                      ? `Latest: ${new Date(entries[0].date).toLocaleString()}`
                      : 'No entries yet'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Program Progress</CardTitle>
                  <ClientIcon icon={Activity} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Calculate progress based on program timeline (consistent with dashboard)
                    if (!current_user?.start_date || !current_user?.end_date) {
                      return (
                        <>
                          <div className="text-2xl font-bold">0%</div>
                          <p className="text-xs text-muted-foreground">No active program</p>
                        </>
                      )
                    }
                    const startDate = new Date(current_user.start_date)
                    const endDate = new Date(current_user.end_date)
                    const today = new Date()
                    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                    const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                    const progressPercent = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
                    const currentWeek = Math.max(1, Math.ceil(daysElapsed / 7))
                    const totalWeeks = Math.ceil(totalDays / 7)
                    return (
                      <>
                        <div className="text-2xl font-bold">{progressPercent}%</div>
                        <p className="text-xs text-muted-foreground">
                          Week {currentWeek} of {totalWeeks}
                        </p>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Weekly Loss</CardTitle>
                  <ClientIcon icon={TrendingUp} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1] ? 
                      (((entries[entries.length - 1].weight - entries[0].weight) / (entries.length - 1)) * -1).toFixed(1)
                      : '0.0'
                    } lbs
                  </div>
                  <p className="text-xs text-muted-foreground">Per week actual rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity Summary</CardTitle>
                  <CardDescription>Latest entries and reports generated</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Latest Entries</h4>
                      {entries.length > 0 ? (
                        <div className="space-y-2">
                          {entries && entries.length > 0 ? entries.slice(0, 3).map((entry, index) => (
                            <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="text-sm">
                                <div className="font-medium">{entry.weight.toFixed(1)} lbs</div>
                                <div className="text-muted-foreground text-xs">
                                  {new Date(entry.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-sm text-right">
                                {entry.body_fat_percentage && (
                                  <div className="font-medium">{entry.body_fat_percentage.toFixed(1)}% BF</div>
                                )}
                                <div className="text-muted-foreground text-xs">
                                  {index === 0 ? 'Latest' : `${index + 1} weeks ago`}
                                </div>
                              </div>
                            </div>
                          )) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No entries recorded yet</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Recent Reports</h4>
                      {reports.length > 0 ? (
                        <div className="space-y-2">
                          {reports && reports.length > 0 ? reports.slice(0, 2).map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="text-sm">
                                <div className="font-medium">{report.title}</div>
                                <div className="text-muted-foreground text-xs">
                                  {new Date(report.generated_at).toLocaleString()}
                                </div>
                              </div>
                              <Badge variant="outline">Complete</Badge>
                            </div>
                          )) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No reports generated yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weekly Performance Insights</CardTitle>
                  <CardDescription>Analysis of your weekly progress patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {entries.length >= 2 ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 border rounded">
                            <div className="text-lg font-bold">
                              {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                                ? ((entries[entries.length - 1].weight - entries[0].weight) * -1).toFixed(1)
                                : '0.0'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">Total Weight Lost</div>
                          </div>
                          <div className="text-center p-3 border rounded">
                            <div className="text-lg font-bold">
                              {entries.length >= 2 && entries[0]?.body_fat_percentage && entries[entries.length - 1]?.body_fat_percentage
                                ? ((entries[entries.length - 1].body_fat_percentage! - entries[0].body_fat_percentage!) * -1).toFixed(1)
                                : '0.0'
                              }%
                            </div>
                            <div className="text-xs text-muted-foreground">Body Fat Reduced</div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Weekly Consistency</h5>
                          <div className="flex items-center space-x-2">
                            <Progress value={(entries.length / (current_calculation?.progression?.length || 16)) * 100} className="flex-1" />
                            <span className="text-sm font-medium">
                              {Math.round((entries.length / (current_calculation?.progression?.length || 16)) * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {entries.length} of {current_calculation?.progression?.length || 16} weeks tracked
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Recent Trend</h5>
                          <div className="text-sm">
                            {entries.length >= 3 ? (
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span>Last 2 weeks avg:</span>
                                  <span className="font-medium">
                                    {entries && entries.length >= 2 && entries[0] && entries[1]
                                      ? (((entries[1].weight - entries[0].weight) / 1) * -1).toFixed(1)
                                      : '0.0'
                                    } lbs/week
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Overall avg:</span>
                                  <span className="font-medium">
                                    {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                                      ? (((entries[entries.length - 1].weight - entries[0].weight) / (entries.length - 1)) * -1).toFixed(1)
                                      : '0.0'
                                    } lbs/week
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">Need more entries to analyze trends</p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Add more weekly entries to see detailed performance insights
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progression" className="space-y-4">
            <ProgressTrendChart 
              entries={entries}
              progression={current_calculation.progression}
              title="PRIME Progression Analysis"
              description="Weekly breakdown of your projected transformation"
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Predictions/Benchmarks/Targets</CardTitle>
                <CardDescription>First 4 weeks of your PRIME calculation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {current_calculation && current_calculation.progression && Array.isArray(current_calculation.progression) && current_calculation.progression.length > 0 ? 
                    current_calculation.progression.slice(0, 4).map((week, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="text-center">
                          <div className="text-lg font-bold">{week.weight.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">Weight (lbs)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{week.body_fat_percentage.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Body Fat</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{Math.round(week.daily_calorie_intake)}</div>
                          <div className="text-xs text-muted-foreground">Daily Calories</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{week.date}</div>
                          <div className="text-xs text-muted-foreground">Week {index + 1}</div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-muted-foreground py-4">
                      No progression data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClientIcon icon={Brain} className="h-5 w-5" />
                    PRIME AI Analysis
                  </CardTitle>
                  <CardDescription>AI-powered insights from your PRIME calculation</CardDescription>
                </CardHeader>
                <CardContent>
                  {current_calculation.ai_analysis ? (
                    <div className="prose max-w-none text-sm">
                      <p>{current_calculation.ai_analysis}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ClientIcon icon={Brain} className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No AI analysis available for this calculation.</p>
                      <p className="text-xs text-muted-foreground mt-1">Generate a new report to get AI insights.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress Recommendations</CardTitle>
                  <CardDescription>AI suggestions based on your current progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {entries.length >= 2 ? (
                      <>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Performance Analysis</h4>
                          <div className="text-sm space-y-1">
                            {(() => {
                              const recentWeightLoss = entries && entries.length >= 2 && entries[0] && entries[1]
                                ? (entries[1].weight - entries[0].weight) * -1 
                                : 0
                              const avgWeightLoss = entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                                ? ((entries[entries.length - 1].weight - entries[0].weight) / (entries.length - 1)) * -1 
                                : 0
                              
                              if (recentWeightLoss > avgWeightLoss + 0.5) {
                                return (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                                    <p className="text-green-800">🎯 <strong>Excellent Progress!</strong> Your recent weight loss ({recentWeightLoss.toFixed(1)} lbs/week) is ahead of your average pace.</p>
                                  </div>
                                )
                              } else if (recentWeightLoss < avgWeightLoss - 0.5) {
                                return (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                    <p className="text-yellow-800">⚠️ <strong>Slowing Progress</strong> Recent loss ({recentWeightLoss.toFixed(1)} lbs/week) is below average. Consider reviewing calorie intake or increasing activity.</p>
                                  </div>
                                )
                              } else {
                                return (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                    <p className="text-blue-800">📈 <strong>Steady Progress</strong> You're maintaining consistent progress at {avgWeightLoss.toFixed(1)} lbs/week. Keep up the great work!</p>
                                  </div>
                                )
                              }
                            })()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Personalized Recommendations</h4>
                          <div className="text-sm space-y-2">
                            {current_user?.workout_type === 'Bodybuilding' && (
                              <div className="flex items-start gap-2">
                                <span className="text-blue-500">💪</span>
                                <p>Focus on maintaining muscle mass with high protein intake ({Math.round(current_user.current_weight * 1.2)}g daily) and consistent resistance training.</p>
                              </div>
                            )}
                            {current_user?.workout_type === 'Powerlifting' && (
                              <div className="flex items-start gap-2">
                                <span className="text-red-500">🏋️</span>
                                <p>Prioritize strength maintenance. Consider periodic refeed days to support performance and metabolism.</p>
                              </div>
                            )}
                            {current_user?.workout_type === 'CrossFit' && (
                              <div className="flex items-start gap-2">
                                <span className="text-orange-500">🔥</span>
                                <p>Balance high-intensity training with adequate recovery. Monitor performance metrics alongside weight loss.</p>
                              </div>
                            )}
                            {current_user?.workout_type === 'Cardio Only' && (
                              <div className="flex items-start gap-2">
                                <span className="text-green-500">🏃</span>
                                <p>Add 2-3 resistance training sessions weekly to preserve muscle mass during weight loss.</p>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <span className="text-purple-500">😴</span>
                              <p>Ensure 7-9 hours of quality sleep nightly to optimize recovery and fat loss hormones.</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-indigo-500">💧</span>
                              <p>Stay hydrated with {Math.round(current_user?.current_weight * 0.5) || 64}+ oz of water daily for optimal metabolism.</p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Add more weekly entries to receive personalized AI recommendations.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Trend Analysis</CardTitle>
                <CardDescription>AI analysis of your weekly progress patterns</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length >= 3 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {entries && entries.length >= 2 && entries[0] && entries[entries.length - 1]
                          ? ((entries[entries.length - 1].weight - entries[0].weight) / (entries.length - 1) * -1 * 4).toFixed(1)
                          : '0.0'
                        } lbs
                      </div>
                      <div className="text-sm text-muted-foreground">Monthly Rate</div>
                      <div className="text-xs text-muted-foreground mt-1">Projected monthly loss</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {current_calculation && current_calculation.progression && current_calculation.progression.length > 0 ? 
                          Math.round((entries.length / current_calculation.progression.length) * 100) : 0
                        }%
                      </div>
                      <div className="text-sm text-muted-foreground">Completion</div>
                      <div className="text-xs text-muted-foreground mt-1">Program progress</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {current_calculation?.confidence_score || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">AI Confidence</div>
                      <div className="text-xs text-muted-foreground mt-1">Plan reliability</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Need at least 3 weekly entries for trend analysis.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report History</CardTitle>
                <CardDescription>Previously generated reports</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{report.title}</div>
                          <div className="text-sm text-muted-foreground">
                            Generated {new Date(report.generated_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link href={`/reports/${report.id}`}>
                            <Button variant="default" size="sm">
                              <ClientIcon icon={Eye} className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          {report.html_content && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleViewFullReport(report)}
                              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                            >
                              <ClientIcon icon={FileText} className="mr-1 h-3 w-3" />
                              Full Report
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadHTML(report)}
                          >
                            <ClientIcon icon={Download} className="mr-1 h-3 w-3" />
                            HTML
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadMarkdown(report)}
                          >
                            <ClientIcon icon={FileDown} className="mr-1 h-3 w-3" />
                            MD
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(report)}
                          >
                            <ClientIcon icon={FileText} className="mr-1 h-3 w-3" />
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <ClientIcon icon={TrashIcon} className="h-3 w-3" />
                          </Button>
                          <Badge variant="outline">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No previous reports found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {!current_calculation && (
        <Card>
          <CardHeader>
            <CardTitle>No Calculation Available</CardTitle>
            <CardDescription>Generate a PRIME calculation first to view reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to have a PRIME calculation completed before you can generate reports.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
