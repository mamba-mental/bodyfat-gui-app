import path from 'path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Report } from '@/types';

process.env.DATA_DIR = path.join(process.cwd(), '__test-data');

const removeIfExists = vi.fn<[string], Promise<void>>();

vi.mock('@/lib/fs-utils', () => ({
  removeIfExists,
}));

const validateDataFile = vi.fn<[string], Promise<boolean>>();
const createBackup = vi.fn<[string], Promise<string | void>>();

vi.mock('@/lib/server-storage-backup', () => ({
  createBackup,
  validateDataFile,
}));

const existingPaths = new Set<string>();
const fileContents = new Map<string, string>();

const access = vi.fn(async (target: string) => {
  if (!existingPaths.has(target)) {
    const error = new Error('not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }
});

const mkdir = vi.fn(async (target: string) => {
  existingPaths.add(target);
});

const readFile = vi.fn(async (target: string) => {
  if (!fileContents.has(target)) {
    const error = new Error('not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }
  return fileContents.get(target)!;
});

const writeFile = vi.fn(async (target: string, contents: string) => {
  fileContents.set(target, contents);
});

const rename = vi.fn(async (from: string, to: string) => {
  if (!fileContents.has(from)) {
    throw new Error(`missing ${from}`);
  }
  fileContents.set(to, fileContents.get(from)!);
  fileContents.delete(from);
});

const rm = vi.fn(async (target: string) => {
  fileContents.delete(target);
});

vi.mock('fs/promises', () => ({
  __esModule: true,
  default: { access, mkdir, readFile, writeFile, rename, rm },
  access,
  mkdir,
  readFile,
  writeFile,
  rename,
  rm,
}));

let dbSaveReport: (report: Report, userId?: number) => Promise<void>;

beforeAll(async () => {
  ({ dbSaveReport } = await import('@/lib/server-storage'));
});

beforeEach(() => {
  removeIfExists.mockReset();
  validateDataFile.mockReset();
  createBackup.mockReset();
  access.mockClear();
  mkdir.mockClear();
  readFile.mockClear();
  writeFile.mockClear();
  rename.mockClear();
  rm.mockClear();
  existingPaths.clear();
  fileContents.clear();
});

describe('dbSaveReport cleanup behaviour', () => {
  it('invokes removeIfExists when validation fails and surfaces the validation error', async () => {
    validateDataFile.mockResolvedValue(false);
    removeIfExists.mockResolvedValue();

    const report: Report = {
      id: 'r-1',
      user_id: '1',
      title: 'Test Report',
      generated_at: new Date().toISOString(),
    };

    await expect(dbSaveReport(report, 1)).rejects.toThrow('Data validation failed');

    expect(removeIfExists).toHaveBeenCalledTimes(2);
    const [firstCall] = removeIfExists.mock.calls;
    expect(firstCall[0]).toContain('apexfit-data.json');
    expect(firstCall[0]).toMatch(/\.tmp$/);
  });
});
