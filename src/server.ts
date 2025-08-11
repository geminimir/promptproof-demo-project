import express from 'express';
import dotenv from 'dotenv';
import { supportReplyHandler, ragAnswerHandler } from './handlers';
import { toolCallHandler } from './handlers/toolCall';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'promptproof-demo' });
});

// Support reply endpoint
app.post('/support/reply', supportReplyHandler);

// RAG answer endpoint
app.post('/rag/answer', ragAnswerHandler);

// Tool call endpoint (for demo purposes)
app.post('/tool/call', toolCallHandler);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 PromptProof Demo Server running on http://localhost:${PORT}`);
  console.log(`📝 Recording mode: ${process.env.PP_RECORD === '1' ? 'ON' : 'OFF'}`);
});
