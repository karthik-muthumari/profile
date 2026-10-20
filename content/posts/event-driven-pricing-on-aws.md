---
title: "Event-driven pricing on AWS"
date: 2026-05-14
summary: "Patterns I like for pipelines that must be correct, replayable and boring in production: small Lambdas, explicit state machines and queues with dead-letter safety nets."
tags: [AWS, Serverless, Architecture, Node.js]
---

Pricing data has two awkward properties: it arrives in bulk, and getting it wrong is expensive. That makes it a great fit for an **event-driven** design, where every step is small, observable and replayable.

## The shape of the pipeline

```text
upload (S3) -> validate (Lambda) -> orchestrate (Step Functions)
            -> fan out (SNS / SQS) -> persist (DynamoDB) -> notify
```

- **S3 events** kick things off when a file lands, so there is no polling.
- **Step Functions** own the workflow: retries, branching and timeouts are declared, not hand-coded.
- **SNS + SQS** fan work out to consumers that scale independently.
- **DynamoDB** stores the result with idempotent writes.

## Principles that paid off

1. **Idempotency everywhere.** Events get delivered twice. Design each handler so the second delivery is harmless.
2. **Dead-letter queues are a feature.** A poisoned message should park itself with full context, not block the line.
3. **Validate at the edge.** Reject a bad file early with a clear error rather than half-applying it.
4. **Make state visible.** A state machine diagram doubles as documentation, and the execution history is a free audit trail.
5. **Infrastructure as code.** CDK (or Terraform) so every environment is the same environment, reviewed like any other change.

## Operating it

Alarms on DLQ depth and Step Functions failures, structured logs with a correlation ID from the first event, and a runbook for replaying a failed execution. If the on-call person can replay safely at 3 a.m., the design worked.

This is deliberately a generic sketch — the real value is in the habits: small units, explicit workflows, and failure treated as a first-class path.
