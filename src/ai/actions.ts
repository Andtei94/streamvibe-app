
'use server';

import { generateRecommendations as generateRecommendationsFlow } from './flows/generate-recommendations-flow';
import { analyzeFile as analyzeFileFlow } from './flows/focused-analysis-flow';
import { fixCodeIssues as fixCodeIssuesFlow } from './flows/fix-code-issues-flow';
import { synchronizeSubtitles as synchronizeSubtitlesFlow } from './flows/synchronize-subtitles-flow';
import { generateTrivia as generateTriviaFlow } from './flows/generate-trivia-flow';
import { translateSubtitles as translateSubtitlesFlow } from './flows/translate-subtitles-flow';
import { setAdminClaim as setAdminClaimFlow } from './flows/set-admin-claim-flow';
import { reprocessVideo as reprocessVideoFlow } from './flows/reprocess-video-flow';
import { checkAdminSdkStatus as checkAdminSdkStatusFlow } from './flows/check-admin-sdk-status-flow';
import { updateContentImage } from './flows/update-content-image-flow';
import { scanProjectForIssuesFlow } from './flows/static-analysis-flow';
import { fixAllIssuesInFileFlow } from './flows/fix-all-issues-in-file-flow';
import { triggerTranscoding as triggerTranscodingFlow } from './flows/trigger-transcoding-flow';
import { attachSubtitle as attachSubtitleFlow } from './flows/attach-subtitle-flow';
import { addContentFromTitle as addContentFromTitleFlow } from './flows/add-content-from-title-flow';
import { processExternalUrl as processExternalUrlFlow } from './flows/process-external-url-flow';
import { batchImportFromTitles as batchImportFromTitlesFlow } from './flows/batch-import-flow';
import { analyzeLibrary as analyzeLibraryFlow } from './flows/analyze-library-flow';
import { countLinesOfCode as countLinesOfCodeFlow } from './flows/count-lines-of-code-flow';
import { generateChannelMetadata as generateChannelMetadataFlow } from './flows/generate-channel-metadata-flow';
import { generateShowFromPrompt as generateShowFromPromptFlow } from './flows/generate-show-from-prompt-flow';
import { generateVideoFromPrompt as generateVideoFromPromptFlow } from './flows/generate-video-from-prompt-flow';
import { fixSelectedIssues as fixSelectedIssuesFlow } from './flows/fix-selected-issues-flow';
import { getProjectFiles as getProjectFilesFlow } from './flows/get-project-files-flow';
import { fetchUrlContent as fetchUrlContentFlow } from './flows/fetch-url-content-flow';
import { generateVideoClip as generateVideoClipFlow } from './flows/generate-video-clip-flow';

import type { 
    GenerateRecommendationsInput, GenerateRecommendationsOutput, 
    AnalyzeFileInput, AnalyzeFileOutput, 
    FixCodeIssuesInput, FixCodeIssuesOutput, 
    SynchronizeSubtitlesInput, SynchronizeSubtitlesOutput, 
    GenerateTriviaInput, GenerateTriviaOutput, 
    UpdateContentImageInput, UpdateContentImageOutput, 
    ReprocessVideoInput, ReprocessVideoOutput,
    StaticAnalysisReport,
    FixAllIssuesInFileInput, FixAllIssuesInFileOutput,
    TriggerTranscodingInput, TriggerTranscodingOutput,
    AttachSubtitleInput, AttachSubtitleOutput,
    AddContentFromTitleInput, AddContentFromTitleOutput,
    ProcessExternalUrlInput, ProcessExternalUrlOutput,
    BatchImportInput, BatchImportOutput,
    AnalyzeLibraryOutput,
    CountLinesOfCodeOutput,
    GenerateChannelMetadataInput, GenerateChannelMetadataOutput,
    TranslateSubtitlesInput, TranslateSubtitlesOutput,
    GenerateShowFromPromptInput, GenerateShowFromPromptOutput,
    GenerateVideoFromPromptInput, GenerateVideoFromPromptOutput,
    SetAdminClaimInput,
    SetAdminClaimOutput,
    CheckAdminSdkStatusOutput,
    FixSelectedIssuesInput,
    FixSelectedIssuesOutput,
    GetProjectFilesOutput,
    FetchUrlContentInput,
    FetchUrlContentOutput,
    GenerateVideoClipOutput
} from './schemas';

export async function generateRecommendations(input: GenerateRecommendationsInput): Promise<GenerateRecommendationsOutput> {
  return generateRecommendationsFlow(input);
}

export async function analyzeFile(input: AnalyzeFileInput): Promise<AnalyzeFileOutput> {
  return analyzeFileFlow(input);
}

export async function fixCodeIssues(input: FixCodeIssuesInput): Promise<FixCodeIssuesOutput> {
  return fixCodeIssuesFlow(input);
}

export async function synchronizeSubtitles(input: SynchronizeSubtitlesInput): Promise<SynchronizeSubtitlesOutput> {
  return synchronizeSubtitlesFlow(input);
}

export async function generateTrivia(input: GenerateTriviaInput): Promise<GenerateTriviaOutput> {
  return generateTriviaFlow(input);
}

export async function translateSubtitles(input: TranslateSubtitlesInput): Promise<TranslateSubtitlesOutput> {
  return translateSubtitlesFlow(input);
}

export async function setAdminClaim(input: SetAdminClaimInput): Promise<SetAdminClaimOutput> {
  return setAdminClaimFlow(input);
}

export async function reprocessVideo(input: ReprocessVideoInput): Promise<ReprocessVideoOutput> {
  return reprocessVideoFlow(input);
}

export async function checkAdminSdkStatus(): Promise<CheckAdminSdkStatusOutput> {
  return checkAdminSdkStatusFlow();
}

export async function updateContentImageFlow(input: UpdateContentImageInput): Promise<UpdateContentImageOutput> {
    return updateContentImage(input);
}

export async function runStaticAnalysis(): Promise<StaticAnalysisReport> {
  return scanProjectForIssuesFlow();
}

export async function triggerTranscoding(input: TriggerTranscodingInput): Promise<TriggerTranscodingOutput> {
  return triggerTranscodingFlow(input);
}

export async function attachSubtitle(input: AttachSubtitleInput): Promise<AttachSubtitleOutput> {
  return attachSubtitleFlow(input);
}

export async function addContentFromTitle(input: AddContentFromTitleInput): Promise<AddContentFromTitleOutput> {
  return addContentFromTitleFlow(input);
}

export async function processExternalUrl(input: ProcessExternalUrlInput): Promise<ProcessExternalUrlOutput> {
  return processExternalUrlFlow(input);
}

export async function batchImportFromTitles(input: BatchImportInput): Promise<BatchImportOutput> {
  return batchImportFromTitlesFlow(input);
}

export async function analyzeLibrary(): Promise<AnalyzeLibraryOutput> {
  return analyzeLibraryFlow();
}

export async function countLinesOfCode(): Promise<CountLinesOfCodeOutput> {
  return countLinesOfCodeFlow();
}

export async function generateChannelMetadata(input: GenerateChannelMetadataInput): Promise<GenerateChannelMetadataOutput> {
  return generateChannelMetadataFlow(input);
}

export async function generateShowFromPrompt(input: GenerateShowFromPromptInput): Promise<GenerateShowFromPromptOutput> {
  return generateShowFromPromptFlow(input);
}

export async function generateVideoFromPrompt(input: GenerateVideoFromPromptInput): Promise<GenerateVideoFromPromptOutput> {
  return generateVideoFromPromptFlow(input);
}

export async function fixAllIssues(input: FixAllIssuesInFileInput): Promise<FixAllIssuesInFileOutput> {
  return fixAllIssuesInFileFlow(input);
}

export async function fixSelectedIssues(input: FixSelectedIssuesInput): Promise<FixSelectedIssuesOutput> {
    return fixSelectedIssuesFlow(input);
}

export async function getProjectFiles(): Promise<GetProjectFilesOutput> {
    return getProjectFilesFlow();
}

export async function fetchUrlContent(input: FetchUrlContentInput): Promise<FetchUrlContentOutput> {
    return fetchUrlContentFlow(input);
}

export async function generateVideoClip(input: GenerateVideoFromPromptInput): Promise<GenerateVideoClipOutput> {
    return generateVideoClipFlow(input);
}
