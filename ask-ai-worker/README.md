# Ask my AI — chat backend

A small [Cloudflare Worker](https://developers.cloudflare.com/workers/) that powers the
"Ask my AI" chat on the portfolio. GitHub Pages can only serve static files, so the
Anthropic API key has to live somewhere private. This Worker keeps the key secret,
calls Claude, and streams the answer back to the chat widget.

- **Model:** `claude-opus-5-5`, at low effort for fast, short answers
- **Knowledge:** everything the assistant knows is in [`src/knowledge.js`](src/knowledge.js).
  Edit it when your CV changes, then redeploy.
- **Safety:** answers only about you; requests from other websites are rejected; visitor
  messages are capped at 600 characters; best-effort rate limit of 20 requests per visitor
  every 10 minutes.
- **Safety fallback:** if Claude's safety classifier declines a question, the request is
  retried automatically on Anthropic's recommended fallback model (`fallbacks: "default"`).

Until the Worker is deployed and its URL is set in `index.html`, the widget still works.
It answers common questions from a built-in FAQ in `js/ask-ai.js`.

## One-time setup (about 10 minutes)

You need a free Cloudflare account and an Anthropic API key from
<https://console.anthropic.com/>.

```bash
cd ask-ai-worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

`wrangler deploy` prints a URL like `https://ask-vivek-ai.<your-subdomain>.workers.dev`.
Put it, with `/chat` on the end, into `index.html`:

```html
<script src="js/ask-ai.js" data-endpoint="https://ask-vivek-ai.<your-subdomain>.workers.dev/chat"></script>
```

Commit and push. The chat now answers with Claude.

## Keep costs predictable

Set a **monthly spend limit** in the Anthropic Console (Settings → Limits). The in-Worker
rate limit is best-effort only, because it resets whenever Cloudflare recycles the Worker.
The profile in the system prompt is cached, so repeat questions cost much less than the
first.

## Custom domain or extra sites

Edit `ALLOWED_ORIGINS` in `wrangler.toml` (comma-separated, no trailing slash) and redeploy.

## Local testing

```bash
printf 'ANTHROPIC_API_KEY=sk-ant-...\n' > .dev.vars   # never commit this file
npx wrangler dev --port 8787
```

Then set `data-endpoint="http://127.0.0.1:8787/chat"` while you test the site at
`http://localhost:8123`.
