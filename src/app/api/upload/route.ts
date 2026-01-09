import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Upload directory - configurable via environment variable
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    // Create subdirectories for different image types
    await mkdir(path.join(UPLOAD_DIR, 'profiles'), { recursive: true });
    await mkdir(path.join(UPLOAD_DIR, 'banners'), { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'profile' or 'banner'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size (20MB limit)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 20MB' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${fileExt}`;
    
    // Determine subdirectory based on type
    const subDir = type === 'profile' ? 'profiles' : 'banners';
    const filePath = path.join(UPLOAD_DIR, subDir, fileName);
    
    // Save file
    await writeFile(filePath, buffer);
    
    // Return the URL path (relative to public)
    const imageUrl = `/uploads/${subDir}/${fileName}`;
    
    return NextResponse.json(
      { url: imageUrl, fileName },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Delete endpoint for removing old images
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract file path from URL
    const relativePath = imageUrl.replace('/uploads/', '');
    const filePath = path.join(UPLOAD_DIR, relativePath);

    // Security check - ensure the path is within upload directory
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete file (we'll ignore errors if file doesn't exist)
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, which is okay
      console.log('File deletion error (may not exist):', error);
    }

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500, headers: corsHeaders }
    );
  }
}