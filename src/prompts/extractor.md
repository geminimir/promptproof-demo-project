Extract information from the user message and return a JSON object with the following structure:

{
  "status": "success" or "error",
  "items": [...],  // array of extracted items/entities
  "confidence": 0.0 to 1.0  // confidence score between 0 and 1
}

IMPORTANT:
- Return ONLY valid JSON, no additional text or explanation
- status must be exactly "success" or "error" (not "succes" or other variations)
- confidence must be a number between 0.0 and 1.0 inclusive
- items should be an array (can be empty)

Analyze the message for:
- Key topics or requests
- Sentiment and urgency
- Any mentioned products, services, or issues

Set status to "error" only if the message is completely unintelligible or empty.
Set confidence based on how clearly you can understand the user's intent.
