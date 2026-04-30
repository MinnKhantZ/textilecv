# Professional Experience

<!--
  INSTRUCTIONS: Replace this entire file with YOUR professional data.
  Structure it with Markdown headers — the AI splits on # / ## / ### to keep
  each project story intact as a single retrievable chunk.

  Include for each project:
    - What the project was and your role
    - The hardest technical challenge you faced
    - The specific actions you took (technologies, patterns, decisions)
    - Measurable outcomes (%, ms, $, users, time saved, etc.)
    - Your "Personal Why" — why this work mattered to you

  The richer and more specific you are, the better the AI performs.
-->

# Career Summary

Full-stack software engineer with 6 years of experience building high-traffic
distributed systems, developer tooling, and data pipelines. Passionate about
translating ambiguous product requirements into clean, maintainable
architecture. Strong communicator who thrives at the intersection of
engineering and cross-functional collaboration.

---

# Projects

## Project: Real-Time Analytics Dashboard

### Overview
Led a team of 4 engineers to redesign the company's core analytics dashboard,
moving from a batch-processing model to a real-time event-driven architecture
serving 80,000 daily active users.

### Technical Challenge
The existing nightly batch ETL pipeline introduced 18-hour data lag, making
the dashboard nearly useless for operational decisions. Migrating to streaming
without downtime while maintaining data consistency across 40+ metrics was
the core challenge.

### Actions Taken
- Designed an Apache Kafka event streaming layer to replace the batch ETL
- Built a stream processing service in Apache Flink (Java) to compute
  aggregate metrics with exactly-once semantics
- Implemented a dual-write strategy during migration to validate parity
  between old and new pipelines before full cutover
- Introduced Redis for sub-second metric caching, reducing database load by 70%

### Outcome
- Data freshness improved from 18 hours to under 30 seconds
- Dashboard p99 load time dropped from 4.2 s to 380 ms
- 0 incidents during the 6-week zero-downtime migration
- Enabled 3 new product features that were blocked on real-time data

---

## Project: Internal Developer Platform (IDP)

### Overview
Sole engineer who designed and shipped an internal developer platform to
standardize service scaffolding, CI/CD, and observability across 12
engineering teams.

### Technical Challenge
Each team had divergent deployment pipelines (some Jenkins, some CircleCI,
some manual). Onboarding a new service took ~3 days of copying config files.
I needed to abstract this without forcing teams to rewrite existing workflows.

### Actions Taken
- Built a CLI tool in Go that generated service skeletons from opinionated
  Cookiecutter templates (TypeScript/Python/Go)
- Abstracted CI/CD into a shared GitHub Actions reusable workflow library
- Integrated Datadog APM auto-instrumentation into every generated service
- Wrote comprehensive docs and ran 4 lunch-and-learn sessions for adoption

### Outcome
- New service onboarding time reduced from 3 days to 45 minutes
- Adopted by all 12 teams within 8 weeks with zero mandated rollout
- Reduced CI config drift-related incidents by 60%
- Selected as an internal "Engineering Excellence" award recipient

---

## Project: ML Feature Store

### Overview
Core contributor on a machine learning feature store built to serve
pre-computed features to 6 production ML models with low-latency SLAs.

### Technical Challenge
Feature computation was duplicated across 3 separate ML teams, causing
inconsistent training/serving skew and wasted compute. The hardest part
was designing a storage layer that could serve features at <10 ms p99
while also supporting point-in-time correct historical lookups for training.

### Actions Taken
- Designed a two-tier storage architecture: Redis for online serving,
  Parquet on S3 for offline training with a shared Feast schema registry
- Introduced a backfill pipeline using Apache Spark to hydrate historical
  feature values for new feature definitions
- Collaborated with data scientists to migrate 6 models over 12 weeks
  with no model performance regression

### Outcome
- Online feature serving p99 latency: 7 ms (SLA: 10 ms)
- Eliminated training/serving skew across all 6 models
- Estimated 30% reduction in GPU compute costs from de-duplicated pipelines
- Enabled data science team to iterate on new features 2× faster

---

## Project: API Gateway Overhaul

### Overview
Migrated a legacy monolithic API gateway (Node.js) to a microservices
architecture using AWS API Gateway + Lambda@Edge to improve reliability
and global performance.

### Technical Challenge
The legacy gateway had no circuit breakers, a single region deployment,
and no graceful degradation. A single downstream service outage would
cascade and take down the entire API. It was also coupled tightly to
business logic, making it impossible to independently deploy.

### Actions Taken
- Introduced resilience4j-style circuit breaker patterns via a shared
  middleware library in TypeScript
- Re-architected routing to Lambda@Edge (deployed to 12 CloudFront regions)
- Built a chaos engineering suite using AWS Fault Injection Simulator to
  validate failover behavior before every major release
- Led a 10-engineer sprint to migrate 35 endpoints with full backward
  compatibility using API versioning

### Outcome
- API availability improved from 99.5% to 99.97% (measured over 6 months)
- Global median latency reduced by 40% for non-US users
- Zero cascading failures from downstream outages in 18 months post-launch
- Served as the architectural blueprint adopted by 2 other teams

---

# Skills & Technologies

## Languages
TypeScript, JavaScript, Python, Go, Java, SQL

## Frameworks & Libraries
React, Node.js, Express, FastAPI, Apache Kafka, Apache Flink, Apache Spark

## Infrastructure & Cloud
AWS (Lambda, ECS, RDS, S3, CloudFront, SQS), Docker, Kubernetes, Terraform

## Data & AI
PostgreSQL, Redis, MongoDB, ChromaDB, LangChain, OpenAI APIs, Feast

## Practices
System design, distributed systems, TDD, CI/CD, SRE, technical mentoring

---

# Personal Why

I got into engineering because I was frustrated watching smart people waste
hours on problems that software could solve in seconds. Every project I take
on, I ask: "Will this matter to the person using it?" The analytics dashboard
project wasn't just about milliseconds — it meant a support engineer could
see a customer's issue in real-time instead of the next morning. That's what
drives me.
