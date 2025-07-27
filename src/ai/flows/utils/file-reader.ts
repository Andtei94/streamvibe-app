
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@/lib/logger';

/**
 * @fileOverview
 * Provides a utility function to recursively read relevant source code files from the project.
 */

const IGNORED_DIRS = new Set(['.git', '.next', '.vscode', 'public', 'node_modules']);
const IGNORED_FILES = new Set(['.ds_store', 'package-lock.json', 'yarn.lock']);
const IGNORED_EXTENSIONS = new Set(['.log', '.ico', '.png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'mov', 'webm']);

async function scanDirectory(currentDir: string, projectRoot: string): Promise<{ path: string; content: string }[]> {
  const fullPath = path.resolve(projectRoot, currentDir);
  // Security check to prevent path traversal attacks
  if (!fullPath.startsWith(projectRoot)) {
    throw new Error(`Security violation: Attempted to access directory outside project root: ${currentDir}`);
  }

  let files: { path: string; content: string }[] = [];
  
  try {
    const dirents = await fs.readdir(fullPath, { withFileTypes: true });

    for (const dirent of dirents) {
      const direntName = dirent.name;
      const relativePath = path.join(currentDir, direntName);
      
      if (dirent.isDirectory()) {
        if (!IGNORED_DIRS.has(direntName)) {
          files = files.concat(await scanDirectory(relativePath, projectRoot));
        }
      } else {
        const extension = path.extname(direntName).toLowerCase();
        if (!IGNORED_EXTENSIONS.has(extension) && !IGNORED_FILES.has(direntName)) {
          try {
            const content = await fs.readFile(path.resolve(projectRoot, relativePath), 'utf-8');
            files.push({ path: relativePath, content });
          } catch (readError: any) {
             logger.warn({ error: readError, file: relativePath, code: readError.code }, `Skipping file due to read error.`);
          }
        }
      }
    }
  } catch (dirError: any) {
    logger.error({ error: dirError, dir: currentDir, code: dirError.code }, `Failed to scan directory. It may not exist or permissions are denied.`);
    throw new Error(`Failed to scan directory ${currentDir}: ${dirError.message}`, { cause: dirError });
  }

  return files;
}

export async function getProjectFiles(): Promise<{ path: string; content: string }[]> {
  const projectRoot = process.cwd();
  if(!projectRoot) {
      throw new Error("Could not determine project root directory.");
  }
  
  const allFiles = await scanDirectory('', projectRoot);

  // Remove duplicates that might arise from overlapping directory scans
  const uniqueFiles = Array.from(new Map(allFiles.map(file => [file.path, file])).values());

  return uniqueFiles;
}
