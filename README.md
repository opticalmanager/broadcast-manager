<div align="center">

  # Broadcast Manager

  <p align="center">
    <strong>Enterprise WhatsApp® Marketing, Multi-Agent Shared Inbox, Sales CRM &amp; Visual Automation Platform</strong>
  </p>

  <p align="center">
    Built directly on the official Meta WhatsApp Business Cloud API &bull; 100% Data Sovereignty &bull; Zero Per-Seat SaaS Fees
  </p>

  <p align="center">
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js%2016-Turbopack-black?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React%2019-Ready-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
    <a href="https://developers.facebook.com/docs/whatsapp/cloud-api"><img src="https://img.shields.io/badge/Meta-WhatsApp%20Cloud%20API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Meta WhatsApp Cloud API" /></a>
    <a href="https://vitest.dev"><img src="https://img.shields.io/badge/Tests-1%2C063%20Passed-25c2a0?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest Tests" /></a>
  </p>

  <p align="center">
    <a href="#-key-features">Features</a> &bull;
    <a href="#-system-architecture">Architecture</a> &bull;
    <a href="#-quick-start">Quick Start</a> &bull;
    <a href="#-docker-deployment">Docker</a> &bull;
    <a href="#-production-deployment">Production</a> &bull;
    <a href="#-public-api--mcp-server">API & MCP</a> &bull;
    <a href="#-environment-variables">Configuration</a> &bull;
    <a href="#-meta-whatsapp-setup">WhatsApp Setup</a>
  </p>

</div>

---

## 🌟 Executive Overview

**Broadcast Manager** is a production-grade, self-hostable WhatsApp CRM and broadcast marketing platform engineered for businesses to scale customer engagement without paying costly per-seat SaaS subscription fees. Built directly on the **official Meta WhatsApp Business Cloud API**, it transforms your WhatsApp Business phone number into an organized, high-performance customer operations center with real-time multi-agent sync, automated drip campaigns, and bank-grade data security.

### Why Choose Broadcast Manager?

- **100% Data Sovereignty**: All customer conversations, media attachments, contact profiles, and automation logs reside securely in your own Supabase PostgreSQL database with Row-Level Security (RLS).
- **Zero Per-Seat Fees**: Scale your customer support and sales teams from 1 to 100+ agents without incremental licensing costs.
- **Official Meta Cloud API**: Direct, high-throughput connectivity with the Meta Graph API — no fragile unofficial scrapers or reverse-engineered QR gateways that risk phone number suspensions.
- **Modern Architecture**: Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript strict mode, and full automated test suite coverage (1,063+ tests).
- **AI-Native & Extensible**: Native Model Context Protocol (MCP) server support, Bring-Your-Own-Key (BYOK) AI assistants, hybrid semantic search (pgvector), and scoped REST APIs.

---

## 🚀 Key Features

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              BROADCAST MANAGER PLATFORM                                │
├─────────────────────┬─────────────────────┬────────────────────┬───────────────────────┤
│ 💬 Shared Team      │ 📢 Broadcast        │ ⚡ Visual Flow     │ 🤖 AI Copilot         │
│    Inbox            │    Campaigns        │    Automations     │    & Hybrid RAG       │
│ • Realtime WS Sync  │ • Bulk CSV Imports  │ • Node Drag & Drop │ • BYOK OpenAI/Claude  │
│ • 24h Care Window   │ • Meta Templates    │ • Trigger Webhooks │ • Auto-Reply Bot      │
│ • Rich Media & Audio│ • Variable Mapping  │ • If/Else Branches │ • Semantic pgvector   │
│ • Chat Assignment   │ • Delivery Analytics│ • Scheduled Cron   │ • Human Handoff       │
├─────────────────────┼─────────────────────┼────────────────────┼───────────────────────┤
│ 👥 Contact CRM      │ 📊 Sales Pipelines  │ 📱 Native PWA      │ 🛡️ Enterprise        │
│    & Custom Fields  │    (Kanban Deals)   │    Mobile UI       │    Security           │
│ • Smart E.164 Clean │ • Drag & Drop Stages│ • WhatsApp-like UX │ • 100% RLS Coverage   │
│ • Custom Attributes │ • Multi-Currency    │ • 4-Tab Bottom Nav │ • AES-256 Encryption  │
│ • Tag Segments      │ • Chat-Linked Deals │ • Offline Fallback │ • Multi-Tenant RBAC   │
│ • CSV Import/Export │ • Conversion Metrics│ • Theming (6 Tints)│ • SSRF Protection     │
└─────────────────────┴─────────────────────┴────────────────────┴───────────────────────┘
```

---

### 1. 💬 Shared Team WhatsApp Inbox

Transform your official WhatsApp Business number into an omnichannel customer collaboration hub.

- **Instant Real-Time WebSocket Sync**: Conversations, delivery receipts, and inbound messages synchronize instantaneously across all agent browsers using Supabase Realtime WebSocket channels.
- **24-Hour Customer Care Window Intelligence**: WhatsApp enforces a 24-hour customer messaging window for free-form responses. Broadcast Manager displays a live countdown timer on active chats and provides a **1-tap template re-engagement picker** when the window expires to seamlessly reopen communication.
- **Full Rich Media Support**: Send and receive photos, documents (PDF/DOCX), voice audio notes, and video files with automatic mirroring in Supabase Storage (`chat-media` bucket).
- **Collaboration & Triage**: Assign threads to teammates, toggle conversation lifecycle states (`Open`, `Pending`, `Closed`), and maintain internal team notes that customers never see.
- **WhatsApp Native Experience**: Authentic WhatsApp doodle canvas (`inbox-doodle.svg`) and message formatting for a familiar, friction-free workflow.

---

### 2. 📱 Native Mobile & PWA Experience

Engineered specifically for mobile agents on the go with a progressive web app architecture.

- **WhatsApp-Inspired Navigation**: 4-tab mobile bottom bar (`Dashboard`, `Inbox`, `Broadcasts`, `Contacts`) with dynamic unread badges, active tab highlighting, and auto-hiding during active chat threads.
- **Native-Feel Conversation Feed**: Circular contact avatars with live conversation status dots (`green` for open, `amber` for pending, `slate` for closed), formatted timestamps (`10:45 AM`, `Yesterday`, `Mon`, `12/04/26`), rich media previews, and horizontal filter chips.
- **Offline Reliability & Installability**: Service worker caching (`sw.js`) with an offline fallback page, standalone display mode, and instant add-to-homescreen prompts for iOS and Android.

---

### 3. 🎨 Adaptive Theming & Zero-Flash Styling

- **Light & Dark Mode**: Automatically adapts to user OS system preferences (`prefers-color-scheme`) with instant client-side toggles.
- **6 Handcrafted Accent Themes**:
  - 🌿 **Emerald**: Fresh WhatsApp-inspired green (Default)
  - 🔮 **Violet**: Bold and modern
  - 🌊 **Cobalt**: Clean enterprise blue
  - 🍯 **Amber**: Warm and energetic
  - 🌹 **Rose**: Sophisticated crimson
  - 💎 **Cyan**: Crisp electric blue
- **Zero-Flicker Boot Script**: Inlined head script applies stored theme tokens before React hydrates, guaranteeing zero white flashes on reload.

---

### 4. 📢 Broadcast Campaigns & Audience Segmentation

Send personalized notifications, product announcements, and transactional updates at scale.

- **Meta Template Engine**: Syncs approved WhatsApp message templates directly from Meta Business Manager with dynamic parameter placeholders (`{{1}}`, `{{2}}`).
- **Bulk CSV Import with Auto-Mapping**: Upload CSV contact lists with automatic column detection, deduplication safeguards, and international E.164 phone number formatting.
- **Live Progress & Read Tracking**: Monitor campaigns in real time with visual delivery rate bars, read percentages, and failure diagnostic badges.
- **Anti-Flood & Rate Safeguards**: Built-in batching, campaign pause/resume capabilities, and automatic blacklist/retry for failed numbers.

---

### 5. ⚡ Visual No-Code Flow Builder & Automations

Create complex business logic, lead routing, and auto-responders without writing code.

- **Interactive Node Canvas**: Visual drag-and-drop workflow editor powered by `@xyflow/react`.
- **Triggers**: Inbound customer messages, specific keywords/regex, contact created, tag assigned, external API webhooks, or recurring cron schedules.
- **Actions**:
  - Send message or template
  - Update contact properties & assign tags
  - Create and move Kanban deals
  - Wait timers / delay steps
  - Conditional branching (If/Else logic)
  - Dispatch secure outbound HTTP webhooks (SSRF protected with HMAC-SHA256 signatures)
- **Execution History & Tracing**: Inspect step-by-step run logs and payloads for rapid debugging.

---

### 6. 🤖 AI Agent & Hybrid RAG Knowledge Base

Bring cutting-edge LLMs to your WhatsApp customer conversations without paying per-seat AI markups.

- **Bring-Your-Own-Key (BYOK)**: Connect your own OpenAI or Anthropic API key. Credentials are encrypted at rest with AES-256-GCM.
- **Inbox Draft Assistant**: 1-click contextual reply drafting considering previous conversation history and customer sentiment.
- **Autonomous Auto-Reply Bot**: Configurable system instructions, maximum auto-reply caps per thread, and automatic graceful handoff to human agents when complex inquiries arise.
- **Hybrid RAG Knowledge Base**: Upload company documentation, product catalogs, and FAQs. Combines PostgreSQL full-text search with `pgvector` semantic vector embeddings for grounded, hallucination-free answers.
- **Interactive AI Playground**: Test model prompts and parameters directly inside the settings dashboard before enabling them in production.

---

### 7. 📈 Sales Pipelines & Kanban CRM

Manage your deals and customer journey alongside your messaging conversations.

- **Custom Pipeline Stages**: Fully configurable deal stages (e.g. *Lead*, *Qualified*, *Proposal*, *Negotiation*, *Won*, *Lost*).
- **Direct WhatsApp Linking**: Every deal links directly to its contact and conversation thread for one-click access.
- **Multi-Currency Formatting**: Full support for USD, EUR, GBP, INR, BRL, and custom regional currencies.
- **Drag-and-Drop Kanban**: Intuitive cards built with `@dnd-kit` for frictionless stage transitions.

---

### 8. 👥 Team Tenancy & Role-Based Access Control (RBAC)

Multi-user management designed for organizations of any scale.

| Role | Permissions |
|---|---|
| 👑 **Owner** | Full system control, billing, account deletion, ownership transfer |
| 🛡️ **Admin** | Manage team members, configure Meta credentials, create API keys, build automations |
| 👤 **Agent** | Send/receive WhatsApp messages, manage contacts, create deals, assign threads |
| 👁️ **Viewer** | Read-only access to conversations, reports, and contact records |

- **Link Invitations**: Generate secure, tokenized invitation URLs (`/join/<token>`) to onboard teammates in seconds.
- **Multi-Tenancy**: Every database table is scoped by `account_id`, allowing agencies and multi-brand businesses to operate securely.

---

### 9. 🔌 Public REST API & Model Context Protocol (MCP)

Extend your CRM into your existing tech stack or control it via AI coding assistants.

- **Public REST API (`/api/v1`)**:
  - Scoped Bearer token authentication (`wacrm_live_...`) with fine-grained permissions (`messages:send`, `contacts:read`, `broadcasts:send`).
  - Idempotent endpoints, structured JSON envelopes, and robust rate limiting.
  - Read full documentation in [`docs/public-api.md`](./docs/public-api.md).
- **Model Context Protocol (MCP) Server**:
  - Drive Broadcast Manager directly from **Claude Desktop**, **Cursor**, **Windsurf**, or autonomous agent scripts using natural language:
    > *"Find all open conversations from today and summarize customer inquiries."*
    > *"Send the onboarding template to +1 555 0199."*
  - Read [`docs/mcp.md`](./docs/mcp.md).
- **Outbound Webhooks**: Real-time event dispatching for integration with Zapier, Make.com, n8n, or internal webhooks.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & Interfaces"]
        Desktop[💻 Desktop Web Browser]
        Mobile[📱 Mobile Browser / PWA App]
        MCPClient[🤖 Cursor / Claude Desktop / MCP Client]
        ExtApp[🌐 Third-Party Apps / Webhooks]
    end

    subgraph AppLayer["Next.js 16 Application (App Router)"]
        Dashboard[UI Dashboard & Chat Shell]
        APIRoutes["REST API (/api/v1)"]
        WebhookIn["WhatsApp Webhook Handler (/api/whatsapp/webhook)"]
        AutomationEngine[Flow & Automation Runner]
        AIEngine[AI Copilot & Hybrid RAG Engine]
    end

    subgraph DataLayer["Supabase Backend"]
        Postgres[("PostgreSQL Database\n(100% RLS Protected)")]
        PgVector[("pgvector Embeddings\nKnowledge Base")]
        Storage[("Supabase Storage\n(chat-media bucket)")]
        Realtime[("Realtime Engine\n(WebSockets)")]
        Auth["Supabase Auth Engine"]
    end

    subgraph External["External Services"]
        Meta[("Meta WhatsApp Cloud API\n(Graph API v21.0+)")]
        OpenAI[("OpenAI / Anthropic APIs\n(LLM & Embeddings)")]
    end

    Desktop --> Dashboard
    Mobile --> Dashboard
    MCPClient --> APIRoutes
    ExtApp --> APIRoutes

    Dashboard --> Postgres
    Dashboard --> Realtime
    Dashboard --> Storage
    Dashboard --> Auth

    WebhookIn --> Postgres
    WebhookIn --> Realtime
    WebhookIn --> Storage
    WebhookIn --> AutomationEngine

    AutomationEngine --> Meta
    AIEngine --> OpenAI
    AIEngine --> PgVector
    Dashboard --> Meta
    Meta --> WebhookIn
```

---

## 🛠️ Tech Stack

| Domain | Technologies Used |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Server Actions, Standalone Output) |
| **Language** | [TypeScript](https://www.typescriptlang.org) (Strict Mode) |
| **Runtime & UI** | [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Shadcn UI](https://ui.shadcn.com), [@base-ui/react](https://base-ui.com) |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL, Row-Level Security, pgvector, Realtime) |
| **Messaging** | [Meta WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) |
| **Workflow Engine**| [@xyflow/react](https://reactflow.dev) (Visual node-based canvas) |
| **Testing** | [Vitest](https://vitest.dev) (1,063 unit & integration tests) |
| **AI Integration** | [OpenAI API](https://platform.openai.com), [Anthropic Claude](https://anthropic.com), [Model Context Protocol](https://modelcontextprotocol.io) |
| **Internationalization**| [next-intl](https://next-intl-docs.vercel.app) (English, Spanish, Korean, Portuguese) |

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- A free **[Supabase](https://supabase.com)** project
- A **[Meta for Developers](https://developers.facebook.com)** business account

### 2. Clone and Install
```bash
git clone <your-repository-url>
cd broadcast-manager
npm install
```

### 3. Environment Configuration
Create your local environment file:
```bash
cp .env.local.example .env.local
```
Configure your Supabase and encryption variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ENCRYPTION_KEY="generate-a-32-byte-hex-string-for-aes-256"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_LOCALE="en"
```

> **Tip:** Generate a secure 32-byte encryption key using Node.js:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4. Apply Database Migrations
Run the included database migration script to set up all tables, triggers, and RLS policies:
```bash
# Using direct Postgres connection string:
node scripts/apply-migrations.mjs "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# Or using your Supabase database password:
node scripts/apply-migrations.mjs --password "YOUR_DB_PASSWORD"
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🐳 Docker Deployment

The repository includes a production-ready, multi-stage `Dockerfile` and `docker-compose.yml`.

### Using Docker Compose

1. Configure `.env.local` with your production variables.
2. Build and launch:
   ```bash
   docker compose --env-file .env.local up --build -d
   ```
3. Access Broadcast Manager at **`http://localhost:3000`** (or custom `HOST_PORT`).

### Plain Docker
```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg NEXT_PUBLIC_APP_LOCALE=en \
  -t broadcast-manager .

docker run -d \
  --env-file .env.local \
  -e PORT=3000 \
  -p 3000:3000 \
  broadcast-manager
```

For complete containerization details, see [`docs/docker.md`](./docs/docker.md).

---

## 🚀 Production Deployment

Broadcast Manager is a standard Next.js application that can be deployed on any modern Linux server, VPS (Ubuntu/Debian), or cloud platform.

### Deploying on a Cloud VPS / Dedicated Server

1. **Server Setup**: Install Node.js 20+ and PM2:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm
   npm install -g pm2
   ```

2. **Clone & Build**:
   ```bash
   git clone <your-repository-url> /var/www/broadcast-manager
   cd /var/www/broadcast-manager
   npm ci
   cp .env.local.example .env.local  # Populate your production variables
   npm run build
   ```

3. **Start Process with PM2**:
   ```bash
   pm2 start npm --name "broadcast-manager" -- start
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy & SSL**:
   Set up Nginx to proxy port 3000 to your domain and issue a free SSL certificate with Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d crm.yourdomain.com
   ```

---

## 🔐 Environment Variables Reference

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | **Yes** | Your Supabase project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | **Yes** | Supabase anonymous public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | **Yes** | Supabase service role secret (used for administrative webhook ops) |
| `ENCRYPTION_KEY` | Server-only | **Yes** | 32-byte hex string for AES-256-GCM encryption of access tokens and AI keys |
| `NEXT_PUBLIC_SITE_URL` | Client & Server | **Yes** | Canonical deployment URL (`https://crm.yourdomain.com`) |
| `NEXT_PUBLIC_APP_LOCALE` | Client & Server | No | Default language (`en`, `es`, `ko`, `pt`). Defaults to `en` |
| `META_APP_SECRET` | Server-only | Recommended | Meta App Secret for verifying webhook HMAC-SHA256 signatures |
| `META_APP_ID` | Server-only | Optional | Meta Application ID for embedded signup flows |
| `AUTOMATION_CRON_SECRET` | Server-only | Recommended | Shared secret for securing external cron runners (`/api/automations/cron`) |
| `AI_REQUEST_TIMEOUT_MS` | Server-only | Optional | Timeout limit for LLM generation (Defaults to `15000`) |

---

## 📱 Meta WhatsApp Cloud API Setup

Connecting your WhatsApp number takes under 5 minutes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       META WHATSAPP ONBOARDING FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘
  1. Developers.facebook.com ──> Create App (Type: Other -> Business)
  2. Add Product             ──> WhatsApp
  3. API Setup               ──> Copy Phone Number ID & WABA ID
  4. System User Token       ──> Generate permanent token with whatsapp_business_messaging
  5. Broadcast Manager       ──> Settings -> WhatsApp -> Paste IDs & Save
  6. Webhooks                ──> Callback URL: https://your-domain.com/api/whatsapp/webhook
                             ──> Verify Token: paste from Broadcast Manager settings
                             ──> Subscriptions: check 'messages'
```

1. **Create a Meta App**: Visit [developers.facebook.com](https://developers.facebook.com) → **Create App** → Choose **Other** → Select **Business**.
2. **Add WhatsApp Product**: In your App Dashboard, click **Set up** on the **WhatsApp** card.
3. **Generate Permanent Access Token**:
   - In Meta Business Suite, navigate to **Business Settings → System Users**.
   - Create a System User (Admin role).
   - Generate a token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
4. **Connect in Broadcast Manager**:
   - In Broadcast Manager, navigate to **Settings → WhatsApp Configuration**.
   - Enter your **Phone Number ID**, **WhatsApp Business Account (WABA) ID**, and **Permanent Access Token**.
   - Click **Save Configuration**.
5. **Configure Webhook in Meta**:
   - In Meta Developer Portal → **WhatsApp → Configuration**.
   - Set **Callback URL** to: `https://your-domain.com/api/whatsapp/webhook`.
   - Set **Verify Token** to the token generated in Broadcast Manager.
   - Under **Webhook Fields**, click **Manage** and subscribe to **`messages`**.

Need help troubleshooting connection codes? See [`docs/whatsapp-connection-troubleshooting.md`](./docs/whatsapp-connection-troubleshooting.md).  
Running multiple phone numbers on one install? Check [`docs/multi-waba.md`](./docs/multi-waba.md).

---

## 🌍 Supported Languages (i18n)

Broadcast Manager is fully internationalized out-of-the-box using `next-intl`:

| Code | Language | Native Name | Status |
|---|---|---|---|
| `en` | English | English | ✅ 100% Complete |
| `es` | Spanish | Español | ✅ 100% Complete |
| `ko` | Korean | 한국어 | ✅ 100% Complete |
| `pt` | Portuguese (Brazil) | Português (Brasil) | ✅ 100% Complete |

To switch the primary language, update `NEXT_PUBLIC_APP_LOCALE` in `.env.local` to `en`, `es`, `ko`, or `pt`. All translation dictionary files reside in [`messages/`](./messages/).

---

## 🧪 Testing & Code Quality

Broadcast Manager maintains a rigorous automated testing suite with zero tolerated test failures.

```bash
# Run full Vitest suite (1,063+ tests)
npm run test

# Run tests in interactive watch mode
npm run test:watch

# TypeScript type check
npm run typecheck

# Code formatting
npm run format:check
```

---

## 🛡️ Security & Privacy Architecture

Security in Broadcast Manager is proactive, not an afterthought:

- **Row-Level Security (RLS)**: Every single table in the PostgreSQL database enforces strict tenant isolation policies using `is_account_member(account_id)`.
- **Cryptographic Protection**: Sensitive tokens (Meta System User tokens, OpenAI keys, Anthropic keys) are stored encrypted in the database using **AES-256-GCM**.
- **HMAC Webhook Verification**: Inbound WhatsApp webhooks are validated against Meta's SHA-256 signature (`X-Hub-Signature-256`).
- **SSRF Defenses**: Outbound automation webhooks validate target URLs and block private intranet IPs, link-local addresses, and cloud metadata services.
- **Strict Content Security Policy (CSP)**: Built-in Next.js security headers preventing cross-site scripting (XSS) and iframe clickjacking.

---

## 🤝 Contributing

We welcome community feedback, issue reports, and improvements!

1. Fork the Project on GitHub.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: add amazing feature'`).
4. Ensure all tests pass (`npm run test && npm run typecheck`).
5. Push to the Branch (`git push origin feature/AmazingFeature`).
6. Open a Pull Request.

Please review our [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`.github/SECURITY.md`](./.github/SECURITY.md) guidelines.

---

<div align="center">
  <p>Crafted for modern businesses that care about their customers.</p>
</div>
