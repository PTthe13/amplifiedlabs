# presend

An MCP server that answers "should I send this?" before you hit send. Scores a message, flags risky phrasing, and offers a rewrite. Works on emails, LinkedIn posts, proposals, and performance feedback.

## Stack

TypeScript · @modelcontextprotocol/sdk · @anthropic-ai/sdk · stdio transport

## Prerequisites

- Node.js 18+
- An Anthropic API key

## Install

```bash
npx presend
```

or globally:

```bash
npm install -g presend
```

## Configure

Set `ANTHROPIC_API_KEY` in your environment, or drop it in a `.env` next to the install:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your platform:

```json
{
  "mcpServers": {
    "presend": {
      "command": "npx",
      "args": ["presend"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Restart Claude Desktop.

## Tools

| Tool | What it does |
|---|---|
| `check_message` | Score a draft. Returns red/yellow/green flags + summary. |
| `fix_message` | Rewrite the draft applying flags from `check_message`. |
| `save_profile` | Save a recipient profile (boss, client) and their communication preferences. |
| `list_profiles` | Show saved profiles. |
| `delete_profile` | Remove a saved profile. |

Modes: `email`, `linkedin`, `proposal`, `feedback`, `general`.

## Example

> *"Check this email I'm about to send my boss: 'Hey, will sort out the Q3 report soon, don't worry.'"*

```
SCORE: 5.2/10 [Mode: Email]

🔴 IMPLIED COMMITMENT — "will sort out" reads as a firm promise without a clear scope
🟡 AMBIGUITY — "soon" gives no timeframe
🟡 TONE — "don't worry" can read dismissive to a manager
✅ Short and direct

Risk: vague commitment to a manager. Tighten the timeframe and drop the reassurance.

💡 Want a corrected version? Call: fix_message
```

## Profiles

Profiles live at `~/.presend/profiles.json`. Use them to capture how a specific recipient prefers to be communicated with — direct/diplomatic, bullets/prose, formal/casual — so the checker grades against their wiring, not a generic ideal.

```
save_profile id=boss-joao name="João (my boss)" description="Direct, dislikes long emails, prefers bullet points, sensitive to tone when stressed" language=pt
```

Then pass `profile_id: "boss-joao"` to `check_message`.

## Security

- `.env` and `.env.*` are listed in `.claudeignore` and `.gitignore`.
- The API key is never logged.
- The only outbound call is to the Anthropic API.
- Profiles are stored locally in your home directory — nothing is sent anywhere except as part of the analysis prompt.

## Development

```bash
npm install
npm run build
node dist/index.js   # stdio MCP server — feed it via Claude Desktop or an MCP client
```

## Status

🧪 Lab experiment. Used internally before published replies. PRs welcome for new modes.

## License

MIT.
