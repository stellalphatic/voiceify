# 005. Knowledge retrieval stays Postgres-first for v1
Date: 2026-07-16
Status: accepted

## Context
Judges and tenants need a Knowledge Base UI. Qdrant / pgvector are desirable, but the API already chunks docs into Postgres and injects ILIKE hits into the tenant voice turn.

## Decision
Ship the Knowledge Base dashboard against the existing Postgres knowledge routes. Keep vector search (pgvector or Qdrant) as a follow-up without blocking the FYP demo.

## Alternatives
- Add Qdrant now in docker-compose: higher ops cost, new dependency, no UI benefit until embeddings land.
- Fake RAG in the UI only: rejected (no silent stubs).

## Consequences
Retrieval uses hybrid keyword + local bag-of-hash embeddings stored on chunks. Qdrant / pgvector remain a follow-up for production-scale ANN search. PDF/DOCX uploads extract text, embed chunks, then discard the original file.
