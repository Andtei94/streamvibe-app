
'use server';
/**
 * @fileOverview An orchestrator AI flow that takes a list of selected issues
 * from multiple files, groups them by file, and then invokes other flows
 * to fix them. Instead of writing to disk, it returns the changes.
 */

import { ai } from '@/ai/init';
import { z } from 'zod';
import { fixCodeIssues } from './fix-code-issues-flow';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  FixSelectedIssuesInputSchema,
  type FixSelectedIssuesInput,
  FixSelectedIssuesOutputSchema,
  type FixSelectedIssuesOutput,
  AnalysisResultSchema
} from '../schemas';
import { logger } from '@/lib/logger';

const groupIssuesByFile = (issues: z.infer<typeof AnalysisResultSchema>[]) => {
  return issues.reduce((acc, issue) => {
    if (!acc[issue.filePath]) {
      acc[issue.filePath] = [];
    }
    acc[issue.filePath].push(issue);
    return acc;
  }, {} as Record<string, z.infer<typeof AnalysisResultSchema>[] | undefined>);
};

const isValidFilePath = (filePath: string, allowedDirs: string[]): boolean => {
    const rootDir = process.cwd();
    const resolvedPath = path.resolve(rootDir, filePath);
    
    if (!resolvedPath.startsWith(rootDir)) {
        return false;
    }
    
    const forbiddenSegments = ['.git', '.next', 'node_modules', '.vscode', 'public'];
    const pathSegments = resolvedPath.split(path.sep);
    if (pathSegments.some(segment => forbiddenSegments.includes(segment))) {
        return false;
    }

    // Check if the file is within one of the allowed directories
    return allowedDirs.some(dir => resolvedPath.startsWith(path.resolve(rootDir, dir)));
};


export const fixSelectedIssues = ai.defineFlow(
  {
    name: 'fixSelectedIssuesFlow',
    inputSchema: FixSelectedIssuesInputSchema,
    outputSchema: FixSelectedIssuesOutputSchema,
  },
  async (input: FixSelectedIssuesInput): Promise<FixSelectedIssuesOutput> => {
    try {
       const { issues, allowedDirs } = FixSelectedIssuesInputSchema.parse(input);

      if (issues.length === 0) {
        return { success: true, summary: "No issues selected to fix.", modifiedFiles: [] };
      }
       if (!allowedDirs || allowedDirs.length === 0) {
        throw new Error("Invalid input: allowedDirs must be a non-empty array.");
      }

      const groupedIssues = groupIssuesByFile(issues);
      const filesToFix = Object.keys(groupedIssues);
      let totalChangesSummary = "";
      let successCount = 0;
      let failureCount = 0;
      const modifiedFiles: { filePath: string, fixedContent: string }[] = [];

      for (const filePath of filesToFix) {
        const issuesInFile = groupedIssues[filePath];
        if (!issuesInFile || issuesInFile.length === 0) continue;

        logger.info({ filePath, issueCount: issuesInFile.length }, `Processing fixes for ${filePath}`);

        try {
          if (!isValidFilePath(filePath, allowedDirs)) {
            throw new Error(`Security risk: Attempted to access a disallowed path: ${filePath}.`);
          }
          
          const absolutePath = path.resolve(process.cwd(), filePath);
          const fileContent = await fs.readFile(absolutePath, 'utf-8');

          const issuesToFixDescriptions = issuesInFile.map(
            (issue) => `L${issue.id}: ${issue.description.replace(/["\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ')} - Suggestion: ${issue.suggestion?.replace(/["\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ')}`
          );
          
          let fixResult;
          try {
            fixResult = await fixCodeIssues({
              filePath: filePath,
              fileContent,
              issuesToFix: issuesToFixDescriptions,
            });
          } catch (fixError: any) {
             throw new Error(`AI code fixing failed for ${filePath}. Reason: ${fixError.message}`);
          }


          if (!fixResult || typeof fixResult.fixedContent !== 'string') {
            throw new Error(`The code fixing AI failed to return valid content for ${filePath}. Response was: ${JSON.stringify(fixResult)}`);
          }

          // Instead of writing, add to the results array
          modifiedFiles.push({ filePath: filePath, fixedContent: fixResult.fixedContent });

          logger.info({ filePath }, `Successfully generated fixes for ${filePath}`);
          totalChangesSummary += `File: ${filePath}\n- ${fixResult.summaryOfChanges}\n`;
          successCount++;

        } catch (error: any) {
          failureCount++;
          const errorMessage = `Failed to fix issues in file: ${filePath}. Reason: ${error.message}`;
          logger.error({ error, filePath, stack: error.stack }, errorMessage);
          totalChangesSummary += `File: ${filePath}\n- FAILED: ${error.message}\n`;
        }
      }

      const finalSummary = `Fix operation complete. ${successCount} file(s) processed for changes, ${failureCount} failed.\n\n${totalChangesSummary}`;
      return {
        success: failureCount === 0,
        summary: finalSummary,
        modifiedFiles: modifiedFiles,
      };

    } catch (error) {
      logger.error({ error, stack: (error as Error).stack }, `Critical error in fixSelectedIssuesFlow`);
       return {
        success: false,
        summary: `A critical error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modifiedFiles: [],
      };
    }
  }
);
