# PromptProof Demo - Support & RAG Assistant

A demonstration application showcasing PromptProof's capabilities to catch common LLM failure modes.

[![CI](https://img.shields.io/github/actions/workflow/status/geminimir/promptproof-demo-project/promptproof.yml?branch=main)](https://github.com/geminimir/promptproof-demo-project/actions)
[![Action](https://img.shields.io/badge/Marketplace-promptproof--action-blue?logo=github)](https://github.com/marketplace/actions/promptproof-eval)

## Features

- **Support Reply Endpoint**: Generates support responses with required disclaimers and PII protection
- **RAG Answer Endpoint**: Provides document-based Q&A with proper citations
- **Tool Calling**: Calendar event scheduling with argument validation
- **Multi-language Support**: English and French locales

## Setup

1. Install dependencies (includes PromptProof SDK and CLI):
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Add your OpenAI API key
```

3. Run the development server:
```bash
npm run dev
```

## PromptProof Integration

This demo showcases the complete PromptProof workflow using the official npm packages and GitHub Action:

### **SDK Integration** ✅
- **`promptproof-sdk-node@beta`**: Automatically records LLM interactions as fixtures
- **One-line integration**: `withPromptProofOpenAI()` wrapper
- **Automatic recording**: All LLM calls recorded to `fixtures/support-replies/outputs.jsonl`

### **CLI Integration** ✅
- **`promptproof-cli@beta`**: Validates fixtures against contracts
- **NPM scripts**: `npm run test:promptproof` for easy validation
- **Multiple formats**: Console, HTML, JSON reports
- **New**: `--regress`, `--seed`, `--runs` flags; `snapshot` command for baselines

### **GitHub Action** ✅
Add `.github/workflows/promptproof.yml`:
```yaml
name: PromptProof (demo)
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: geminimir/promptproof-action@v0
        with:
          config: promptproof.yaml
          format: html
          mode: warn
      - name: Create snapshot on success
        if: github.ref == 'refs/heads/main' && success()
        run: |
          npx promptproof snapshot promptproof.yaml --promote
```

### **Environment Variables**
```bash
PP_RECORD=1              # Enable recording (default: 1 in dev, 0 in prod)
PP_SUITE=support-replies # Fixture suite name
PP_SAMPLE_RATE=1.0       # Record 100% of calls
```

### **Complete Workflow**
1. **SDK records** LLM interactions automatically
2. **CLI validates** fixtures against contracts in `promptproof.yaml`
3. **CI/CD integration** via GitHub Actions
4. **Violation detection** prevents regressions

## Endpoints

### POST /support/reply
Generates a support response with PII protection and required disclaimers.

```bash
curl -X POST localhost:3000/support/reply \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","locale":"en","message":"How do I get a refund?"}'
```

### POST /rag/answer
Provides document-based answers with proper citations.

```bash
curl -X POST localhost:3000/rag/answer \
  -H 'Content-Type: application/json' \
  -d '{"locale":"en","question":"What is your refund policy?"}'
```

## Testing with PromptProof

Run contract validation:
```bash
# Using npm script
npm run test:promptproof

# Or directly with CLI
npx promptproof eval -c promptproof.yaml

# Generate HTML report
npm run test:promptproof:html

# Compare against baseline (if snapshot exists)
npx promptproof eval -c promptproof.yaml --regress

# Create a baseline snapshot after green runs
npx promptproof snapshot promptproof.yaml --promote
```

## Demo Value

This demo proves PromptProof's effectiveness by showcasing:

### **Real-World Failure Modes**
1. **PII Leakage**: Email/phone numbers in responses
2. **Schema Drift**: Invalid JSON structure from extractors
3. **Missing Disclaimers**: Required legal text omitted
4. **Bogus Citations**: Fake or missing source URLs
5. **Tool Argument Errors**: Invalid calendar event parameters
6. **Cost/Latency Budgets**: Excessive token usage or response time
7. **Multilingual Regressions**: Inconsistent behavior across locales

### **Red → Green Demonstrations**
- **Red**: Fixtures with intentional failures → CLI detects violations
- **Green**: Fix prompts → CLI passes → Production safety proven

### **Production-Ready Integration**
- **Zero network calls in CI**: Tests run on recorded fixtures
- **Deterministic**: Same input = same output, no flaky tests
- **Privacy-safe**: Built-in PII redaction
- **Cost-effective**: No API costs during validation
