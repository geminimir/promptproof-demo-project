# PromptProof Demo - Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- OpenAI API key
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies

```bash
cd promptproof-demo-project
npm install
```

### 2. Configure Environment

Create a `.env` file with your OpenAI API key:

```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk-your-actual-api-key-here
PP_RECORD=1
PP_SUITE=support-replies
PP_SAMPLE_RATE=1.0
PORT=3000
NODE_ENV=development
EOF
```

### 3. Start the Server

```bash
npm run dev
```

The server will start on http://localhost:3000

## Testing the Endpoints

### Option 1: Use the Test Script

```bash
./scripts/test-endpoints.sh
```

### Option 2: Manual Testing

#### Test Support Reply
```bash
curl -X POST http://localhost:3000/support/reply \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "locale": "en",
    "message": "How do I get a refund?"
  }'
```

#### Test RAG Answer
```bash
curl -X POST http://localhost:3000/rag/answer \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "en",
    "question": "What is your refund policy?"
  }'
```

#### Test Tool Call
```bash
curl -X POST http://localhost:3000/tool/call \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Schedule a meeting tomorrow at 2pm for 1 hour"
  }'
```

## Running PromptProof Validation

To validate the fixtures against the contracts:

```bash
# Using npm script (recommended)
npm run test:promptproof

# Or directly with CLI
npx promptproof eval -c promptproof.yaml

# Generate HTML report
npm run test:promptproof:html
```

## Demonstrating Failure Modes

The fixtures include intentional failures to demonstrate PromptProof's capabilities:

### 1. PII Leak (sup-0001)
- Contains email address in response
- Should fail `no_pii` check

### 2. Schema Drift (sup-0002)
- Has `"succes"` instead of `"success"`
- Has `confidence: 1.2` (exceeds max of 1.0)
- Should fail `schema` check

### 3. Missing Disclaimer (sup-0005)
- Missing required disclaimer text
- Should fail `disclaimer_en` check

### 4. Missing Sources (rag-0001)
- No sources section provided
- Should fail `has_sources_block` check

### 5. Fake URL (rag-0006)
- Contains `example.com/fake-support-url`
- Should fail `forbid_fake_urls` check

### 6. Tool Argument Error (tool-0042)
- End time before start time
- Should fail `calendar_bounds` check

### 7. Title Too Short (tool-0044)
- Title "TM" is less than 3 characters
- Should fail `calendar_bounds` check

## CI/CD Integration

The project includes a GitHub Actions workflow that will:
1. Run on every pull request
2. Execute PromptProof validation
3. Comment results on the PR
4. Upload HTML report as artifact

## Troubleshooting

### OpenAI API Errors
- Verify your API key is correct in `.env`
- Check your OpenAI account has credits
- Ensure you're using a valid model (gpt-4o)

### Port Already in Use
- Change the PORT in `.env` to another value
- Or kill the process using port 3000

### Module Not Found
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript is installed globally or use `npx tsx`

## Next Steps

1. Experiment with different prompts to trigger various failure modes
2. Modify the prompts in `src/prompts/` to fix failures
3. Add new fixtures to test edge cases
4. Adjust the contracts in `promptproof.yaml` for your needs
5. Integrate with your CI/CD pipeline
