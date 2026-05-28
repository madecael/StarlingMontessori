# Nurture Dispatcher Cron Runbook

## 1. What This Is

The nurture dispatcher is an automated daily cron job that walks through all `roadmap_quiz` leads and sends the next nurture email in the sequence if one is due. It runs once per day at 14:00 UTC (10:00 AM Eastern) and handles the entire send workflow, including unsubscribe link generation and error tracking. This runbook covers how to set up and monitor the cron across different platforms.

## 2. Required Environment Variables

Deploy the following environment variables on your hosting platform (Replit, Vercel, etc.):

| Variable | Description |
|----------|-------------|
| `DISPATCH_SECRET` | Bearer token for authenticating cron calls. Generate with `openssl rand -hex 32` and treat as sensitive. |
| `RESEND_API_KEY` | Resend API key for sending emails. Obtain from your Resend dashboard. |
| `UNSUBSCRIBE_SECRET` | HMAC key for one-click unsubscribe URLs. Generate with `openssl rand -hex 32` and treat as sensitive. |

## 3. Choosing a Cron Path

### Path A: Replit Scheduled Deployments (Recommended)

If your site is deployed on Replit and your plan includes Scheduled Deployments:

1. Go to your Replit project **Deployments** dashboard
2. Click **Create → Scheduled Deployment**
3. Configure:
   - **Title**: `Starling Nurture Dispatcher`
   - **Cron expression**: `0 14 * * *` (14:00 UTC daily)
   - **Command**: paste the curl command below
4. Save

Sample command:

```sh
curl -sS -X GET "https://starlingmontessorischool.com/api/nurture-dispatch" \
  -H "Authorization: Bearer $DISPATCH_SECRET"
```

Replit will inject `DISPATCH_SECRET` from your Secrets at runtime.

### Path B: cron-job.org (Free Fallback)

If Replit Scheduled Deployments is not available on your plan:

1. Sign up at https://cron-job.org (free tier includes daily jobs)
2. Click **Create Cronjob**
3. Fill in:
   - **Title**: `Starling Nurture Dispatcher`
   - **URL**: `https://starlingmontessorischool.com/api/nurture-dispatch`
   - **Schedule**: every day at 14:00 UTC
   - **Request method**: GET
   - **Custom request headers**: add one row:
     - Header: `Authorization`
     - Value: `Bearer YOUR_DISPATCH_SECRET` (paste your actual secret)
   - **Notifications**: enable email on failure
4. Save and verify the first run manually (see section 4 below)

## 4. Verifying the Cron Is Working

Run this curl command locally or from any environment to manually trigger the dispatcher once:

```sh
curl -i -X GET "https://starlingmontessorischool.com/api/nurture-dispatch" \
  -H "Authorization: Bearer $DISPATCH_SECRET"
```

Replace `$DISPATCH_SECRET` with your actual secret value.

**Expected response**: `200 OK` with JSON body:

```json
{
  "ok": true,
  "scanned": 10,
  "sent": 2,
  "skipped": 8,
  "errors": []
}
```

Fields:
- `scanned`: number of `roadmap_quiz` leads examined
- `sent`: number of emails sent
- `skipped`: number of leads not due for an email yet
- `errors`: array of per-lead failures (empty on success)

**Failure modes:**

| Status | Issue | Resolution |
|--------|-------|-----------|
| `401 Unauthorized` | Bearer token mismatch | Check `DISPATCH_SECRET` is set correctly in your deploy environment |
| `503 Service Unavailable` | Missing `RESEND_API_KEY` or `UNSUBSCRIBE_SECRET` | Verify all three env vars are set on the deploy platform |
| `200 OK` with `sent: 0, scanned: 0` | No `roadmap_quiz` leads yet | Normal on first deployment; errors will populate as leads come in |
| `200 OK` with non-empty `errors` array | Individual email send failures | Check server logs for details; retry manually for affected leads |

## 5. Generating Secrets (One-Time Setup)

Run this locally to generate random secrets, then add them to your deploy environment:

```sh
# Generate DISPATCH_SECRET
openssl rand -hex 32

# Generate UNSUBSCRIBE_SECRET
openssl rand -hex 32
```

Each command outputs a 64-character hex string. Paste these into your Replit Secrets (or cron-job.org custom headers) one time only.

`RESEND_API_KEY` is obtained directly from your Resend dashboard; it is not randomly generated.

## 6. Disabling the Cron

If you need to disable the cron temporarily (e.g., during maintenance):

**Replit Scheduled Deployments:**
- In the Deployments dashboard, find the scheduled job and click **Pause**

**cron-job.org:**
- In your cronjob list, click the job and toggle **Enabled** to off

**Alternative (works for both):**
- Set `DISPATCH_SECRET` to an empty string or a different value
- All cron calls will receive `401 Unauthorized`, effectively disabling the job without deleting it

To re-enable, reverse the step.

## 7. What Gets Sent

The dispatcher sends up to five nurture emails in this sequence. Each includes a one-click unsubscribe link.

| Day | Email Subject | Purpose |
|-----|---------------|---------|
| 3 | Before you tour a preschool | Early guidance |
| 7 | Real questions other parents have asked us | Social proof & FAQs |
| 21 | A note on application timing | Timeline setting |
| 42 | Want to drop by Starling without committing? | Trial / tour offer |
| 70 | We'll stop emailing — but the door is open | Final touch + unsubscribe |

If a lead unsubscribes at any point, no further emails are sent.

## 8. Monitoring & Troubleshooting

**Check the cron ran:**
- Replit: in your project logs, grep for `nurture-dispatch` after 14:00 UTC
- cron-job.org: dashboard shows last execution status and timestamp

**If emails aren't sending:**
1. Verify `RESEND_API_KEY` and `UNSUBSCRIBE_SECRET` are set
2. Check Resend dashboard for quota and recent failures
3. Run the manual test (section 4) to inspect the error array
4. Check server logs for per-lead failures (e.g., invalid email format, database errors)

**If the cron never fires:**
- Replit: ensure the Scheduled Deployment is not paused; check Deployments dashboard
- cron-job.org: confirm the cronjob is enabled and the schedule is set to `0 14 * * *`
- Verify the cron URL is reachable by running the manual test

## 9. Future: Automation & Scaling

- **Email templates**: currently hardcoded in the endpoint; consider moving to a CMS for easier updates
- **Lead status**: currently tracked in the leads table; add a `last_email_sent` timestamp for audit trails
- **Bounce handling**: integrate bounce webhooks from Resend to auto-unsubscribe
- **A/B testing**: add email variant support if nurture performance metrics warrant it
