import { Request, Response } from 'express';
import { generateToolCall } from '../llm';
import { z } from 'zod';

const ToolCallRequest = z.object({
  message: z.string().min(1),
});

export async function toolCallHandler(req: Request, res: Response) {
  try {
    const { message } = ToolCallRequest.parse(req.body);
    
    const toolCalls = await generateToolCall(message);
    
    // Validate tool calls
    const results = [];
    for (const call of toolCalls) {
      if (call.function.name === 'calendar.create') {
        const args = JSON.parse(call.function.arguments);
        const validation = validateCalendarArgs(args);
        
        results.push({
          tool: call.function.name,
          arguments: args,
          validation,
          executed: validation.valid,
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        toolCalls: results,
        metadata: {
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
    
    console.error('Tool call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute tool call',
    });
  }
}

function validateCalendarArgs(args: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!args.start || !args.end) {
    errors.push('start and end are required');
    return { valid: false, errors };
  }
  
  const start = new Date(args.start);
  const end = new Date(args.end);
  
  if (isNaN(start.getTime())) {
    errors.push('start must be a valid ISO 8601 datetime');
  }
  
  if (isNaN(end.getTime())) {
    errors.push('end must be a valid ISO 8601 datetime');
  }
  
  if (start >= end) {
    errors.push('start must be before end');
  }
  
  if (!args.title || typeof args.title !== 'string' || args.title.length < 3) {
    errors.push('title must be at least 3 characters');
  }
  
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
