# presend

A "should I send this?" checker, shipped as an MCP server.

Paste a draft email / LinkedIn post / proposal / feedback note. presend grades it 0–10, flags risky phrasing (implied commitments, vague timeframes, off-tone, bias, oversharing…), and — on request — rewrites it. Optional per-recipient profiles let you grade against a real person's wiring instead of a generic ideal.

## What it does

Five MCP tools:

| Tool | What it does |
|---|---|
| `check_message` | Score a draft. Returns a markdown table of red/yellow/green flags + one-line summary. |
| `fix_message` | Rewrite the draft applying the flags from `check_message`. |
| `save_profile` | Save a recipient profile (boss, client, partner) and their communication preferences. |
| `list_profiles` | Show saved profiles. |
| `delete_profile` | Remove a saved profile by id. |

**Modes:** `email`, `linkedin`, `proposal`, `feedback`, `general`. Each mode applies its own checklist (e.g. email mode looks for implied commitments and vague timeframes; feedback mode looks for bias and unactionable critique; proposal mode looks for risk language and missing sections).

**Profiles** live at `~/.presend/profiles.json`. A profile carries a free-text description of how a specific recipient prefers to be communicated with — direct/diplomatic, bullets/prose, formal/casual, sensitivities — plus a default language. Pass `profile_id` to `check_message`/`fix_message` to grade against that person rather than a generic ideal.

**Languages.** presend auto-detects the language of your draft and responds in that language. Mixed-language drafts (e.g. PT + EN) get flagged.

### How it works

presend is an MCP server, but it does **not** call an LLM itself. Each tool returns a structured instruction block that the host LLM (the model you're talking to) executes in its very next turn. No API keys, no sampling, no outbound network calls from the server. The MCP client doesn't even need to support `sampling/createMessage`.

This means presend works with any MCP-compatible host — Claude Code, Claude Desktop, Cursor, Cline, etc. — as long as the host model is capable of following instructions and rendering markdown.

## Prerequisites

- Node.js 18+
- An MCP-compatible client (Claude Code, Claude Desktop, Cursor, Cline, …)

## Install

### Option A — Claude Code (CLI), via `claude mcp add`

The simplest path on Claude Code. From anywhere:

```bash
git clone https://github.com/PTthe13/amplifiedlabs.git
cd amplifiedlabs/presend
npm install
npm run build

claude mcp add presend node "$(pwd)/dist/index.js"
```

Restart your Claude Code session. The five `mcp__presend__*` tools appear.

### Option B — Claude Code plugin (local marketplace)

This folder ships with `.claude-plugin/plugin.json` and `.mcp.json`, so it can be added as a local marketplace and installed by name:

```bash
# from inside Claude Code
/plugin marketplace add /absolute/path/to/amplifiedlabs
/plugin install presend
```

Or install directly from the folder:

```bash
/plugin install /absolute/path/to/amplifiedlabs/presend
```

### Option C — Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your platform:

```json
{
  "mcpServers": {
    "presend": {
      "command": "node",
      "args": ["/absolute/path/to/amplifiedlabs/presend/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop.

## Uninstall

### Option A — Claude Code CLI

```bash
claude mcp remove presend
```

### Option B — Claude Code plugin

```bash
/plugin uninstall presend
# optional: drop the local marketplace too
/plugin marketplace remove amplifiedlabs
```

### Option C — Claude Desktop

Remove the `presend` entry from `claude_desktop_config.json` and restart.

### Profiles cleanup (optional)

Profiles live outside the repo and survive uninstall. To wipe them:

```bash
rm -rf ~/.presend
```

## Usage

Once installed, just talk to your assistant:

> *"Check this email before I send it. Mode: email. Profile: boss-joao."*
> ```
> Olá João, vou tratar do relatório Q3 em breve, não te preocupes.
> ```

Your assistant calls `check_message` and renders:

**SCORE: 4.5/10** — Mode: Email → João

| Level | Flag | Detail |
|---|---|---|
| 🔴 | DISMISSIVE_TONE | "não te preocupes" pode soar condescendente para um chefe stressado |
| 🔴 | IMPLIED_COMMITMENT | "vou tratar" é promessa firme sem âmbito |
| 🟡 | AMBIGUITY | "em breve" não dá prazo |
| ✅ | BREVITY | curto, alinha com a preferência do João |

**Summary:** Tom dispensa-te, prazo vago — define data e remove a tranquilização.

💡 Want a corrected version? Ask: fix_message

Then:

> *"Apply those flags."*

Your assistant calls `fix_message` and prints the rewrite.

### Profile lifecycle example

> *"Save a presend profile: id boss-joao, name 'João (chefe)', direct/terse style, prefers bullets, dislikes long emails, sensitive to tone when stressed, language pt."*
> *"List my presend profiles."*
> *"Delete the boss-joao profile."*

## Security

- No API keys handled by the server. No outbound network calls. Analysis runs inside the host LLM you're already talking to.
- Profiles are stored locally at `~/.presend/profiles.json`. They never leave your machine except as part of the prompt your assistant generates.
- `.env` / `.env.*` are listed in `.claudeignore` and `.gitignore` as a precaution. The server reads no env vars.

## Development

```bash
npm install
npm run build
node dist/index.js   # stdio MCP server, talks JSON-RPC over stdin/stdout
```

To iterate locally:

```bash
npm run dev          # tsc --watch
pkill -f "presend/dist/index.js"   # force MCP client to respawn with new dist
```

## Stack

TypeScript · `@modelcontextprotocol/sdk` · stdio transport · zero deps beyond MCP.

## Status

🧪 Lab experiment. Used internally before sending tricky replies. PRs welcome for new modes and check categories.

## License

MIT.
