
'use server';
/**
 * @fileOverview An orchestrator AI flow that first analyzes a file for all issues,
 * then invokes another flow to fix all of them and writes the changes to disk.
 *
 * - fixAllIssuesInFileFlow - A function that orchestrates the analysis and fixing process.
 */

import { ai } from '@/ai/init';
import { z } from 'zod';
import { analyzeFile } from './focused-analysis-flow';
import { fixCodeIssues } from './fix-code-issues-flow';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  FixAllIssuesInFileInputSchema,
  type FixAllIssuesInFileInput,
  FixAllIssuesInFileOutputSchema,
  type FixAllIssuesInFileOutput,
  IssueSchema
} from '../schemas';
import { logger } from '@/lib/logger';

export const fixAllIssuesInFileFlow = ai.defineFlow(
  {
    name: 'fixAllIssuesInFileFlow',
    inputSchema: FixAllIssuesInFileInputSchema,
    outputSchema: FixAllIssuesInFileOutputSchema,
  },
  async (input: FixAllIssuesInFileInput): Promise<FixAllIssuesInFileOutput> => {
    try {
      // Step 0: Centralized and strict input validation for the initial request.
      const parsedInput = FixAllIssuesInFileInputSchema.parse(input);

      // Step 1: Analyze the file to get a list of all issues.
      logger.info({ filePath: parsedInput.filePath }, `Starting analysis for ${parsedInput.filePath}`);
      const analysisReport = await analyzeFile({ filePath: parsedInput.filePath, fileContent: parsedInput.fileContent });

      // Step 2: Rigorous validation of the analysis report from the AI.
      const issuesSchema = z.array(IssueSchema);
      const issuesResult = issuesSchema.safeParse(analysisReport?.issues);

      if (!issuesResult.success) {
        logger.error({ filePath: parsedInput.filePath, error: issuesResult.error }, "Invalid format for analysisReport.issues");
        throw new Error(`AI returned an invalid issue format for ${parsedInput.filePath}`);
      }
      const issues = issuesResult.data;

      if (issues.length === 0) {
        logger.info({ filePath: parsedInput.filePath }, 'No issues found. File is clean.');
        return {
          fixedContent: parsedInput.fileContent,
          summaryOfChanges: `No issues found in file: ${parsedInput.filePath}. No changes were made.`,
        };
      }
      logger.info({ filePath: parsedInput.filePath, issueCount: issues.length }, `Found ${issues.length} issues. Proceeding to fix.`);

      // Step 3: Create a structured, clean list of issue descriptions for the fixing AI.
      const issuesToFix = issues.map(
        (issue) => `L${issue.lineNumber}: ${issue.description.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ')} - Suggestion: ${issue.suggestion.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ')}`
      );

      // Step 4: Call the code-fixing flow with all identified issues.
      const fixResult = await fixCodeIssues({
        filePath: parsedInput.filePath,
        fileContent: parsedInput.fileContent,
        issuesToFix,
      });
      
      if (!fixResult || typeof fixResult.fixedContent !== 'string') {
          throw new Error('The code fixing AI failed to return valid content.');
      }

      // Step 5: Securely write the fixed content to the file system.
      const rootDir = process.cwd();
      const absolutePath = path.resolve(rootDir, parsedInput.filePath);
      
      // Security Check: Ensure the resolved path is within the project directory.
      if (!absolutePath.startsWith(rootDir)) {
          throw new Error(`Invalid file path: Path traversal detected in ${parsedInput.filePath}`);
      }
      
      try {
        await fs.writeFile(absolutePath, fixResult.fixedContent, 'utf-8');
        logger.info({ filePath: parsedInput.filePath }, `Successfully wrote fixes to ${parsedInput.filePath}`);
      } catch (writeError: any) {
        logger.error({ filePath: parsedInput.filePath, error: writeError }, `Failed to write to file ${parsedInput.filePath}`);
        throw new Error(`Failed to write fixed content to ${parsedInput.filePath}: ${writeError.message}`, { cause: writeError });
      }

      // Step 6: Return the successful result from the fixing flow.
      return fixResult;

    } catch (error) {
      logger.error({ error, stack: (error as Error).stack, filePath: input.filePath }, `Error in fixAllIssuesInFileFlow for ${input.filePath}`);
      throw error;
    }
});
