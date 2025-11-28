"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, FileDown, FileText, Calendar, Weight, Target, TrendingDown, Brain, BarChart3, Eye } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import { useApp } from "@/contexts/app-context"
import { Report, WeeklyProgression } from "@/types"
import { generatePDFFromHTML, generateStyledPDF } from "@/lib/pdf-generator"
import { formatDate } from "@/lib/date-utils"
// @ts-ignore
import TurndownService from 'turndown'

interface ReportViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ReportViewPage({ params }: ReportViewPageProps) {
  const router = useRouter()
  const { state } = useApp()
  const { reports } = state
  const unwrappedParams = React.use(params)

  const report = React.useMemo(() => {
    return reports.find(r => r.id === unwrappedParams.id)
  }, [reports, unwrappedParams.id])

  const calc = report?.calculation_result
  const hasValidCalculation =
    calc &&
    typeof calc === 'object' &&
    calc.summary &&
    calc.user_data

  if (!report) {
    return (
      <div className="container max-w-4xl mx-auto space-y-6 p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Report Not Found</h1>
          <p className="text-muted-foreground">The requested report could not be found.</p>
          <Button onClick={() => router.push('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </div>
      </div>
    )
  }

  if (!hasValidCalculation) {
    return (
      <div className="container max-w-4xl mx-auto space-y-6 p-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{report.title}</h1>
          <Card>
            <CardHeader>
              <CardTitle>Report Data Unavailable</CardTitle>
              <CardDescription>
                This report does not include calculation details. Regenerate the report to view full metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/reports')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { summary, user_data: userData } = calc

  const handleDownloadHTML = () => {
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

  const handleDownloadMarkdown = () => {
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
        replacement: function (content: string) {
          return '\n\n' + content + '\n\n'
        }
      })

      // Remove images to avoid huge base64 strings
      turndownService.addRule('images', {
        filter: 'img',
        replacement: function (content: string, node: any) {
          const alt = (node as HTMLElement).getAttribute('alt') || 'Chart'
          return `\n\n*[Image: ${alt} - View in HTML/PDF version]*\n\n`
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

  const handleDownloadPDF = async () => {
    // Use the Python-generated HTML as the source for PDF
    if (report?.html_content) {
      await generatePDFFromHTML(report.html_content, `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
      return
    }

    // Fallback: try the styled generator if no html_content available
    if (report) {
      try {
        await generateStyledPDF(report)
      } catch (error) {
        console.error('PDF generation failed:', error)
        alert('Unable to generate PDF: no report content available')
      }
    }
  }

  const handleViewFullReport = () => {
    if (report?.html_content) {
      const win = window.open("", "_blank")
      if (win) {
        win.document.write(report.html_content)
        win.document.close()
        win.document.title = report.title
      }
    }
  }

  return (
    <div className="container max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{report.title}</h1>
            <p className="text-muted-foreground">
              Generated on {new Date(report.generated_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {report.html_content && (
            <Button onClick={handleViewFullReport} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <ClientIcon icon={Eye} className="mr-2 h-4 w-4" />
              View Full Report
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadHTML}>
            <Download className="mr-2 h-4 w-4" />
            HTML
          </Button>
          <Button variant="outline" onClick={handleDownloadMarkdown}>
            <FileDown className="mr-2 h-4 w-4" />
            Markdown
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weight Loss</CardTitle>
            <ClientIcon icon={Weight} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {typeof summary.total_weight_loss === 'number'
                ? `${summary.total_weight_loss.toFixed(1)} lbs`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {`${userData.current_weight ?? '—'} → ${userData.goal_weight ?? '—'} lbs`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Body Fat Reduction</CardTitle>
            <ClientIcon icon={TrendingDown} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {typeof summary.body_fat_reduction === 'number'
                ? `${summary.body_fat_reduction.toFixed(1)}%`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {`${userData.current_bf ?? '—'}% → ${userData.goal_bf ?? '—'}%`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <ClientIcon icon={Calendar} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary.timeline_weeks ?? '—'} weeks
            </div>
            <p className="text-xs text-muted-foreground">
              {`${userData.start_date ? new Date(userData.start_date).toLocaleDateString() : '—'} → ${userData.end_date ? new Date(userData.end_date).toLocaleDateString() : '—'}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Muscle Gain</CardTitle>
            <ClientIcon icon={Target} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {typeof summary.muscle_gain === 'number'
                ? `${summary.muscle_gain.toFixed(1)} lbs`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {userData.workout_type ? `${userData.workout_type} focused` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>User profile and program configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <h4 className="font-medium">Personal Info</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span>{userData.age ?? '—'} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span>{userData.gender === 'm' ? 'Male' : userData.gender === 'f' ? 'Female' : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height:</span>
                  <span>{userData.height_feet}'{userData.height_inches}"</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Training Program</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workout Type:</span>
                  <Badge variant="outline">{userData.workout_type ?? '—'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Training Days:</span>
                  <span>{userData.workout_days ?? '—'}/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Activity Level:</span>
                  <span>{userData.activity_level ?? '—'}/5</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Nutrition</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein Intake:</span>
                  <span>{userData.protein_intake ?? '—'}g/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diet Type:</span>
                  <Badge variant="outline">{userData.diet_type ?? '—'}</Badge>
                </div>
                {calc.confidence_score && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Confidence:</span>
                    <span>{calc.confidence_score}/100</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {calc.ai_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClientIcon icon={Brain} className="h-5 w-5" />
              AI Analysis
            </CardTitle>
            <CardDescription>Personalized insights and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-sm">
              <p>{calc.ai_analysis}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Progression Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClientIcon icon={BarChart3} className="h-5 w-5" />
            Weekly Progression Log
          </CardTitle>
          <CardDescription>
            Detailed week-by-week breakdown of your transformation plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Week</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Body Fat %</TableHead>
                  <TableHead className="text-right">Daily Calories</TableHead>
                  <TableHead className="text-right">TDEE</TableHead>
                  <TableHead className="text-right">Lean Mass</TableHead>
                  <TableHead className="text-right">Fat Mass</TableHead>
                  <TableHead className="text-right">Weekly Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calc.progression.map((week, index) => (
                  <TableRow key={index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{formatDate(week.date)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {week.weight.toFixed(1)} lbs
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {week.body_fat_percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Math.round(week.daily_calorie_intake)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Math.round(week.tdee)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {week.lean_mass.toFixed(1)} lbs
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {week.fat_mass.toFixed(1)} lbs
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {index > 0 ?
                        `${(calc.progression[index - 1].weight - week.weight).toFixed(1)} lbs` :
                        '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Metabolic Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metabolic Components (First 4 Weeks)</CardTitle>
            <CardDescription>Breakdown of energy expenditure components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calc.progression && Array.isArray(calc.progression) && calc.progression.length > 0 ?
                calc.progression.slice(0, 4).map((week, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Week {index + 1}</span>
                      <Badge variant="outline">{formatDate(week.date)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RMR:</span>
                        <span className="font-mono">{Math.round(week.rmr)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TEF:</span>
                        <span className="font-mono">{Math.round(week.tef)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NEAT:</span>
                        <span className="font-mono">{Math.round(week.neat)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deficit:</span>
                        <span className="font-mono text-green-600">
                          {Math.round(week.tdee - week.daily_calorie_intake)}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground py-4">
                    No metabolic data available
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Body Composition Changes</CardTitle>
            <CardDescription>Predicted changes in lean vs fat mass</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calc.progression && Array.isArray(calc.progression) && calc.progression.length > 0 ?
                calc.progression.slice(0, 6).map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">{formatDate(week.date)}</div>
                        <div className="text-muted-foreground">
                          {week.weight.toFixed(1)} lbs • {week.body_fat_percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-green-600">
                        +{week.muscle_gain.toFixed(2)} lbs muscle
                      </div>
                      <div className="text-muted-foreground">
                        {index > 0 ?
                          `${(calc.progression[index - 1].fat_mass - week.fat_mass).toFixed(1)} lbs fat lost` :
                          'Baseline'
                        }
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground py-4">
                    No body composition data available
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
