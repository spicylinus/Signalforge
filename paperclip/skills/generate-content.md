# Skill: generate-content

**Used by:** Content Agent  
**Trigger:** Heartbeat (Sunday + Wednesday 20:00)  

## What this skill does

Calls the ContentForge internal API to process all pending content generation
jobs that are scheduled for now or earlier.

## Steps

1. Hit the internal process-jobs endpoint:

```bash
curl -s -X POST http://localhost:3000/api/internal/process-jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CONTENTFORGE_INTERNAL_SECRET" \
  | jq '.'
```

2. Parse the response. Expected format:
```json
{
  "processed": 12,
  "failed": 0,
  "totalPending": 0
}
```

3. If `failed > 0`, log a warning and include details in the heartbeat report.

4. If the endpoint returns a non-200 status, retry once after 60 seconds.
   If still failing, escalate to Founder.

## Environment variables required

- `CONTENTFORGE_INTERNAL_SECRET` — set in Paperclip AI secrets store
- `ANTHROPIC_API_KEY` — set in Paperclip AI secrets store

## Definition of done

All `pending` content jobs with `scheduled_at <= NOW()` have status `done`.
