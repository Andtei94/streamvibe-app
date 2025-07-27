
'use server';/**
 * @fileOverview An AI flow to perform a static analysis of the entire project codebase
 * by iterating through each file individually.
 *
 * - scanProjectForIssuesFlow - A function that orchestrates the analysis process.
 */import { ai } from '@/ai/init';
import { z } from 'zod';
import { analyzeFile } from './focused-analysis-flow';
import { StaticAnalysisReportSchema, type StaticAnalysisReport, type AnalysisResult, type AnalysisCategory, AnalyzeFileOutputSchema, IssueSchema } from '../schemas';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { getProjectFiles } from './utils/file-reader';
import { performance } from 'perf_hooks';

const issueCategorizationMap: { keywords: string[]; category: AnalysisCategory }[] = [
    { keywords: ['security', 'vulnerability', 'xss', 'injection', 'cwe-'], category: 'security' },
    { keywords: ['performance', 'bottleneck', 'optimize', 'efficient', 're-render', 'slow'], category: 'performance' },
    { keywords: ['ui', 'ux', 'user experience', 'accessibility', 'layout', 'styling', 'aria-'], category: 'uiUx' },
    { keywords: ['error', 'null', 'unhandled', 'crash', 'exception'], category: 'errorAnalysis' },
    { keywords: ['bug', 'logic error', 'race condition', 'typo'], category: 'codeIntegrity' }
];

const categorizeIssue = (issue: { description: string; severity: string }): AnalysisCategory => {
    const desc = issue.description.toLowerCase();
    for (const mapping of issueCategorizationMap) {
        if (mapping.keywords.some(kw => desc.includes(kw))) {
            return mapping.category;
        }
    }
    if (issue.severity.toLowerCase() === 'critical' || issue.severity.toLowerCase() === 'high') {
        return 'codeIntegrity';
    }
    return 'other';
};

class CustomStaticAnalysisError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'CustomStaticAnalysisError';
  }
}

const staticAnalysisFlow = ai.defineFlow(
  {
    name: 'staticAnalysisFlow',
    inputSchema: z.void(),
    outputSchema: StaticAnalysisReportSchema,
  },
  async () => {
    const startTime = performance.now();
    logger.info('Starting full project static analysis...');
    let filesToAnalyze: { path: string; content: string }[];
    try {
      filesToAnalyze = await getProjectFiles();
      if (!Array.isArray(filesToAnalyze) || filesToAnalyze.length === 0) {
        logger.warn('Static analysis found no files to analyze.');
        return { codeIntegrity: [], errorAnalysis: [], performance: [], security: [], uiUx: [], other: [] };
      }
    } catch (error: any) {
      logger.error({ error, stack: error.stack }, 'Failed to read project files for analysis.');
      throw new CustomStaticAnalysisError(`Failed to read project files: ${error.message}`, error);
    }

    const fileReadingTime = performance.now();
    logger.info({ timeTaken: fileReadingTime - startTime }, 'Project files read successfully.');

    const analysisPromises = filesToAnalyze.map(file => 
        analyzeFile({ filePath: file.path, fileContent: file.content }).catch(e => {
            logger.warn({ error: e, filePath: file.path }, `Skipping file due to analysis error.`);
            return { issues: [], overallSummary: `Error analyzing file: ${e.message}`, error: e.message, filePath: file.path };
        })
    );

    const results = await Promise.all(analysisPromises);
    const analysisTime = performance.now();
    logger.info({ timeTaken: analysisTime - fileReadingTime }, 'Analysis of all files completed.');
    
    const report: StaticAnalysisReport = {
      codeIntegrity: [], errorAnalysis: [], performance: [], security: [], uiUx: [], other: [],
    };

    results.forEach((result, index) => {
        const filePath = filesToAnalyze[index].path;
        const validation = AnalyzeFileOutputSchema.safeParse(result);
        if (!validation.success || !validation.data.issues) {
            logger.warn({filePath, error: validation.error?.format(), rawResult: result}, 'Unexpected issue structure from analyzeFile. Skipping...');
            return;
        }

        validation.data.issues.forEach(issue => {
            const category = categorizeIssue(issue);
            const analysisResult: AnalysisResult = {
                id: uuidv4(),
                filePath: filePath,
                description: issue.description,
                suggestion: issue.suggestion,
                severity: issue.severity
            };
            report[category]?.push(analysisResult);
        });
    });

    const endTime = performance.now();
    logger.info({
        filesAnalyzed: filesToAnalyze.length,
        totalIssues: Object.values(report).reduce((sum, val) => sum + (val?.length || 0), 0),
        timeTaken: endTime - startTime
    }, 'Static analysis completed.');

    return report;
  }
);

export { staticAnalysisFlow as scanProjectForIssuesFlow };
