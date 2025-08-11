import { Request, Response } from 'express';
import { generateSupportReply, generateRAGAnswer } from '../llm';
import { z } from 'zod';

// Request schemas
const SupportReplyRequest = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'fr']),
  message: z.string().min(1),
});

const RAGAnswerRequest = z.object({
  locale: z.enum(['en', 'fr']),
  question: z.string().min(1),
});

// Support reply handler
export async function supportReplyHandler(req: Request, res: Response) {
  try {
    const { email, locale, message } = SupportReplyRequest.parse(req.body);
    
    const { reply, extractor } = await generateSupportReply(email, locale, message);
    
    res.json({
      success: true,
      data: {
        reply,
        extractor,
        metadata: {
          locale,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      });
    }
    
    console.error('Support reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate support reply',
    });
  }
}

// RAG answer handler
export async function ragAnswerHandler(req: Request, res: Response) {
  try {
    const { locale, question } = RAGAnswerRequest.parse(req.body);
    
    const answer = await generateRAGAnswer(locale, question);
    
    res.json({
      success: true,
      data: {
        answer,
        metadata: {
          locale,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      });
    }
    
    console.error('RAG answer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate RAG answer',
    });
  }
}
