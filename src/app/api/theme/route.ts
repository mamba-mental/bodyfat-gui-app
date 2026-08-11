/**
 * GET/PUT /api/theme
 *
 * Manages user theme preferences with hybrid storage (localStorage + cookie + database)
 *
 * T024: Implement Theme Persistence API Endpoint
 * OpenAPI Contract: contracts/theme-persistence.openapi.yaml
 * Constitutional Requirement: Article III - Frontend Stability (hybrid theme persistence)
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '@/lib/constants';
import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from '@/lib/palettes';

// Type definitions matching OpenAPI schema
interface ThemeResponse {
  theme: 'light' | 'dark' | 'system';
  palette: PaletteId;
  font?: string;
  updated_at?: string;
  source: 'localStorage' | 'cookie' | 'database' | 'default';
  sync_status: SyncStatus;
  cross_device_sync_enabled: boolean;
}

interface ThemeUpdateRequest {
  theme?: 'light' | 'dark' | 'system';
  palette?: PaletteId;
  font?: string;
  user_id?: string;
}

interface ThemeUpdateResponse {
  theme?: 'light' | 'dark' | 'system';
  palette?: PaletteId;
  font?: string;
  updated_at: string;
  storage_updates: StorageUpdates;
  sync_broadcast: boolean;
}

interface SyncStatus {
  localStorage: boolean;
  cookie: boolean;
  database: boolean;
}

interface StorageUpdates {
  localStorage: boolean;
  cookie: boolean;
  database: boolean;
}

const THEME_FILE = path.join(DATA_DIR, 'theme-preferences.json');

interface ThemeStore {
  [userId: string]: {
    theme: 'light' | 'dark' | 'system';
    palette?: PaletteId;
    font?: string;
    updated_at: string;
  };
}

// Read theme data from JSON file
async function readThemeData(): Promise<ThemeStore> {
  try {
    const data = await fs.readFile(THEME_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Write theme data to JSON file
async function writeThemeData(data: ThemeStore): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
  await fs.writeFile(THEME_FILE, JSON.stringify(data, null, 2));
}

// GET /api/theme - Retrieve theme preference
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Check cookie first (SSR compatibility)
    const cookieTheme = request.cookies.get('theme')?.value as 'light' | 'dark' | 'system' | undefined;

    let theme: 'light' | 'dark' | 'system' = 'system';
    let palette: PaletteId = DEFAULT_PALETTE;
    let font: string | undefined;
    let source: 'localStorage' | 'cookie' | 'database' | 'default' = 'default';
    let updated_at: string | undefined;

    // If user_id provided, check JSON file storage
    if (userId) {
      const themeStore = await readThemeData();
      const userTheme = themeStore[userId];

      if (userTheme) {
        theme = userTheme.theme;
        palette = isPaletteId(userTheme.palette) ? userTheme.palette : DEFAULT_PALETTE;
        font = userTheme.font;
        updated_at = userTheme.updated_at;
        source = 'database';
      }
    }

    // Fall back to cookie if database has no record
    if (source === 'default' && cookieTheme) {
      theme = cookieTheme;
      source = 'cookie';
    }

    const response: ThemeResponse = {
      theme,
      palette,
      font,
      updated_at,
      source,
      sync_status: {
        localStorage: true, // Assume client-side localStorage is in sync
        cookie: !!cookieTheme,
        database: source === 'database',
      },
      cross_device_sync_enabled: !!userId,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Theme retrieval error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Error retrieving theme preference',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/theme - Update theme preference and/or font
export async function PUT(request: NextRequest) {
  try {
    const body: ThemeUpdateRequest = await request.json();

    // Validate theme value if provided
    const validThemes = ['light', 'dark', 'system'];
    if (body.theme && !validThemes.includes(body.theme)) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid theme value. Must be one of: light, dark, system',
        },
        { status: 400 }
      );
    }

    if (body.palette && !isPaletteId(body.palette)) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid palette value',
        },
        { status: 400 }
      );
    }

    // Must have at least theme or font to update
    if (!body.theme && !body.font && !body.palette) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Must provide theme, palette, or font to update',
        },
        { status: 400 }
      );
    }

    const { theme, palette, font, user_id } = body;
    const updated_at = new Date().toISOString();

    const storage_updates: StorageUpdates = {
      localStorage: true, // Client-side will update localStorage
      cookie: !!theme,
      database: false,
    };

    // Update JSON file storage if user_id provided
    if (user_id) {
      try {
        const themeStore = await readThemeData();
        const existing = themeStore[user_id] || { theme: 'system', palette: DEFAULT_PALETTE, updated_at };
        themeStore[user_id] = {
          theme: theme || existing.theme,
          palette: palette || existing.palette || DEFAULT_PALETTE,
          font: font || existing.font,
          updated_at,
        };
        await writeThemeData(themeStore);
        storage_updates.database = true;
      } catch (dbError) {
        console.error('Theme file storage update error:', dbError);
        // Continue even if database update fails (graceful degradation)
      }
    }

    const response: ThemeUpdateResponse = {
      theme,
      palette,
      font,
      updated_at,
      storage_updates,
      sync_broadcast: true, // Client-side will use BroadcastChannel API
    };

    // Set cookie for SSR compatibility (theme only)
    const nextResponse = NextResponse.json(response, { status: 200 });
    if (theme) {
      nextResponse.cookies.set('theme', theme, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
        sameSite: 'lax',
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('Theme update error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Error updating theme preference',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
