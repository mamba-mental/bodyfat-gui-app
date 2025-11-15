import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const REPORTS_DIR = path.join(process.cwd(), "storage", "reports")

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".markdown": "text/markdown; charset=utf-8",
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename)
  const filePath = path.join(REPORTS_DIR, filename)

  try {
    const fileBuffer = await fs.readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Failed to serve report asset:", error)
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    )
  }
}
