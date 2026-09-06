# 008. Current Groq model and bounded tool runtime
Date: 2026-09-06
Status: accepted
## Context
The previously configured Groq Llama model now returns HTTP 404. Voice turns waited for that failure and then used repetitive local fallback replies. Dashboard tools were described to the model but never executed.
## Decision
Use `qwen/qwen3.8-27b`, verified against the production Groq account. Run at most one model-selected tool round and at most three calls per turn. Execute tools only through tenant-scoped server callbacks. Mutating tools require explicit caller confirmation.
## Alternatives
`openai/gpt-oss-20b` was available but did not return a final answer inside the voice token budget during verification. Deterministic keyword dispatch was rejected because it cannot safely collect or validate business fields.
## Consequences
Model availability must be tested with a real completion, not only the provider's model-list endpoint. Provider changes require updating the runtime default, environment, health metadata, and prompt/tool regression checks together.
