# Master Experience

> **How to fill this file:** Replace every section below with your own data.
> Use one `##` heading per role, project, or major achievement block.
> Each `##` section becomes a separate chunk in the vector store — so make every
> section **self-contained**: include your title, the company/project name, dates,
> the full tech stack, concrete metrics, and business impact all within that section.
> Add real URLs to projects so the AI can include clickable links in your resume.
> The Behavioral Interview Stories section provides structured story notes for
> common soft-skill questions — fill it in with your real experiences.

---

## Senior Software Engineer — Acme Corp (Jan 2022 – Present)

**Role context:** Led backend platform work for a B2B SaaS product serving 200+ enterprise clients.
**Tech stack:** TypeScript, Node.js, React, PostgreSQL, Redis, AWS (ECS Fargate, RDS, S3, CloudWatch), Docker, Kubernetes, Terraform, GitHub Actions

- Architected and led the migration of a 180k-line Rails monolith to a Node.js microservices mesh (12 services), reducing median API latency from 420 ms to 80 ms (81% improvement) and cutting deployment cycle time from 45 min to under 5 min via blue/green deployments on ECS.
- Designed a real-time event ingestion pipeline (Kafka + AWS Kinesis) processing **10 million events per day** with < 200 ms end-to-end latency and zero data loss over 18 months of production operation.
- Owned full rewrite of the customer-facing analytics dashboard (React + TypeScript + Recharts), improving Lighthouse performance score from 52 → 94, reducing Time-to-Interactive by 62%, and cutting bounce rate by 18%.
- Introduced infrastructure-as-code using Terraform for all new services; reduced environment drift incidents to zero and enabled reproducible staging environments for every PR.
- Interviewed, hired, and onboarded 6 engineers; authored the team's code review standards, PR templates, and pair-programming rotation that reduced junior engineer ramp-up time by ~30%.
- Collaborated with Product and Design on 3 major feature launches (SSO, audit logs, custom dashboards), each reaching > 50,000 active users within the first week of release.
- Established on-call runbook, SLA dashboards (CloudWatch + PagerDuty), and post-mortem process that reduced MTTR from 4 h to 45 min.

**Key achievements:** 81% latency reduction · 10 M events/day pipeline · 6 engineers hired and mentored

---

## Software Engineer — Beta Startup (Jun 2019 – Dec 2021)

**Role context:** Full-stack engineer #3 at a fintech startup (seed → Series A). Owned backend platform and data infrastructure.
**Tech stack:** Python 3.10, FastAPI, SQLAlchemy, React, TypeScript, Redis, PostgreSQL, GCP (Cloud Run, BigQuery, Pub/Sub, GCS), Terraform, Docker, pytest, Playwright

- Built the company's first internal data platform from scratch (FastAPI + BigQuery), consolidating 7 disparate data sources into a single queryable API consumed by 40+ analysts daily; query time dropped from ad-hoc scripts running 30+ min to < 2 s.
- Reduced cloud infrastructure costs by **$120,000/year** by migrating always-on compute VMs to Cloud Run serverless and introducing auto-scaling policies with right-sized CPU/memory limits.
- Designed and deployed an ML-based fraud detection microservice (scikit-learn gradient boosting + Redis feature cache) that raised fraud detection rate from 67% to 94%, saving an estimated $800k/year in chargebacks.
- Wrote end-to-end test suite (Playwright + pytest) covering 100% of critical user flows; reduced QA regression cycle from 2 days to 3 hours and caught 3 production regressions before release.
- Presented engineering demos and technical RFCs to C-suite quarterly; two RFCs (event-driven architecture, zero-downtime migrations) were adopted as company-wide engineering standards.
- Mentored 2 junior engineers through their first production deployments; both became independent contributors within 3 months.

**Key achievements:** $120k/year infra savings · 94% fraud detection · 40+ analyst users · 2 junior engineers mentored

---

## Open Source Maintainer — stream-bridge (2020 – Present)

**Project context:** TypeScript library providing a unified streaming interface over multiple message brokers.
**GitHub:** https://github.com/janedoe/stream-bridge
**npm:** https://npmjs.com/package/stream-bridge
**Tech stack:** TypeScript, Node.js, Kafka (kafkajs), RabbitMQ (amqplib), AWS SQS, Jest, GitHub Actions, semantic-release

- Designed plugin architecture with a provider interface allowing custom serializers, middlewares, and broker adapters — reduced integration time for a new broker from weeks to < 2 days.
- 1,200+ GitHub stars; adopted in production by 3 external companies; 80+ community issues and PRs reviewed and merged.
- Maintained semantic versioning, CHANGELOG, JSDoc API documentation, and CI/CD pipeline (GitHub Actions) with 95% test coverage enforced on all PRs.
- Published bi-weekly release notes and a public roadmap; grew contributor community from 0 to 14 regular contributors over 2 years.

**Key achievements:** 1,200+ stars · 3 production adopters · 14 contributors · 95% test coverage

---

## Personal Project — TextileCV (2024 – Present)

**Project context:** AI-powered career assistant that tailors resumes, cover letters, and interview prep to specific job descriptions using RAG.
**Live demo:** https://janedoe.dev/projects/textilecv
**GitHub:** https://github.com/janedoe/textilecv
**Tech stack:** TypeScript, Node.js, Express, React, Tailwind CSS, LangChain, OpenAI API, ChromaDB, LaTeX

- Built an end-to-end RAG pipeline (LangChain + ChromaDB) that retrieves the most relevant professional experience chunks for a given job description and generates fully tailored resumes in LaTeX.
- Implemented multi-query MMR (Maximal Marginal Relevance) retrieval strategy to prevent top-chunk dominance and ensure diverse, relevant context is surfaced.
- Integrated LaTeX compilation server to produce pixel-perfect PDF resumes from AI-generated LaTeX source.
- Designed a React + Tailwind frontend with real-time activity logging, PDF preview, and one-click download.

---

## Freelance Technical Consultant (Jan 2018 – May 2019)

**Context:** Contract work for 4 clients across e-commerce and logistics verticals.
**Portfolio:** https://janedoe.dev/freelance
**Tech stack:** Node.js, Python, React, PostgreSQL, AWS (Lambda, API Gateway, DynamoDB), Stripe API, Shopify API

- Built a custom Shopify order-management integration for a 3PL client processing 5,000+ orders/day, replacing manual CSV exports and saving ~20 h/week of operations work.
- Developed a serverless invoice automation system (AWS Lambda + Stripe) reducing billing disputes by 40% through automated reconciliation and PDF delivery.
- Delivered all 4 contracts on time and within budget; 3 clients returned for follow-on work.

---

## Education

**B.S. Computer Science — State University (May 2018)**
- GPA: 3.8 / 4.0
- Capstone: Distributed key-value store using Raft consensus algorithm (Go, 5-node cluster, 99.9% availability in testing)
- Teaching Assistant: Data Structures & Algorithms, 2 semesters; held weekly office hours for 60+ students
- Relevant coursework: Operating Systems, Distributed Systems, Machine Learning, Computer Networks, Database Systems

---

## Certifications

- **AWS Certified Solutions Architect – Associate** — Amazon Web Services (2023)
- **Google Professional Data Engineer** — Google Cloud (2022)
- **Certified Kubernetes Application Developer (CKAD)** — CNCF (2021)

---

## Technical Skills Summary

**Languages:** TypeScript, JavaScript (ES2022+), Python 3.10, Go, SQL, Bash
**Frontend:** React 18, Next.js 14, Tailwind CSS, Vite, Storybook, Recharts
**Backend:** Node.js, Express, FastAPI, REST, GraphQL, gRPC, WebSockets
**Databases:** PostgreSQL, MySQL, Redis, DynamoDB, BigQuery, ChromaDB (vector)
**Cloud & Infra:** AWS (ECS, Lambda, RDS, S3, Kinesis, CloudWatch), GCP (Cloud Run, BigQuery, Pub/Sub), Docker, Kubernetes, Terraform, GitHub Actions, CircleCI
**ML/AI:** scikit-learn, LangChain, OpenAI API, vector embeddings, RAG pipelines
**Testing:** Jest, pytest, Playwright, Vitest, Test-Driven Development
**Practices:** Microservices, event-driven architecture, DDD, Agile/Scrum, code review, on-call, post-mortems

---

## Behavioral Interview Stories

> These story notes help the AI generate authentic STAR answers for common behavioral interview themes.
> Each entry maps a theme to a real experience with context for Situation, what the challenge was,
> what you did, and what the result was. Be specific — dates, names, technologies, metrics.

---

### Conflict / Disagreement with a Teammate or Manager

**Context:** Acme Corp, 2022. During the microservices migration, the team's architect wanted to use a homegrown message-passing library to avoid external dependencies. I strongly believed this would create a maintenance trap that would slow down the team in 6+ months.

**What I did:** I didn't push back in a Slack thread. I asked for a 30-minute sync, prepared a written comparison (build vs. buy tradeoffs, maintenance cost estimates, community support metrics) and ran a 2-hour spike using Kafka to demonstrate the integration was simpler than expected. I presented the results without advocacy — just the data — and asked "what would change your mind?"

**Result:** The architect agreed to a 2-week trial with Kafka. After the trial, the team voted unanimously to adopt it. We saved an estimated 3–4 months of maintenance work over the following year. The architect later told me it was one of the most useful technical discussions he'd had at the company.

**Theme tags:** Disagreement, influencing without authority, technical decision-making, written communication

---

### Failure / Mistake and What You Learned

**Context:** Beta Startup, 2020. I deployed a database migration script during a low-traffic window without a rollback plan. The migration had a bug that caused a constraint violation on 0.3% of rows. The deployment blocked for 8 minutes during peak EU hours — longer than our SLA.

**What I did:** I detected the issue within 2 minutes via our CloudWatch alarm, immediately rolled back the application code (not the schema), and spent the next 4 hours writing and testing a safe forward migration with a dry-run mode. I owned the post-mortem, wrote a full incident report, and proposed a new rule: all migrations must include a tested rollback script and must be approved by two engineers.

**Result:** Zero recurrence of migration-related incidents in the following 18 months. The new migration checklist became the team standard. My CTO used this incident as a teaching example for the next engineering hire class — which I found both humbling and rewarding.

**Theme tags:** Failure, ownership, post-mortem, process improvement, leading through a crisis

---

### Leading Without Authority / Influencing Peers

**Context:** Acme Corp, 2023. Our codebase had no consistent error-handling pattern — some routes returned 500 with raw stack traces, others returned different JSON shapes. Customer support was spending 30% of their time parsing error messages to file bug reports.

**What I did:** I had no mandate to change this — it wasn't in my sprint. I drafted a one-page RFC proposing a standardized error envelope format, wrote a utility function, and migrated 3 routes as a proof of concept. I shared it in the engineering Slack with a loom walkthrough and asked for feedback, not permission. Within a week, 4 other engineers had adopted it voluntarily.

**Result:** Within a month, 80% of routes used the new pattern. Customer support ticket triage time fell by ~40%. The RFC was merged into our official style guide. This is now a pattern I replicate: solve the problem yourself first, make the solution shareable, then let others choose to adopt it.

**Theme tags:** Influencing without authority, documentation, RFC culture, process improvement

---

### Handling Ambiguity / Unclear Requirements

**Context:** Beta Startup, 2021. The CEO asked me to "make our fraud detection smarter" — no spec, no metrics, no timeline. The existing rule-based system had a 67% detection rate but nobody had documented what "smarter" meant or what the acceptable false-positive rate was.

**What I did:** Before writing a line of code, I scheduled a 1-hour requirements session with the CEO, CFO, and customer success lead. I came prepared with 3 options (improve rules, add ML, buy third-party) with rough cost/benefit estimates. I pushed to define success metrics: target detection rate, max acceptable false positive rate, and latency budget. Once we had consensus (target 90%+ detection, < 2% false positives, < 50 ms latency), I built toward those specs.

**Result:** Delivered an ML-based system achieving 94% detection and 1.4% false positives within 6 weeks. The explicit success criteria meant I could communicate progress weekly with confidence and the launch had no "is this good enough?" debate.

**Theme tags:** Ambiguity, requirements gathering, stakeholder alignment, ML, defining success metrics

---

### Working Under Pressure / Tight Deadline

**Context:** Acme Corp, 2023. A major enterprise client threatened to churn ($2.4M ARR) unless we shipped a custom audit log feature within 3 weeks — a feature that normally would have taken 8 weeks.

**What I did:** I broke the feature into a 3-tier delivery: (1) minimal viable audit log (events stored, accessible via API) in week 1, (2) UI in week 2, (3) export and retention controls in week 3. I negotiated with the client's team to demo tier 1 at the end of week 1 so they could validate direction early. I pulled in one contractor for the UI work and unblocked their tasks each morning before my own sprint work.

**Result:** Shipped all 3 tiers on schedule. The client renewed their contract and became a reference customer. Post-launch retrospective: the tiered delivery approach (MVP + iteration vs. big-bang) is now part of how we scope all complex features.

**Theme tags:** Deadline pressure, prioritization, client management, delegation, tiered delivery

---

### Mentoring / Growing Others

**Context:** Acme Corp, 2022. I onboarded a junior engineer (2 years of experience) who was technically solid but struggled with production confidence — he avoided touching the deployment pipeline and over-asked for approval before making any change.

**What I did:** I started pairing with him on my own deploy runs so he could see the process demystified. Then I created a low-stakes "practice deploy" exercise using our staging environment. After 3 weeks, I shadowed him doing his first production deploy. I gave him a small but real on-call rotation slot with me as backup, with an explicit agreement that I would never judge a question as "too basic."

**Result:** Within 6 weeks he was deploying independently and had started reviewing other people's PRs with confidence. By the end of the quarter he was mentoring an intern. He told me in a 1:1 that it was the first time in his career he felt trusted to make real decisions. That feedback meant more to me than any metric.

**Theme tags:** Mentoring, psychological safety, onboarding, technical confidence, delegation

---

### Cross-functional Collaboration / Working with Non-Engineers

**Context:** Beta Startup, 2020. The analytics team needed real-time dashboards but kept submitting ad-hoc SQL queries directly to the production database, causing periodic performance degradation that affected paying customers.

**What I did:** Instead of just saying "stop doing that," I scheduled time to understand what they actually needed. I discovered they had 6 recurring queries they ran every morning. I built a scheduled materialization job (BigQuery + Cloud Pub/Sub) that pre-computed those 6 reports nightly and exposed them through a simple REST API. I co-designed the API schema with an analyst — they owned the spec, I built to it.

**Result:** Zero direct production DB access from analytics within 2 weeks. The materialized views reduced their reporting latency from 8 minutes to 3 seconds. The analysts started proactively communicating new data needs through a lightweight spec process rather than routing around engineering. This is the pattern I use for any cross-functional friction: understand the real need, then build the simplest thing that makes the friction go away.

**Theme tags:** Cross-functional collaboration, stakeholder empathy, data engineering, process design
