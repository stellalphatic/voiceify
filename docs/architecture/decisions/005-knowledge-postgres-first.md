# 005. Knowledge retrieval stays Postgres-first for v1
Date: 2026-07-16
Status: superseded in part by the semantic embedding and optional Qdrant implementation

## Context
Judges and tenants need a Knowledge Base UI. Qdrant / pgvector are desirable, but the API already chunks docs into Postgres and injects ILIKE hits into the tenant voice turn.

## Decision
Ship the Knowledge Base dashboard against the existing Postgres knowledge routes. Keep vector search (pgvector or Qdrant) as a follow-up without blocking the FYP demo.

## Alternatives
- Add Qdrant now in docker-compose: higher ops cost, new dependency, no UI benefit until embeddings land.
- Fake RAG in the UI only: rejected (no silent stubs).

## Consequences
Postgres remains the durable source of truth. Without an embedding provider,
retrieval is keyword-based. With an OpenAI-compatible or Gemini embedding
provider, vectors are stored with chunks for semantic-hybrid ranking and can
optionally be mirrored into tenant-scoped Qdrant collections. PDF/DOCX uploads
extract text and discard the original file after ingestion.
