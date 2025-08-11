import OpenAI from 'openai';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { withPromptProofOpenAI } from 'promptproof-sdk-node/openai';

// Load environment variables
dotenv.config();

// Initialize OpenAI client with PromptProof wrapper
const openai = withPromptProofOpenAI(new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}), {
  suite: process.env.PP_SUITE || 'support-replies',
  source: process.env.NODE_ENV || 'development',
  sampleRate: parseFloat(process.env.PP_SAMPLE_RATE || '1.0'),
  outputDir: 'fixtures',
});

// Schema for extractor output
export const ExtractorSchema = z.object({
  status: z.enum(['success', 'error']),
  items: z.array(z.any()),
  confidence: z.number().min(0).max(1),
});

export type ExtractorOutput = z.infer<typeof ExtractorSchema>;

// Tool definitions
export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'calendar.create',
      description: 'Create a calendar event',
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description: 'ISO 8601 datetime for event start',
          },
          end: {
            type: 'string',
            description: 'ISO 8601 datetime for event end',
          },
          title: {
            type: 'string',
            description: 'Event title',
          },
        },
        required: ['start', 'end', 'title'],
      },
    },
  },
];

// SDK handles fixture recording automatically

// Generate support reply
export async function generateSupportReply(
  email: string,
  locale: string,
  message: string
): Promise<{ reply: string; extractor: ExtractorOutput }> {
  const promptPath = path.join(process.cwd(), 'src', 'prompts', 'support-reply.md');
  const supportPrompt = await fs.readFile(promptPath, 'utf-8');
  
  const startTime = Date.now();
  
  // Generate main reply
  const replyResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: supportPrompt.replace('{{locale}}', locale) },
      { role: 'user', content: `Email: ${email}\nMessage: ${message}` },
    ],
    temperature: 0.7,
  });
  
  const reply = replyResponse.choices[0].message.content || '';
  
  // Generate extractor JSON
  const extractorPromptPath = path.join(process.cwd(), 'src', 'prompts', 'extractor.md');
  const extractorPrompt = await fs.readFile(extractorPromptPath, 'utf-8');
  
  const extractorResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: extractorPrompt },
      { role: 'user', content: message },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });
  
  const extractorRaw = extractorResponse.choices[0].message.content || '{}';
  let extractor: ExtractorOutput;
  
  try {
    extractor = ExtractorSchema.parse(JSON.parse(extractorRaw));
  } catch (e) {
    // Intentionally allow schema violations for demo purposes
    extractor = JSON.parse(extractorRaw) as any;
  }
  
  const latencyMs = Date.now() - startTime;
  
  // SDK automatically records fixtures
  
  return { reply, extractor };
}

// Generate RAG answer
export async function generateRAGAnswer(
  locale: string,
  question: string
): Promise<string> {
  // Load documents
  const docsDir = path.join(process.cwd(), 'src', 'data');
  const faq = await fs.readFile(path.join(docsDir, 'faq.md'), 'utf-8');
  const refundPolicy = await fs.readFile(path.join(docsDir, 'refund-policy.md'), 'utf-8');
  const warranty = await fs.readFile(path.join(docsDir, 'warranty.md'), 'utf-8');
  
  const documents = `
## FAQ
${faq}

## Refund Policy
${refundPolicy}

## Warranty
${warranty}
  `.trim();
  
  const promptPath = path.join(process.cwd(), 'src', 'prompts', 'rag-answer.md');
  const ragPrompt = await fs.readFile(promptPath, 'utf-8');
  
  const startTime = Date.now();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: ragPrompt.replace('{{locale}}', locale).replace('{{documents}}', documents) 
      },
      { role: 'user', content: question },
    ],
    temperature: 0.3,
  });
  
  const answer = response.choices[0].message.content || '';
  const latencyMs = Date.now() - startTime;
  
  // SDK automatically records fixtures
  
  return answer;
}

// Generate tool call
export async function generateToolCall(
  message: string
): Promise<any> {
  const startTime = Date.now();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: 'You are a helpful assistant that can schedule calendar events.' 
      },
      { role: 'user', content: message },
    ],
    tools,
    tool_choice: 'auto',
    temperature: 0.5,
  });
  
  const toolCalls = response.choices[0].message.tool_calls || [];
  const latencyMs = Date.now() - startTime;
  
  // SDK automatically records fixtures
  
  return toolCalls;
}

// Calculate cost based on token usage
function calculateCost(usage: any): number {
  if (!usage) return 0;
  // GPT-4o pricing (approximate)
  const promptCost = (usage.prompt_tokens || 0) * 0.00001;
  const completionCost = (usage.completion_tokens || 0) * 0.00003;
  return Math.round((promptCost + completionCost) * 1000000) / 1000000;
}
