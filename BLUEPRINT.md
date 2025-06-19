Executive Summary
LawMattersSGv8 is a complete rebuild of the AI-powered legal document management platform, designed for Singapore and beyond. It combines a modern React/PWA frontend, a Supabase-powered backend with robust RLS, seamless AI/LLM integrations, and a production-ready DevOps pipeline. Every layer—from responsive UI and accessibility to security, observability, and scalability—is covered to ensure a maintainable, high-quality codebase and infrastructure.

1. Frontend Architecture
Core Technology Stack

Framework: React 18 + TypeScript

Build Tool: Vite 5.x

Styling: Tailwind CSS + shadcn/ui

State Management: TanStack Query + Context API

Routing: React Router v6

Forms & Validation: React Hook Form + Zod

Testing: Vitest, React Testing Library, Playwright

Application Structure
src/
├── assets/             # Images, icons, fonts
├── components/
│   ├── ui/             # shadcn/ui primitives
│   ├── forms/          # form field components
│   ├── layout/         # Navbars, Footer, etc.
│   └── legal/          # Document viewers, annotations
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── lib/                # API clients, configs
├── pages/              # Route components
└── types/              # TS interfaces/types

Key Interfaces

Public Landing: Hero, features, testimonials

Pricing: Tier comparison, call-to-actions

Law Firm Directory: Search, filters, ratings

Auth Flows: Register/Login, 2FA, password reset

User Dashboard:

Document Manager: Upload, list, search, sort

AI Chat: Context-aware legal Q&A

Template Library: Browse, preview, customize

Profile Settings: Account, preferences

Document Processing UI

Drag-and-drop uploader with progress bar

Real-time status updates (OCR, embeddings, classification)

PDF viewer with annotations & highlights

Full-text search & filter

Legal Template System

Template browser with category filters

Dynamic customization forms

Live preview & generation

Download history & version control

2. Admin Dashboard
Role-Based Access Control

interface AdminRole {
  id: string;
  name: 'super_admin'|'admin'|'moderator'|'support';
  permissions: Permission[];
}
interface Permission {
  resource: string;
  actions: ('create'|'read'|'update'|'delete')[];
}

Core Features

User Management: Advanced search, bulk actions, impersonation

Content Management:

Law firm directory approval

Template review & publishing

Document moderation & QA

System Monitoring: Live metrics (health, error rates), alerting

Financial Oversight: Revenue, churn, usage by tier

Batch Operations:

interface BatchOperation {
  id: string;
  type: 'ocr'|'embedding'|'classification'|'deletion';
  status: 'pending'|'processing'|'completed'|'failed';
  documentIds: string[];
  progress: number;
  errorLog?: string[];
  createdBy: string;
  createdAt: Date;
}

Redis job queue, WebSocket progress updates, retry logic, off-peak scheduling

3. Backend Architecture
Technology Stack

Runtime: Supabase Edge Functions (Deno)

Database: PostgreSQL + pgvector

Auth: Supabase Auth + custom RLS

Storage: Supabase Storage + CDN

AI/ML: OpenAI GPT-4 + custom embeddings

API Endpoints

POST   /auth/(login|register|logout|refresh|forgot-password|reset-password)
GET    /documents
POST   /documents/upload
GET    /documents/:id
PUT    /documents/:id
DELETE /documents/:id
POST   /documents/batch-process
GET    /documents/search
POST   /ai/(chat|summarize|extract-entities|generate-template)
GET    /templates(/:id|/categories)
GET    /law-firms(/:id|/search)
GET    /admin/users
PUT    /admin/users/:id
GET    /admin/analytics
POST   /admin/bulk-operations

Edge Functions

process-document: OCR → embeddings → classification → metadata update

ai-chat: rate-limit check → context retrieval → GPT-4 call → usage log


4. Supabase Configuration
Database Schema (core tables)

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  subscription_tier subscription_tier DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- uploaded_documents
CREATE TABLE uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  document_type TEXT NOT NULL,
  processing_status inquiry_status DEFAULT 'pending',
  ocr_text TEXT,
  ocr_quality_score NUMERIC,
  document_structure JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- document_embeddings
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES uploaded_documents(id) NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- templates, law_firms, practice_areas, user_usage, ai_usage_logs…

RLS Policies

-- Profiles: self-view/update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own"  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Documents: self-access
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own docs"   ON uploaded_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Manage own docs" ON uploaded_documents FOR INSERT,UPDATE,DELETE USING (auth.uid() = user_id);

-- Embeddings: self-access via join
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own embeds" ON document_embeddings FOR SELECT USING (
  EXISTS (SELECT 1 FROM uploaded_documents ud WHERE ud.id = document_embeddings.document_id AND ud.user_id = auth.uid())
);


Storage Buckets & Policies

INSERT INTO storage.buckets (id,name,public) VALUES
  ('documents','documents',false),
  ('avatars','avatars',true),
  ('law-firm-media','law-firm-media',true);

-- Users can manage their own documents
CREATE POLICY "Docs upload check" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id='documents' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Docs select own" ON storage.objects FOR SELECT USING (
  bucket_id='documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars: public read, user‐owned upload
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "Avatars upload"      ON storage.objects FOR INSERT WITH CHECK (
  bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);


Database Functions
check_usage_limits: Enforce daily/monthly quotas by tier

search_similar_chunks: Vector similarity search with threshold and user filter

5. AI/LLM Integration
Document Analysis

async function analyzeDocument(text: string): Promise<DocumentAnalysis> {
  const prompt = `
    Analyze this legal document and provide:
    1. Executive summary
    2. Key entities
    3. Classification
    4. Legal implications
    5. Recommended actions
    Document: ${text}
  `;
  const resp = await openai.chat.completions.create({ model:'gpt-4-turbo', messages:[{role:'user',content:prompt}], temperature:0.1 });
  return parseAnalysis(resp.choices[0].message.content);
}


RAG Query

async function ragQuery(question:string, userId:string) {
  const qEmbed = await generateEmbedding(question);
  const { data:chunks } = await supabase.rpc('search_similar_chunks', { query_embedding:qEmbed, similarity_threshold:0.7, match_count:5, user_filter:userId });
  const context = chunks?.map(c=>c.chunk_text).join('\n\n')||'';
  const resp = await openai.chat.completions.create({
    model:'gpt-4-turbo',
    messages:[
      {role:'system',content:'You are a legal AI assistant…'},
      {role:'user',content:`Context: ${context}\n\nQuestion: ${question}`}
    ],
    temperature:0.2
  });
  return resp.choices[0].message.content;
}


Template Generation

async function generateTemplate(req:TemplateRequest) {
  const prompt = `
    Generate a ${req.type} template for Singapore:
    - Parties: ${JSON.stringify(req.parties)}
    - Terms: ${JSON.stringify(req.terms)}
    - Custom: ${req.customRequirements||'None'}
  `;
  const resp = await openai.chat.completions.create({ model:'gpt-4-turbo', messages:[{role:'user',content:prompt}], temperature:0.3 });
  return resp.choices[0].message.content;
}

Usage Tracking: Insert into ai_usage_logs and update user_usage via RPC.


6. DevOps & Deployment
Environments

Production: lawmatterssgv8.com

Staging: staging.lawmatterssgv8.com

Dev: dev.lawmatterssgv8.com

Hosting

Frontend: Vercel/Netlify

Backend: Supabase (DB + Edge Functions)

CDN: to be confirmed

Email: to be confirmed 

Monitoring: Sentry (errors), PostHog (analytics)

CI/CD (GitHub Actions)


name: Deploy to Production
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, npm ci, npm run type-check, lint, test:unit, test:integration]
  build:
    needs: test
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, npm ci, npm run build, upload-artifact]
  deploy-staging:
    if: github.event_name=='pull_request'
    needs: [test,build]
    runs-on: ubuntu-latest
    steps: [checkout, supabase functions deploy --project-ref ${{ secrets.SUPABASE_STAGING_REF }}, vercel --prod --token ${{ secrets.VERCEL_TOKEN }}]
  deploy-production:
    if: github.ref=='refs/heads/main'
    needs: [test,build]
    runs-on: ubuntu-latest
    steps: [checkout, supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROD_REF }}, vercel --prod --token ${{ secrets.VERCEL_TOKEN }}]


Secrets Management

Frontend (.env.local): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY, VITE_POSTHOG_KEY

Edge Functions: OPENAI_API_KEY, STRIPE_SECRET_KEY, SENDGRID_API_KEY, BROWSERLESS_TOKEN

CI/CD: GitHub Secrets


7. Security & Compliance
Authentication & Authorization

Password policy, session management, RBAC, audit logging.

Encryption

TLS 1.3 in transit, at-rest encryption for sensitive fields.

API Security

Rate limiting middleware by tier

Input validation via Zod schemas

Privacy & Legal

PDPA compliance: consent, data minimization, subject rights

Client–attorney privilege: encrypted audit trails and digital signatures

Data retention policies per regulatory requirements

8. Testing Strategy
Unit Tests (80% target) — Vitest + RTL + jest-axe for a11y

Integration Tests — Supabase test DB, full processing pipeline

End-to-End — Playwright for critical user journeys (signup, upload, AI chat)

Performance — k6 load tests (2m→10 users, 5m→50 users)

Chaos Engineering — periodic fault injection (network latency, function failures)

9. Migration Strategy
Phase 1: Schema Migration

Track via migration_status table

Migrate profiles, then validate

Phase 2: Document & Embedding Migration

async function migrateDocuments() {
  const batchSize=100; let offset=0;
  while(true){
    const batch=await legacyDb.query(`SELECT * FROM documents LIMIT ${batchSize} OFFSET ${offset}`);
    if(!batch.length) break;
    for(const doc of batch){ /* migrate file, insert record, migrate embeddings */ }
    offset+=batchSize;
    await updateMigrationProgress('documents', offset);
  }
}


Phase 3: Validation & Rollback

Automated functional tests → if failure, run initiateRollback() to restore backups and DNS

Deployment Checklist

Backups, baseline metrics, monitoring, rollback triggers → migrate → verify → train team

10. Scalability & Future Readiness
Frontend Optimizations

Code splitting, lazy loading, list virtualization, memoization

Backend Scaling

Composite indexes, connection pooling, Redis cache tiers, read replicas, sharding by user_id

Microservices Path

Split auth, documents, AI, notifications into separate services as load grows

Regional Expansion

Data residency, localization, regional Supabase projects

Analytics Evolution

From basic metrics → churn prediction, document-quality trends, BI with BigQuery/Snowflake + Kafka/ClickHouse

11. Suggestions for enhancement
Disaster Recovery & Backups
Define RTO/RPO targets and schedule regular database/storage snapshots (daily, geo-redundancy).

Automate DR drills in your CI/CD pipeline to verify restore workflows.

Cost & Budget Controls
Budget alerts via Cloudflare or Supabase billing webhooks.

Auto-throttle non-critical jobs when spend thresholds are met.

Developer Experience
Separate Formatting from Linting

Prettier for style (printWidth, quotes, semis).

ESLint for quality (unused vars, import order).

Use eslint-config-prettier to disable overlapping rules.

// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "plugins": ["@typescript-eslint"],
  "rules": { /* quality gates */ }
}

// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100
}


Incremental & Targeted Linting

Use husky + lint-staged so lint/format only runs on staged files:

// package.json
"husky": {
  "hooks": { "pre-commit": "lint-staged" }
},
"lint-staged": {
  "*.{js,ts,jsx,tsx}": ["eslint --fix", "prettier --write"]
}


Tailwind-Specific Linting

Install and configure eslint-plugin-tailwindcss:

npm install --save-dev eslint-plugin-tailwindcss

// .eslintrc.json (add to plugins)
{
  "plugins": ["tailwindcss"],
  "extends": ["plugin:tailwindcss/recommended"],
  "rules": {
    "tailwindcss/classnames-order": "warn"
  }
}


Summary of Best Practices

Keep formatting (Prettier) and quality (ESLint) distinct.

Use eslint-config-prettier to avoid conflicts.

Run checks only on changed files via lint-staged.

Leverage eslint-plugin-tailwindcss for class-name linting.

Data Privacy & Audit Logs
Append-only audit table (or external service) for deletions, role changes, and other sensitive ops.

Feature Flags & Canary Releases
Integrate a feature-flagging system (LaunchDarkly, Unleash) for controlled rollouts.

API Documentation & SDKs
Auto-generate OpenAPI/Swagger for all APIs and publish a TypeScript SDK for consumers.

Load-Testing & Chaos Engineering
Extend k6 tests with chaos scenarios (random function failures, latency spikes) to validate resilience.

This fully updated blueprint incorporates every layer—from core architecture to developer workflows and disaster-recovery—to serve as your roadmap for a robust, future-proof LawMattersSGv8. 