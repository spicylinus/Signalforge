# SignalForge — Paperclip Agents

## Signal Agent

**Role**: Drains the `sf_signal_queue` table. Processes Make.com webhook payloads and CSV-uploaded rows; deduplicates and upserts into `sf_leads`. Debits client credit accounts after each lead. Fires low-balance alerts when balance drops below threshold.

**Heartbeat**: Every 15 minutes
**Budget**: $30/mo
**Governance**: Autonomous
**Endpoint**: `POST /api/internal/ingest-signals`
**Auth**: `Authorization: Bearer $INTERNAL_AGENT_SECRET`

**Trigger command**:
```bash
curl -X POST https://<DOMAIN>/api/internal/ingest-signals \
  -H "Authorization: Bearer $INTERNAL_AGENT_SECRET"
```

**Expected response**:
```json
{ "processed": 12, "errors": 0, "lowBalanceAlerts": 1 }
```

---

## Scoring Agent

**Role**: Scores unscored leads for Guided and Enterprise customers using Claude AI. Produces MQL/SQL classification, ICP segment (A/B/C/off-icp), IQ score (1–100), and reasoning notes. Floor-tier customers are excluded — plan gate enforced in `runScoringAgent()`.

**Heartbeat**: Every 60 minutes
**Budget**: $30/mo
**Governance**: Autonomous
**Endpoint**: `POST /api/internal/score-leads`
**Auth**: `Authorization: Bearer $INTERNAL_AGENT_SECRET`

**Trigger command**:
```bash
curl -X POST https://<DOMAIN>/api/internal/score-leads \
  -H "Authorization: Bearer $INTERNAL_AGENT_SECRET"
```

**Expected response**:
```json
{ "processed": 5, "errors": 0 }
```

---

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key (used by Scoring Agent) |
| `INTERNAL_AGENT_SECRET` | Bearer token for heartbeat endpoints |
| `MAKE_WEBHOOK_SECRET` | Shared secret for Make.com webhook header `x-make-secret` |

---

## Architecture Notes

- Signal Agent processes up to 200 queue items per run; run more frequently if volume exceeds this
- Scoring Agent is idempotent — re-running it won't re-score already-scored leads
- Both agents are stateless HTTP calls — safe to run from cron, Make.com, or any scheduler
- Low-balance alerts are rate-limited to once per 7 days per customer to avoid spam
