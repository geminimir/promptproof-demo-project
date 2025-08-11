#!/bin/bash

# Test script for PromptProof demo endpoints

echo "🧪 Testing PromptProof Demo Endpoints"
echo "======================================"

# Base URL
BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test health endpoint
echo -e "\n${GREEN}Testing Health Check...${NC}"
curl -s "$BASE_URL/health" | jq .

# Test support reply - English
echo -e "\n${GREEN}Testing Support Reply (English)...${NC}"
curl -s -X POST "$BASE_URL/support/reply" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "locale": "en",
    "message": "How do I get a refund for my purchase?"
  }' | jq .

# Test support reply - French
echo -e "\n${GREEN}Testing Support Reply (French)...${NC}"
curl -s -X POST "$BASE_URL/support/reply" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "utilisateur@exemple.fr",
    "locale": "fr",
    "message": "Je veux un remboursement"
  }' | jq .

# Test RAG answer - English
echo -e "\n${GREEN}Testing RAG Answer (English)...${NC}"
curl -s -X POST "$BASE_URL/rag/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "en",
    "question": "What is your refund policy?"
  }' | jq .

# Test RAG answer - French medical refusal
echo -e "\n${GREEN}Testing RAG Answer (French - Medical Refusal)...${NC}"
curl -s -X POST "$BASE_URL/rag/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "fr",
    "question": "Puis-je obtenir des conseils médicaux?"
  }' | jq .

# Test tool call
echo -e "\n${GREEN}Testing Tool Call...${NC}"
curl -s -X POST "$BASE_URL/tool/call" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Schedule a meeting tomorrow at 2pm for 1 hour"
  }' | jq .

echo -e "\n${GREEN}All tests completed!${NC}"
