"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, FileDown, FileText, Calendar, Weight, Target, TrendingDown, Brain, BarChart3 } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import { useApp } from "@/contexts/app-context"
import { Report, WeeklyProgression } from "@/types"
import { generatePDFFromHTML, generateStyledPDF } from "@/lib/pdf-generator"

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

  const calc = report.calculation_result

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
    if (report?.calculation_result) {
      const calc = report.calculation_result
      const markdown = `# ${report.title}

## Summary
- **Total Weight Loss:** ${calc.summary?.total_weight_loss?.toFixed(1) || 'N/A'} lbs
- **Body Fat Reduction:** ${calc.summary?.body_fat_reduction?.toFixed(1) || 'N/A'}%
- **Muscle Gain:** ${calc.summary?.muscle_gain?.toFixed(1) || 'N/A'} lbs
- **Timeline:** ${calc.summary?.timeline_weeks || 'N/A'} weeks

## Current Stats
- **Weight:** ${calc.user_data?.current_weight || 'N/A'} lbs
- **Body Fat:** ${calc.user_data?.current_bf || 'N/A'}%

## Goal Stats
- **Target Weight:** ${calc.user_data?.goal_weight || 'N/A'} lbs
- **Target Body Fat:** ${calc.user_data?.goal_bf || 'N/A'}%

${calc.confidence_score ? `## Plan Confidence Score: ${calc.confidence_score}/100` : ''}

## Weekly Progression
| Week | Date | Weight (lbs) | Body Fat % | Daily Calories | TDEE | Lean Mass | Fat Mass |
|------|------|-------------|------------|----------------|------|-----------|----------|
${calc.progression.map((week: WeeklyProgression, index: number) => 
  `| ${index + 1} | ${week.date} | ${week.weight.toFixed(1)} | ${week.body_fat_percentage.toFixed(1)} | ${Math.round(week.daily_calorie_intake)} | ${Math.round(week.tdee)} | ${week.lean_mass.toFixed(1)} | ${week.fat_mass.toFixed(1)} |`
).join('\n')}

${calc.ai_analysis ? `## AI Analysis\n${calc.ai_analysis}` : ''}

---
*Generated on ${new Date(report.generated_at).toLocaleString()}*
`
      
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
    if (report) {
      try {
        // Use the styled PDF generator
        await generateStyledPDF(report)
      } catch (error) {
        console.error('PDF generation failed:', error)
        // Fallback to HTML-based PDF
        if (report.html_content) {
          await generatePDFFromHTML(report.html_content, `${report.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
        }
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
              {calc.summary.total_weight_loss.toFixed(1)} lbs
            </div>
            <p className="text-xs text-muted-foreground">
              {calc.user_data.current_weight} → {calc.user_data.goal_weight} lbs
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
              {calc.summary.body_fat_reduction.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {calc.user_data.current_bf}% → {calc.user_data.goal_bf}%
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
              {calc.summary.timeline_weeks} weeks
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(calc.user_data.start_date).toLocaleDateString()} → {new Date(calc.user_data.end_date).toLocaleDateString()}
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
              {calc.summary.muscle_gain.toFixed(1)} lbs
            </div>
            <p className="text-xs text-muted-foreground">
              {calc.user_data.workout_type} focused
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
                  <span>{calc.user_data.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span>{calc.user_data.gender === 'm' ? 'Male' : 'Female'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height:</span>
                  <span>{calc.user_data.height_feet}'{calc.user_data.height_inches}"</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Training Program</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workout Type:</span>
                  <Badge variant="outline">{calc.user_data.workout_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Training Days:</span>
                  <span>{calc.user_data.workout_days}/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Activity Level:</span>
                  <span>{calc.user_data.activity_level}/5</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Nutrition</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein Intake:</span>
                  <span>{calc.user_data.protein_intake}g/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diet Type:</span>
                  <Badge variant="outline">{calc.user_data.diet_type}</Badge>
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
                    <TableCell>{week.date}</TableCell>
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
                    <Badge variant="outline">{week.date}</Badge>
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
                      <div className="font-medium">{week.date}</div>
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