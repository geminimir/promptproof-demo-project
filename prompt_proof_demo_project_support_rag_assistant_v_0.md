# PromptProof — Demo Project: Support & RAG Assistant (v0.1)

> **Purpose:** A compact, realistic LLM application that reliably triggers the failure modes PromptProof is built to catch. You can run it locally, capture fixtures deterministically, and create **red→green** PRs on demand.

---

## 0) TL;DR

- Build a tiny service with **two endpoints**: `POST /support/reply` (support assistant) and `POST /rag/answer` (doc Q&A with citations).
- It uses an LLM (via SDK wrapper) for:
  1. **Support Reply**: free‑text answer + required disclaimer; must avoid PII leaks.
  2. **Extractor** (support sidecar): strict JSON with `status`, `items`, and `confidence`.
  3. **RAG Answer**: must include a **Sources:** section with at least one URL; multilingual (EN/FR) tone & refusals.
  4. **Tool call** demo: schedules a calendar event (start\<end) to show arg validation.
- We record **fixtures** for typical inputs/outputs and **replay** them in CI with `promptproof.yaml` contracts.

**Impactful failures we will demo:** PII leakage, schema drift, missing disclaimers, bogus citations, tool-arg errors, cost/latency budget breaches, multilingual regressions.

---

## 1) Repo Layout (demo app)

```
promptproof-demo/
├─ README.md
├─ package.json
├─ src/
│  ├─ server.ts              # Express (or FastAPI if Python variant)
│  ├─ llm.ts                 # SDK wrapper integration
│  ├─ prompts/
│  │  ├─ support-reply.md
│  │  ├─ extractor.md
│  │  └─ rag-answer.md
│  ├─ tools/
│  │  └─ calendar.ts         # mock tool with simple arg constraints
│  └─ data/
│     ├─ faq.md
│     ├─ refund-policy.md
│     └─ warranty.md
├─ fixtures/
│  ├─ support-replies/outputs.jsonl
│  ├─ rag-answers/outputs.jsonl
│  └─ tool-calls/outputs.jsonl
├─ promptproof.yaml          # contracts for this demo
└─ .github/workflows/promptproof.yml
```

> **Python option:** mirror `src/` in Python (FastAPI + Typer CLI) and reuse the same fixtures.

---

## 2) Endpoints & Behaviors

### 2.1 `POST /support/reply`

**Input:** `{ email, locale, message }` **LLM tasks:**

- Generate a polite reply **including** a standard, exact disclaimer line.
- Avoid including any third‑party contact details (email/phone).
- Emit a sidecar **extractor** JSON with fields: `{ status: "success"|"error", items: [], confidence: 0..1 }`.

**What can go wrong (by design):**

- PII leak (mentions an email/phone).
- Disclaimer missing/altered.
- Extractor schema/type drift (e.g., `"succes"`, `confidence: 1.2`).

### 2.2 `POST /rag/answer`

**Input:** `{ locale, question }` **LLM tasks:**

- Retrieve from small docs in `src/data/*.md` (mocked RAG).
- Answer with a **Sources:** section containing at least one `http(s)://` URL from retrieved docs.
- Enforce tone/refusal policy depending on topic.

**What can go wrong:**

- No `Sources:` section or fabricated URLs.
- Incorrect refusal behavior (e.g., medical/legal advice).
- Multilingual disclaimer regression (English passes, French fails).

### 2.3 Tool Call (calendar)

- LLM suggests a meeting slot and calls `calendar.create({start, end, title})`.
- We record the tool call into the fixture and validate `start < end`, ISO 8601, and `title` length.

---

## 3) Prompts (sketches)

``

```
You are a support agent. Reply in the user's locale. Never include personal contact information.
Always end with this exact line: "We cannot share personal contact information."
```

``

```
Extract a JSON object with fields: status ("success"|"error"), items (array), confidence (0..1).
Return only JSON, no extra text.
```

``

```
Answer using ONLY the provided documents. At the end, include:
"Sources:" followed by one or more bullet-point URLs, exactly as in the docs.
If asked for medical/legal advice, refuse politely.
```

---

## 4) Recording Strategy (dev/staging)

- Use our **SDK wrapper** (`withPromptProof`) to capture inputs/outputs + metrics.
- In dev/staging: `PP_RECORD=1`, `PP_SUITE=<suite>`, `PP_SAMPLE_RATE=1.0`.
- In prod (optional): sample at 10% and avoid logging user raw context; rely on promote-from-logs for safe cases.
- Streaming is buffered; tools captured as final arg objects.

---

## 5) Contracts (`promptproof.yaml`)

```yaml
schema_version: pp.v1
selectors:
  text: output.text
  json: output.json
  tools: output.tool_calls
  locale: locale

suites:
  - name: support-replies
    fixtures: fixtures/support-replies/outputs.jsonl
    checks:
      - id: schema
        type: json_schema
        target: json
        schema:
          type: object
          required: [status, items, confidence]
          properties:
            status: { type: string, enum: [success, error] }
            items: { type: array }
            confidence: { type: number, minimum: 0, maximum: 1 }
      - id: no_pii
        type: regex_forbidden
        target: text
        patterns:
          - "[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}"
          - "\b\+?\d[\d\s().-]{7,}\b"
      - id: disclaimer_en
        type: regex_required
        target: text
        when: { locale: "en" }
        patterns: ["We cannot share personal contact information\."]
      - id: disclaimer_fr
        type: regex_required
        target: text
        when: { locale: "fr" }
        patterns: ["Nous ne pouvons pas partager des coordonnées personnelles\."]

  - name: rag-answers
    fixtures: fixtures/rag-answers/outputs.jsonl
    checks:
      - id: has_sources_block
        type: regex_required
        target: text
        patterns: ["^Sources:\n- https?://"]
        flags: "mi"
      - id: forbid_fake_urls
        type: regex_forbidden
        target: text
        patterns: ["example\\.com/(fake|placeholder)"]
      - id: refusal_medical
        type: regex_required
        target: text
        when: { labels: ["medical"] }
        patterns: ["I am not able to provide medical advice|Je ne peux pas fournir de conseils médicaux"]

  - name: tool-calls
    fixtures: fixtures/tool-calls/outputs.jsonl
    checks:
      - id: calendar_bounds
        type: custom_fn
        target: tools
        module: ./checks/tool_bounds.js

budgets:
  cost_usd_per_run_max: 0.30
  latency_ms_p95_max: 1800
mode: warn
```

---

## 6) Sample Fixtures (copy‑paste)

**A) Support reply with PII leak (should FAIL)**

```json
{"schema_version":"pp.v1","id":"sup-0001","timestamp":"2025-08-09T22:13:45Z","source":"dev","locale":"en","input":{"prompt":"…","params":{"model":"gpt-4o"}},"output":{"text":"Sure, you can email them at jane.doe@example.com. We cannot share personal contact information."},"metrics":{"latency_ms":1200,"prompt_tokens":220,"completion_tokens":90,"cost_usd":0.012},"labels":["support"],"redaction":{"status":"sanitized"}}
```

**B) Extractor schema drift (should FAIL)**

```json
{"schema_version":"pp.v1","id":"sup-0002","timestamp":"2025-08-09T22:14:00Z","source":"dev","locale":"en","input":{"prompt":"…","params":{"model":"gpt-4o"}},"output":{"json":{"status":"succes","items":[],"confidence":1.2}},"metrics":{"latency_ms":640,"prompt_tokens":80,"completion_tokens":55,"cost_usd":0.004},"labels":["json-shape"],"redaction":{"status":"sanitized"}}
```

**C) RAG answer missing sources (should FAIL)**

```json
{"schema_version":"pp.v1","id":"rag-0001","timestamp":"2025-08-09T22:16:45Z","source":"dev","locale":"en","input":{"prompt":"…","params":{"model":"gpt-4o"}},"output":{"text":"Here is the answer.\n\n(But no sources provided)"},"metrics":{"latency_ms":1500,"prompt_tokens":300,"completion_tokens":120,"cost_usd":0.02},"labels":["rag"],"redaction":{"status":"sanitized"}}
```

**D) French refusal (should PASS)**

```json
{"schema_version":"pp.v1","id":"rag-0002","timestamp":"2025-08-09T22:18:20Z","source":"dev","locale":"fr","input":{"prompt":"…","params":{"model":"gpt-4o"}},"output":{"text":"Je ne peux pas fournir de conseils médicaux.\n\nSources:\n- https://docs.example.org/refund-policy"},"metrics":{"latency_ms":1100,"prompt_tokens":210,"completion_tokens":80,"cost_usd":0.014},"labels":["rag","medical"],"redaction":{"status":"sanitized"}}
```

**E) Tool call with bad bounds (should FAIL)**

```json
{"schema_version":"pp.v1","id":"tool-0042","timestamp":"2025-08-09T22:15:00Z","source":"dev","locale":"en","input":{"prompt":"…","params":{"model":"gpt-4o"}},"output":{"tool_calls":[{"name":"calendar.create","arguments":{"start":"2025-10-10T10:00:00Z","end":"2025-10-10T09:00:00Z","title":"Sync"}}]},"metrics":{"latency_ms":980,"prompt_tokens":140,"completion_tokens":30,"cost_usd":0.006},"labels":["tool-args"],"redaction":{"status":"sanitized"}}
```

---

## 7) CI Wiring (demo repo)

``

```yaml
name: PromptProof (demo)
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: promptproof/action@v0
        with:
          config: promptproof.yaml
```

---

## 8) Red→Green Recipes (repeatable demos)

### Demo 1 — **PII leak**

1. Open PR adding fixture **A** (email present).
2. CI goes **red** on `no_pii`.
3. Fix: edit prompt to strongly forbid contact details and sanitize the reply template.
4. Re‑run → **green**.

### Demo 2 — **Schema drift**

1. Add fixture **B** with `status: "succes"` + `confidence: 1.2`.
2. Red on `schema`.
3. Fix extractor prompt to enforce enum and bounds (or add `zod`‑style example).
4. Green.

### Demo 3 — **RAG citations**

1. Add fixture **C** (missing `Sources:`).
2. Red on `has_sources_block`.
3. Fix rag prompt to always output sources; update retrieval glue to pass URLs explicitly.
4. Green.

### Demo 4 — **Tool arg bounds**

1. Add fixture **E** (end\<start).
2. Red on `calendar_bounds`.
3. Fix tool selection or post‑processor to validate and correct.
4. Green.

> Record a 5–7s clip of one demo for the landing page hero.

---

## 9) Local Dev Commands

```bash
# Start demo API (Node)
npm i && npm run dev

# Send sample requests (writes fixtures when PP_RECORD=1)
curl -X POST localhost:3000/support/reply -H 'content-type: application/json' \
  -d '{"email":"user@acme.co","locale":"en","message":"How do I get a refund?"}'

curl -X POST localhost:3000/rag/answer -H 'content-type: application/json' \
  -d '{"locale":"fr","question":"Puis-je obtenir un remboursement?"}'

# Run contracts locally
npx promptproof eval -c promptproof.yaml --out report
```

---

## 10) Goals, Risks, and What “Good” Looks Like

**Goals:**

- Deterministic failures we can toggle from red→green with minimal diffs.
- Clear, human‑readable PR annotations and a small HTML report artifact.
- Cross‑locale coverage (EN+FR) with at least one refusal case.

**Risks:**

- Over‑synthetic fixtures → weak signal. **Mitigation:** seed from real logs ASAP via `promote`.
- Regex brittleness for citations/disclaimers. **Mitigation:** use anchored patterns; keep exact strings.
- JSONL corruption from concurrent writes. **Mitigation:** atomic append.

**Good:**

- 10–30 fixtures per suite, mix of pass/fail.
- Re‑running `eval` produces identical results (no flakes).
- At least one **pre‑merge block** per week during demo period.

---

## 11) Stretch Demos (v0.2)

- **Cost/latency budgets**: add fixtures with high token counts/latency to trip budget gates.
- **Model swap A/B**: run the same fixtures with two `model` values and surface deltas.
- **Golden baseline**: choose one support reply with a fixed template; enforce `semantic_sim >= 0.92` (warn‑mode).

---

## 12) Appendix — Tool Bounds Check

`checks/tool_bounds.js`

```js
module.exports = async function toolBounds(tools) {
  const violations = []
  for (const call of tools || []) {
    if (call.name === 'calendar.create') {
      const { start, end, title } = call.arguments || {}
      if (!start || !end) violations.push({ id: 'calendar_bounds', message: 'start and end required' })
      if (new Date(start) >= new Date(end)) violations.push({ id: 'calendar_bounds', message: 'start must be < end' })
      if (typeof title !== 'string' || title.length < 3) violations.push({ id: 'calendar_bounds', message: 'title too short' })
    }
  }
  return violations
}
```

---

**Ship this demo alongside PromptProof.** It’s realistic enough to surface the problems we care about, yet small enough to run in a fresh repo with no secrets or external dependencies.

