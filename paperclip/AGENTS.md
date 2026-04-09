# ContentForge — Paperclip AI Agent Definitions

This file configures the internal AI agents that run the ContentForge business
via Paperclip AI. Each agent has a role, a heartbeat schedule, a budget, and
a set of skills it can execute.

---

## Company: ContentForge

**Mission:** Build the #1 AI content agent service for small businesses to $1M ARR.

---

## Agents

### 1. Content Agent

**Role:** Senior Content Producer  
**Reports to:** Founder (you)  
**Heartbeat:** Every Sunday at 20:00 and Wednesday at 20:00 (pre-generates the week's batch)  
**Monthly budget:** $50 USD  

**Responsibilities:**
- Process all `pending` content jobs in the database that are due
- Generate blog posts, social captions, and newsletters via Claude API
- Mark jobs as `done` and send delivery email via Resend

**Skill:** `generate-content`

```bash
# The agent calls this endpoint to run the job batch
curl -X POST http://localhost:3000/api/internal/process-jobs \
  -H "Authorization: Bearer $CONTENTFORGE_INTERNAL_SECRET"
```

**Success criteria:** All `pending` jobs with `scheduled_at <= NOW()` are processed.

---

### 2. Support Agent

**Role:** Customer Success Manager  
**Reports to:** Founder  
**Heartbeat:** Every day at 09:00  
**Monthly budget:** $20 USD  

**Responsibilities:**
- Check `support@contentforge.com` inbox for new tickets
- Draft polite, on-brand replies to common questions (billing, how-to, bugs)
- Flag complex or angry customer issues to the Founder for review
- Do NOT send replies without Founder approval (governance gate: REQUIRES_APPROVAL)

**Governance:** All outbound emails require human approval before sending.

---

### 3. Marketing Agent

**Role:** Growth Marketer  
**Reports to:** Founder  
**Heartbeat:** Every Monday at 08:00  
**Monthly budget:** $30 USD  

**Responsibilities:**
- Write one blog post per week for the ContentForge company blog (on AI, content marketing, solopreneur tips)
- Draft 5 LinkedIn/Twitter posts promoting the product
- Write one short-form ad copy variant for testing

**Output:** Save all drafts to `/tmp/marketing-drafts/` for Founder review before publishing.

---

### 4. Dev Agent (Claude Code)

**Role:** Software Engineer  
**Reports to:** Founder  
**Heartbeat:** On-demand (triggered by Founder assigning a task)  
**Monthly budget:** $100 USD  

**Responsibilities:**
- Pick up GitHub issues labeled `agent-ok` in `shannendoah/blah-blah`
- Implement fixes or small features on a new branch
- Open a PR for Founder review — never merge without approval

**Tool:** Claude Code (claude-sonnet-4-6)

---

## Governance Rules

1. **No agent sends emails or posts publicly without Founder approval.**
2. **Content Agent** is the only fully autonomous agent — it generates and delivers content without approval (this is the product).
3. **Budget hard stops** are enforced by Paperclip AI. Agents that exhaust their monthly budget pause until the next cycle.
4. **All agent actions are logged** in the Paperclip AI audit trail at http://127.0.0.1:3100.

---

## Cost Estimate (at $50k/month revenue, ~252 customers)

| Agent         | API calls/month | Est. cost |
|---------------|----------------|-----------|
| Content Agent | ~6,048 Claude calls (252 customers × 24 pieces) | ~$30–60 |
| Support Agent | ~200 draft replies | ~$2 |
| Marketing Agent | ~20 pieces | ~$1 |
| Dev Agent | on-demand | ~$10–40 |
| **Total**     |                | **~$43–103/month** |

Gross margin at $50k revenue: **99.8%** (infrastructure + API costs ~$150/month total).
