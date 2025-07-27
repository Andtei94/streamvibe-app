
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Defensive initialization for the AI plugin
const key = process.env.GEMINI_API_KEY;
const plugins = [];
if (key) {
  plugins.push(googleAI({ apiKey: key }));
}

export const ai = genkit({
  plugins,
  enableTracingAndMetrics: false,
});
