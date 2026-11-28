# Bulk Email (NeverOrdinary)

Small internal tool: send the **same subject and message** to up to ~200 recipients, each as a **separate email** (never CC/BCC). Hosted on **Vercel**. Sends through **Gmail SMTP** with an App Password. Minimal UI by design: it must work, not be fancy.

## Stack
- Node.js, `nodemailer` (Gmail SMTP). `express` is used only for local dev.
- Frontend: one static file, `public/index.html`. Vanilla JS and CSS, no framework, no build step.
- Backend: a single Vercel serverless function, `api/send.js`.

## Files
- `public/index.html`: the whole UI (compose, recipients, progress, report download).
- `api/send.js`: `POST /api/send`. It checks the `x-access-key` header, validates input, and sends one email per recipient with a ~400ms pause between sends.
- `server.js`: local dev only (`npm start`, http://localhost:3000). It mounts `api/send.js` and serves `public/`. Vercel ignores it.
- `.env.example`: required env vars. The real `.env` is gitignored and must never be committed.

## Environment variables (set in `.env` locally and in Vercel project settings)
`GMAIL_USER`, `GMAIL_APP_PASSWORD` (16-character Google App Password, needs 2-Step Verification), `FROM_NAME`, `ACCESS_KEY` (password typed on the page). Vercel only applies changed vars after a redeploy.

## Key design decisions (do not undo without a reason)
- **Batching from the browser.** Vercel functions time out after about 10s (Hobby), so the server accepts at most 10 recipients per request (`MAX_PER_REQUEST`) and the page loops in batches (`BATCH = 10`). Do not move the whole loop onto the server.
- **Individual sends.** One `sendMail` per recipient. No CC/BCC.
- **Access key.** `x-access-key` must equal `ACCESS_KEY`, otherwise 401. Without it anyone with the URL could send mail from the Gmail account.
- **CSV report built client-side.** There is no database. Each recipient is tracked as Sent, Failed or Not sent. Failed ones come first in the CSV, which is UTF-8 with a BOM so Excel opens it. Test sends are excluded from the report. "Retry failed" updates the same report. The report is lost on refresh, so download it when the send finishes.
- **Bold is the only formatting.** The user types `**words**`. `api/send.js` escapes the message, then sends it as `html:` with a `text:` copy that has the stars removed. There is no editor.

## Limits and gotchas
- A free Gmail account allows about 500 sends a day (Workspace about 2,000). 200 recipients is fine.
- The user must keep the tab open during a send because the browser drives the batches.
- Mail with no unsubscribe line is more likely to be flagged as spam. The user adds "Reply STOP to unsubscribe" to the message text. Nothing is added automatically.

## UI style
Matches the Vercel 2FA look: pure black background, `#0d0d0d` cards with `#262626` borders, a faint amber glow at the top of each card, white (`#ededed`) primary buttons, Vercel blue `#0070f3` accent. Colours are CSS variables at the top of `public/index.html`.

## Commands
- `npm install`
- `npm start`: local dev server
- Deploy: push to GitHub, and Vercel auto-deploys (or run `vercel --prod`)

## Working style
Keep it simple and minimal. Don't add dependencies, frameworks, a database or a build step unless asked.
