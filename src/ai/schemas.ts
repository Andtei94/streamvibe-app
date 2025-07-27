
/**
 * @fileOverview Shared Zod schemas for AI flows and UI forms.
 * This file provides a single source of truth for data structures,
 * ensuring consistency between the AI backend and the React frontend.
 */
import { z } from 'zod';
import { LIVE_TV_CATEGORIES } from '@/lib/constants';

// Helper for date validation
const dateCheck = (val: unknown): val is string => {
    if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(val)) return false;
    try {
      const date = new Date(val);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
};

// --- Core Content Schemas ---

export const GenerateContentMetadataOutputSchema = z.object({
  title: z.string().describe('A creative and fitting title for the content. Should be based on the source but more polished.'),
  description: z.string().describe('A short, compelling description for the content, suitable for a summary card. Should be around 1-2 sentences.'),
  longDescription: z.string().describe('A longer, more detailed description for the content page. Should be a full paragraph.'),
  type: z.enum(['movie', 'tv-show', 'music', 'sports']).describe("The type of content. Infer if it is a movie, TV show, music video, or sports clip. Default to 'movie' if unsure."),
  genres: z.array(z.string().min(1, 'Genre cannot be an empty string.')).describe('An array of 2-4 relevant genres (e.g., Sci-Fi, Adventure, Indie Pop, Formula 1).'),
  actors: z.array(z.string()).describe('A plausible list of the main actors.'),
  directors: z.array(z.string()).describe('A plausible list of directors.'),
  releaseDate: z.string().refine(dateCheck, {
    message: "Release date must be a valid date in YYYY-MM-DD format.",
  }),
  rating: z.string().min(1, 'Rating is required.').describe('A plausible MPAA-style rating (e.g., PG-13, TV-MA).'),
  duration: z.string().min(1, 'Duration is required.').describe('A plausible duration (e.g., 2h 15m).'),
  quality: z.string().optional().default('1080p').describe("Plausible video quality, e.g., '4K', '1080p'."),
  collection: z.string().optional().default('').describe("The collection or franchise name, e.g., 'Marvel Cinematic Universe'."),
  trailerUrl: z.string().url().or(z.literal('')).optional().describe('A plausible YouTube/Vimeo trailer URL.'),
  aiHint: z.string().max(40).describe('One or two keywords for generating a placeholder image (e.g., "fantasy landscape").'),
  audioCodecs: z.array(z.string()).optional().default([]).describe("Plausible audio codecs, e.g., ['Dolby Atmos', 'DTS:X']."),
  featured: z.boolean().optional().default(false).describe('Set to true if this is a major blockbuster release.'),
  keywords: z.array(z.string().min(1, 'Keywords cannot be empty.')).describe("A comprehensive array of lowercased keywords for search."),
  introStart: z.number().optional().describe('The start time of the intro in seconds (for TV shows).'),
  introEnd: z.number().optional().describe('The end time of the intro in seconds (for TV shows).'),
});
export type GenerateContentMetadataOutput = z.infer<typeof GenerateContentMetadataOutputSchema>;

export const GenerateContentMetadataInputSchema = z.object({
  title: z.string().describe('The source title of the content, usually from a filename.'),
});
export type GenerateContentMetadataInput = z.infer<typeof GenerateContentMetadataInputSchema>;


// --- Library Analysis Schemas ---
export const ContentItemSchema = z.object({
  id: z.string(),
  type: z.enum(['movie', 'tv-show', 'music', 'sports']),
  genres: z.array(z.string()).optional().default([]),
  releaseDate: z.string().refine(dateCheck, {
    message: "Release date must be a valid date string in YYYY-MM-DD format.",
  }),
});

const GenreStatSchema = z.object({ genre: z.string(), count: z.number() });
const DecadeStatSchema = z.object({ decade: z.string().describe("Decade, e.g., '1980s' "), count: z.number() });

export const AnalyzeLibraryOutputSchema = z.object({
  totalMovies: z.number(),
  totalTvShows: z.number(),
  totalMusic: z.number(),
  totalSports: z.number(),
  totalItems: z.number(),
  topGenres: z.array(GenreStatSchema).describe('List of genres and their counts, sorted.'),
  itemsPerDecade: z.array(DecadeStatSchema).describe('List of decades and item counts.'),
  aiSummary: z.string().describe("A 1-2 paragraph qualitative summary of the library's profile."),
});
export type AnalyzeLibraryOutput = z.infer<typeof AnalyzeLibraryOutputSchema>;

// --- Subtitle Schemas ---
export const AttachSubtitleInputSchema = z.object({
  contentId: z.string(),
  subtitleContent: z.string(),
  fileName: z.string().optional(),
});
export type AttachSubtitleInput = z.infer<typeof AttachSubtitleInputSchema>;

export const AttachSubtitleOutputSchema = z.object({
  success: z.boolean(),
  newSubtitleUrl: z.string().url(),
});
export type AttachSubtitleOutput = z.infer<typeof AttachSubtitleOutputSchema>;

export const SynchronizeSubtitlesInputSchema = z.object({
  subtitleContent: z.string(),
  subtitleFormat: z.enum(['srt', 'vtt']),
});
export type SynchronizeSubtitlesInput = z.infer<typeof SynchronizeSubtitlesInputSchema>;

export const SynchronizeSubtitlesOutputSchema = z.object({
  synchronizedSrtContent: z.string(),
});
export type SynchronizeSubtitlesOutput = z.infer<typeof SynchronizeSubtitlesOutputSchema>;

export const TranslateSubtitlesInputSchema = z.object({
  subtitleContent: z.string(),
  targetLanguage: z.string(),
});
export type TranslateSubtitlesInput = z.infer<typeof TranslateSubtitlesInputSchema>;

export const TranslateSubtitlesOutputSchema = z.object({
  success: z.boolean(),
  translatedSrtContent: z.string().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});
export type TranslateSubtitlesOutput = z.infer<typeof TranslateSubtitlesOutputSchema>;

export const FetchUrlContentInputSchema = z.object({
  url: z.string().url(),
});
export type FetchUrlContentInput = z.infer<typeof FetchUrlContentInputSchema>;

export const FetchUrlContentOutputSchema = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  error: z.string().optional(),
});
export type FetchUrlContentOutput = z.infer<typeof FetchUrlContentOutputSchema>;


// --- Content Creation & Import Schemas ---
export const AddContentFromTitleInputSchema = z.object({
  title: z.string().min(1).max(255),
  image_prompt_style: z.string().optional(),
});
export type AddContentFromTitleInput = z.infer<typeof AddContentFromTitleInputSchema>;

export const AddContentFromTitleOutputSchema = z.object({
  success: z.boolean(),
  contentId: z.string().optional(),
  error: z.string().optional(),
  finalTitle: z.string().optional(),
});
export type AddContentFromTitleOutput = z.infer<typeof AddContentFromTitleOutputSchema>;

export const BatchImportInputSchema = z.object({
  titles: z.array(z.string().min(1)),
});
export type BatchImportInput = z.infer<typeof BatchImportInputSchema>;

export const BatchImportOutputSchema = z.object({
  addedCount: z.number(),
  skippedCount: z.number(),
  failedItems: z.array(z.object({ title: z.string(), error: z.string() })),
  addedTitles: z.array(z.string()),
});
export type BatchImportOutput = z.infer<typeof BatchImportOutputSchema>;

export const ReprocessVideoInputSchema = z.object({
  storagePath: z.string().optional(),
  fileName: z.string(),
  videoUrl: z.string().url().optional(),
  isPlayable: z.boolean().default(true),
  isDownloadable: z.boolean().default(false),
});
export type ReprocessVideoInput = z.infer<typeof ReprocessVideoInputSchema>;

export const ReprocessVideoOutputSchema = z.object({
  success: z.boolean(),
  contentId: z.string(),
  title: z.string(),
});
export type ReprocessVideoOutput = z.infer<typeof ReprocessVideoOutputSchema>;

// --- Live TV Schemas ---
export const ProgramSchema = z.object({
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  title: z.string(),
  description: z.string(),
});

export const GenerateChannelMetadataInputSchema = z.object({
  channelName: z.string().min(2, "Channel name must be at least 2 characters.").max(50, "Channel name cannot exceed 50 characters."),
  currentDate: z.date().optional(),
  epgLengthHours: z.number().min(1).max(72).default(24),
  logoStyle: z.string().optional(),
});
export type GenerateChannelMetadataInput = z.infer<typeof GenerateChannelMetadataInputSchema>;

export const GenerateChannelMetadataOutputSchema = z.object({
  category: z.string().describe(`Plausible category. Choose from: ${LIVE_TV_CATEGORIES.join(', ')}.`),
  logoUrl: z.string().url().or(z.literal('')),
  epg: z.array(ProgramSchema),
});
export type GenerateChannelMetadataOutput = z.infer<typeof GenerateChannelMetadataOutputSchema>;


// --- Image & Recommendation Schemas ---
export const GenerateImageInputSchema = z.object({
  prompt: z.string(),
  fileName: z.string().optional(),
  actors: z.array(z.string()).optional(),
  releaseDate: z.string().optional(),
  model: z.string().optional(),
  logoStyle: z.string().optional(),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

export const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().url(),
  error: z.string().optional(),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export const UpdateContentImageInputSchema = z.object({
  contentId: z.string(),
  prompt: z.string(),
});
export type UpdateContentImageInput = z.infer<typeof UpdateContentImageInputSchema>;

export const UpdateContentImageOutputSchema = z.object({
  success: z.boolean(),
  imageUrl: z.string().url(),
});
export type UpdateContentImageOutput = z.infer<typeof UpdateContentImageOutputSchema>;

export const GenerateRecommendationsInputSchema = z.object({
  userId: z.string(),
});
export type GenerateRecommendationsInput = z.infer<typeof GenerateRecommendationsInputSchema>;

const RecommendedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['movie', 'tv-show', 'music', 'sports']),
  genres: z.array(z.string()).optional(),
  description: z.string().optional(),
  releaseDate: z.string(),
  rating: z.string().optional(),
  imageUrl: z.string(),
});

export const GenerateRecommendationsOutputSchema = z.object({
  recommendations: z.array(RecommendedItemSchema),
});
export type GenerateRecommendationsOutput = z.infer<typeof GenerateRecommendationsOutputSchema>;


// --- AI Studio & Trivia Schemas ---
export const GenerateShowFromPromptInputSchema = z.object({
  prompt: z.string(),
});
export type GenerateShowFromPromptInput = z.infer<typeof GenerateShowFromPromptInputSchema>;

export const GenerateShowFromPromptOutputSchema = z.object({
  success: z.boolean(),
  contentId: z.string(),
});
export type GenerateShowFromPromptOutput = z.infer<typeof GenerateShowFromPromptOutputSchema>;

export const GenerateVideoFromPromptInputSchema = z.object({
  prompt: z.string(),
});
export type GenerateVideoFromPromptInput = z.infer<typeof GenerateVideoFromPromptInputSchema>;

export const GenerateVideoFromPromptOutputSchema = z.object({
  success: z.boolean(),
  contentId: z.string(),
});
export type GenerateVideoFromPromptOutput = z.infer<typeof GenerateVideoFromPromptOutputSchema>;

export const GenerateVideoClipOutputSchema = z.object({
    success: z.boolean(),
    contentId: z.string(),
});
export type GenerateVideoClipOutput = z.infer<typeof GenerateVideoClipOutputSchema>;

export const GenerateTriviaInputSchema = z.object({
  title: z.string(),
  context: z.string().optional(),
});
export type GenerateTriviaInput = z.infer<typeof GenerateTriviaInputSchema>;

export const GenerateTriviaOutputSchema = z.object({
  trivia: z.array(z.string()).min(1, 'Must provide at least 1 trivia fact.').max(10, 'Must provide at most 10 trivia facts.'),
});
export type GenerateTriviaOutput = z.infer<typeof GenerateTriviaOutputSchema>;

// --- Code Analysis Schemas ---
export const FileSchema = z.object({
  path: z.string(),
  content: z.string(),
});
export type ProjectFile = z.infer<typeof FileSchema>;

export const GetProjectFilesOutputSchema = z.object({
  files: z.array(FileSchema),
});
export type GetProjectFilesOutput = z.infer<typeof GetProjectFilesOutputSchema>;


export const AnalyzeFileInputSchema = z.object({
  filePath: z.string().min(1),
  fileContent: z.string().min(1).max(100000, 'File content must not exceed 100000 characters and must be valid code'),
});
export type AnalyzeFileInput = z.infer<typeof AnalyzeFileInputSchema>;

export const IssueSchema = z.object({
  lineNumber: z.number(),
  description: z.string(),
  suggestion: z.string(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
});
export type Issue = z.infer<typeof IssueSchema>;

export const AnalyzeFileOutputSchema = z.object({
  overallSummary: z.string(),
  issues: z.array(IssueSchema),
});
export type AnalyzeFileOutput = z.infer<typeof AnalyzeFileOutputSchema>;

export const FixCodeIssuesInputSchema = z.object({
  filePath: z.string(),
  fileContent: z.string(),
  issuesToFix: z.array(z.string()),
});
export type FixCodeIssuesInput = z.infer<typeof FixCodeIssuesInputSchema>;

export const FixCodeIssuesOutputSchema = z.object({
  fixedContent: z.string(),
  summaryOfChanges: z.string(),
});
export type FixCodeIssuesOutput = z.infer<typeof FixCodeIssuesOutputSchema>;

export const FixAllIssuesInFileInputSchema = z.object({
  filePath: z.string(),
  fileContent: z.string(),
});
export type FixAllIssuesInFileInput = z.infer<typeof FixAllIssuesInFileInputSchema>;

export const FixAllIssuesInFileOutputSchema = z.object({
  fixedContent: z.string(),
  summaryOfChanges: z.string(),
});
export type FixAllIssuesInFileOutput = z.infer<typeof FixAllIssuesInFileOutputSchema>;

export const AnalysisResultSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  description: z.string(),
  suggestion: z.string().optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export type AnalysisCategory = 'codeIntegrity' | 'errorAnalysis' | 'performance' | 'security' | 'uiUx' | 'other';
const AnalysisCategorySchema = z.array(AnalysisResultSchema).optional();

export const StaticAnalysisReportSchema = z.object({
  codeIntegrity: AnalysisCategorySchema,
  errorAnalysis: AnalysisCategorySchema,
  performance: AnalysisCategorySchema,
  security: AnalysisCategorySchema,
  uiUx: AnalysisCategorySchema,
  other: AnalysisCategorySchema,
});
export type StaticAnalysisReport = z.infer<typeof StaticAnalysisReportSchema>;

export const FixSelectedIssuesInputSchema = z.object({
  issues: z.array(AnalysisResultSchema),
  allowedDirs: z.array(z.string()).min(1, 'At least one allowed directory is required.'),
});
export type FixSelectedIssuesInput = z.infer<typeof FixSelectedIssuesInputSchema>;

export const FixSelectedIssuesOutputSchema = z.object({
    success: z.boolean(),
    summary: z.string(),
    modifiedFiles: z.array(z.object({
        filePath: z.string(),
        fixedContent: z.string(),
    })).describe('A list of files with their new, fixed content.'),
});
export type FixSelectedIssuesOutput = z.infer<typeof FixSelectedIssuesOutputSchema>;

export const CountLinesOfCodeOutputSchema = z.object({
  totalLines: z.number(),
  fileCount: z.number(),
});
export type CountLinesOfCodeOutput = z.infer<typeof CountLinesOfCodeOutputSchema>;


// --- Miscellaneous Schemas ---
export const ProcessExternalUrlInputSchema = z.object({
  mediaUrl: z.string().url(),
});
export type ProcessExternalUrlInput = z.infer<typeof ProcessExternalUrlInputSchema>;

export const ProcessExternalUrlOutputSchema = z.object({
  storagePath: z.string(),
  contentType: z.string(),
  fileName: z.string(),
});
export type ProcessExternalUrlOutput = z.infer<typeof ProcessExternalUrlOutputSchema>;

export const TriggerTranscodingInputSchema = z.object({
  storagePath: z.string(),
  contentType: z.string(),
  languageCode: z.string(),
});
export type TriggerTranscodingInput = z.infer<typeof TriggerTranscodingInputSchema>;

export const TriggerTranscodingOutputSchema = z.object({
  jobId: z.string(),
  subtitleContent: z.string(),
});
export type TriggerTranscodingOutput = z.infer<typeof TriggerTranscodingOutputSchema>;

// --- Admin Claim Schemas ---
export const SetAdminClaimInputSchema = z.object({
  uid: z.string().describe('The UID of the user to modify.'),
});
export type SetAdminClaimInput = z.infer<typeof SetAdminClaimInputSchema>;

export const SetAdminClaimOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});
export type SetAdminClaimOutput = z.infer<typeof SetAdminClaimOutputSchema>;

export const CheckAdminSdkStatusOutputSchema = z.object({
  isConfigured: z.boolean(),
});
export type CheckAdminSdkStatusOutput = z.infer<typeof CheckAdminSdkStatusOutputSchema>;
