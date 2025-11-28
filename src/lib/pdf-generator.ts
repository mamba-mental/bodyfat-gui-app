import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Report, CalculationResult, UserData, WeeklyProgression } from '@/types'

export async function generatePDFFromHTML(htmlContent: string, filename: string): Promise<void> {
  // Create a temporary container for the HTML
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.width = '800px'
  container.innerHTML = htmlContent
  document.body.appendChild(container)

  try {
    // Convert HTML to canvas with options to handle modern CSS
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 800,
      ignoreElements: (element) => {
        // Skip elements that might have problematic CSS
        return false
      },
      onclone: (clonedDoc) => {
        // Replace modern CSS color functions with fallbacks
        const styleSheets = clonedDoc.styleSheets
        for (let i = 0; i < styleSheets.length; i++) {
          try {
            const sheet = styleSheets[i] as CSSStyleSheet
            if (sheet.cssRules) {
              for (let j = 0; j < sheet.cssRules.length; j++) {
                const rule = sheet.cssRules[j] as CSSStyleRule
                if (rule.style) {
                  // Convert lab() colors to rgb() fallbacks
                  for (let k = 0; k < rule.style.length; k++) {
                    const prop = rule.style[k]
                    const value = rule.style.getPropertyValue(prop)
                    if (value && (value.includes('lab(') || value.includes('oklch('))) {
                      // Replace with a safe fallback color
                      rule.style.setProperty(prop, '#000000', 'important')
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Skip stylesheets we can't access (CORS)
            continue
          }
        }

        // Also update inline styles
        const allElements = clonedDoc.querySelectorAll('*')
        allElements.forEach((el: Element) => {
          if (el instanceof HTMLElement && el.style) {
            for (let i = 0; i < el.style.length; i++) {
              const prop = el.style[i]
              const value = el.style.getPropertyValue(prop)
              if (value && (value.includes('lab(') || value.includes('oklch('))) {
                el.style.setProperty(prop, '#000000', 'important')
              }
            }
          }
        })
      }
    })

    // Calculate PDF dimensions
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    let position = 0

    // Add image to PDF, handling multiple pages if needed
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      position,
      imgWidth,
      imgHeight
    )
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      )
      heightLeft -= pageHeight
    }

    // Save the PDF
    pdf.save(filename)
  } finally {
    // Clean up
    document.body.removeChild(container)
  }
}

export function generatePDFFromReport(report: Report): void {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Early return if no calculation result
  if (!report.calculation_result) {
    pdf.text('Report data unavailable', margin, yPosition)
    pdf.save(`report-${report.id}.pdf`)
    return
  }

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize = 12, fontStyle: 'normal' | 'bold' = 'normal') => {
    pdf.setFontSize(fontSize)
    pdf.setFont('helvetica', fontStyle)
    const lines = pdf.splitTextToSize(text, contentWidth)
    pdf.text(lines, margin, yPosition)
    yPosition += lines.length * fontSize * 0.4
    return lines.length
  }

  // Helper function to check and add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage()
      yPosition = margin
    }
  }

  // Title
  addText('Ap³𝘹Fit.ai Progress Report', 24, 'bold')
  yPosition += 5

  // Date
  addText(`Generated on: ${new Date(report.generated_at).toLocaleDateString()}`, 10)
  yPosition += 10

  // User Information
  const userData = report.calculation_result.user_data
  addText('Personal Information', 16, 'bold')
  yPosition += 5
  addText(`Name: ${userData.name}`)
  addText(`Age: ${userData.age} years`)
  addText(`Height: ${userData.height_feet}'${userData.height_inches}" (${userData.height_cm.toFixed(1)} cm)`)
  addText(`Gender: ${userData.gender === 'm' ? 'Male' : 'Female'}`)
  yPosition += 10

  // Current Status
  checkNewPage(40)
  addText('Current Status', 16, 'bold')
  yPosition += 5
  addText(`Current Weight: ${userData.current_weight.toFixed(1)} lbs`)
  addText(`Body Fat: ${userData.current_bf.toFixed(1)}%`)
  addText(`Lean Mass: ${(userData.current_weight * (1 - userData.current_bf / 100)).toFixed(1)} lbs`)
  yPosition += 10

  // Goals
  checkNewPage(40)
  addText('Goals', 16, 'bold')
  yPosition += 5
  addText(`Target Weight: ${userData.goal_weight.toFixed(1)} lbs`)
  addText(`Target Body Fat: ${userData.goal_bf.toFixed(1)}%`)
  addText(`Timeline: ${report.calculation_result.summary.timeline_weeks} weeks`)
  yPosition += 10

  // Summary
  checkNewPage(50)
  addText('Summary', 16, 'bold')
  yPosition += 5
  addText(`Total Weight Loss: ${report.calculation_result.summary.total_weight_loss.toFixed(1)} lbs`)
  addText(`Body Fat Reduction: ${report.calculation_result.summary.body_fat_reduction.toFixed(1)}%`)
  addText(`Muscle Gain: ${report.calculation_result.summary.muscle_gain.toFixed(1)} lbs`)
  yPosition += 10

  // AI Analysis
  if (report.calculation_result.ai_analysis) {
    checkNewPage(60)
    addText('AI Analysis', 16, 'bold')
    yPosition += 5
    addText(report.calculation_result.ai_analysis)
    yPosition += 10
  }

  // Weekly Progression Table
  checkNewPage(100)
  addText('Weekly Progression', 16, 'bold')
  yPosition += 5

  // Table headers
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  const colWidths = [20, 30, 30, 30, 40]
  const headers = ['Week', 'Weight (lbs)', 'Body Fat %', 'Lean Mass', 'Calories/Day']
  let xPos = margin

  headers.forEach((header, index) => {
    pdf.text(header, xPos, yPosition)
    xPos += colWidths[index]
  })
  yPosition += 5

  // Table data
  pdf.setFont('helvetica', 'normal')
  report.calculation_result.progression.forEach((week, index) => {
    checkNewPage(10)
    xPos = margin
    const rowData = [
      (index + 1).toString(),
      week.weight.toFixed(1),
      week.body_fat_percentage.toFixed(1),
      week.lean_mass.toFixed(1),
      Math.round(week.daily_calorie_intake).toString()
    ]

    rowData.forEach((data, colIndex) => {
      pdf.text(data, xPos, yPosition)
      xPos += colWidths[colIndex]
    })
    yPosition += 5
  })

  // Footer
  yPosition = pageHeight - 20
  pdf.setFontSize(8)
  pdf.text('Generated by Ap³𝘹Fit.ai – Advanced AI-Powered Fitness Analytics', pageWidth / 2, yPosition, { align: 'center' })

  // Save the PDF
  pdf.save(`${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
}

// Generate styled PDF with better formatting
export async function generateStyledPDF(report: Report): Promise<void> {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // Early return if no calculation result
  if (!report.calculation_result) {
    pdf.text('Report data unavailable', margin, y)
    pdf.save(`report-${report.id}.pdf`)
    return
  }

  // Colors
  const primaryColor: [number, number, number] = [52, 152, 219] // Blue
  const secondaryColor: [number, number, number] = [46, 204, 113] // Green
  const textColor: [number, number, number] = [51, 51, 51]
  const lightGray: [number, number, number] = [245, 245, 245]

  // Header background
  pdf.setFillColor(...primaryColor)
  pdf.rect(0, 0, pageWidth, 40, 'F')

  // Title
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Ap³𝘹Fit.ai Progress Report', pageWidth / 2, 20, { align: 'center' })

  // Subtitle
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Advanced AI-Powered Fitness Analytics', pageWidth / 2, 30, { align: 'center' })

  // Reset text color
  pdf.setTextColor(...textColor)
  y = 50

  // User info section
  const userData = report.calculation_result.user_data
  pdf.setFillColor(...lightGray)
  pdf.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F')

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${userData.name}`, margin + 5, y + 10)

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${userData.age} years | ${userData.height_feet}'${userData.height_inches}" | ${userData.gender === 'm' ? 'Male' : 'Female'}`, margin + 5, y + 20)
  pdf.text(`Generated: ${new Date(report.generated_at).toLocaleDateString()}`, pageWidth - margin - 5, y + 20, { align: 'right' })

  y += 40

  // Key metrics cards
  const metrics = [
    { label: 'Current Weight', value: `${userData.current_weight.toFixed(1)} lbs`, color: primaryColor },
    { label: 'Body Fat', value: `${userData.current_bf.toFixed(1)}%`, color: secondaryColor },
    { label: 'Goal Weight', value: `${userData.goal_weight.toFixed(1)} lbs`, color: primaryColor },
    { label: 'Timeline', value: `${report.calculation_result.summary.timeline_weeks} weeks`, color: secondaryColor }
  ]

  const cardWidth = (contentWidth - 15) / 4
  let xPos = margin

  metrics.forEach(metric => {
    // Card background
    pdf.setFillColor(...lightGray)
    pdf.roundedRect(xPos, y, cardWidth, 25, 2, 2, 'F')

    // Metric label
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text(metric.label, xPos + cardWidth / 2, y + 8, { align: 'center' })

    // Metric value
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...metric.color)
    pdf.text(metric.value, xPos + cardWidth / 2, y + 18, { align: 'center' })

    xPos += cardWidth + 5
  })

  pdf.setTextColor(...textColor)
  pdf.setFont('helvetica', 'normal')

  // Continue with the rest of the report...
  // This is a simplified version - you can expand with charts, graphs, etc.

  pdf.save(`ApexFit_Report_${userData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}