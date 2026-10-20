---
title: "A local RAG with LanceDB, BM25 and RRF"
date: 2026-08-02
summary: "Vector search finds meaning, keyword search finds exact names. Fuse them with RRF and your LLM stops guessing about your project."
tags: [AI, RAG, LanceDB, Search]
---

An LLM that does not know your project will invent one. Long context windows help, but stuffing the whole repo into a prompt is slow, expensive and noisy. A small **local retrieval layer** fixes that: ask a question, get back the handful of snippets that matter.

## Why one retriever is not enough

- **Vector embeddings** are great at *meaning*: "how do we handle retries?" finds the retry docs even if they never say "retries".
- **BM25** (lexical search) is great at *exact tokens*: function names, error codes, config keys. Embeddings routinely fumble these.

Developers ask both kinds of questions, often in the same sentence.

## The pipeline

1. **Chunk** docs and code into meaningful pieces (headings, functions) with a little surrounding context.
2. **Embed** each chunk and store vectors in an embedded database such as [LanceDB](https://lancedb.com) — no server, just files on disk.
3. **Index** the same chunks for BM25.
4. **Query both** and fuse the rankings.

## Reciprocal Rank Fusion in five lines

RRF ignores raw scores (which are not comparable between systems) and only uses *rank*:

```ts
function rrf(rankings: string[][], k = 60) {
  const score = new Map<string, number>();
  for (const list of rankings)
    list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1)));
  return [...score].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
```

A chunk that ranks well in *both* lists floats to the top; a chunk that only one system loves still has a chance. No tuning weights, surprisingly robust.

## Practical notes

- Keep it **local**: fast, private, and trivially reproducible in CI.
- Re-index incrementally on file change, not on every query.
- Return **sources with the snippets** so the model (and you) can cite and verify.
- Measure with a small set of real questions before tweaking anything.

The result is not clever; it is *reliable*, and that is exactly what you want feeding an assistant.
