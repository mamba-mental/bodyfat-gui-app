import fs from 'fs/promises';

/**
 * Remove the target file if it exists. Uses forceful rm to avoid ENOENT races.
 */
export async function removeIfExists(filePath: string): Promise<void> {
  await fs.rm(filePath, { force: true });
}
