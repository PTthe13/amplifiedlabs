#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { analyze, formatAnalysis, rewrite } from "./checker.js";
import {
  listProfiles,
  upsertProfile,
  deleteProfile,
  getProfile,
  formatProfileList,
} from "./profiles.js";
import { Mode, MODES } from "./modes.js";

const MODE_VALUES = Object.keys(MODES) as Mode[];

const server = new Server(
  { name: "presend", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "check_message",
      description:
        "Analyze a message before sending. Returns a score, red/yellow/green flags, and a one-line summary. Use this when the user says they're about to send an email, post, proposal, or feedback and wants a sanity check.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The message to check." },
          mode: {
            type: "string",
            enum: MODE_VALUES,
            description: "Communication mode.",
          },
          context: {
            type: "string",
            description:
              "Optional free-text context: who the recipient is, the situation, the goal.",
          },
          profile_id: {
            type: "string",
            description: "Optional saved profile id (use list_profiles to see).",
          },
        },
        required: ["text", "mode"],
      },
    },
    {
      name: "fix_message",
      description:
        "Apply check_message flags and return a corrected version of the message.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Original message." },
          flags: {
            type: "string",
            description: "Flags / issues to address (paste from check_message).",
          },
          mode: { type: "string", enum: MODE_VALUES },
          context: { type: "string" },
          profile_id: { type: "string" },
        },
        required: ["text", "flags", "mode"],
      },
    },
    {
      name: "save_profile",
      description:
        "Create or update a communication profile describing a recipient (boss, client, etc.) and how they prefer to be communicated with.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Slug identifier, e.g. 'boss-joao'.",
          },
          name: { type: "string", description: "Display name." },
          description: {
            type: "string",
            description:
              "Free text: who they are, relationship, communication style, sensitivities.",
          },
          language: {
            type: "string",
            description: "Optional default language code (e.g. 'pt', 'en').",
          },
        },
        required: ["id", "name", "description"],
      },
    },
    {
      name: "list_profiles",
      description: "List all saved communication profiles.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "delete_profile",
      description: "Delete a saved profile by id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  ],
}));

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    switch (name) {
      case "check_message": {
        const text = String(args.text ?? "");
        const mode = String(args.mode ?? "") as Mode;
        if (!text) return errorResult("text is required");
        if (!MODE_VALUES.includes(mode)) return errorResult(`mode must be one of: ${MODE_VALUES.join(", ")}`);
        const ctx = args.context ? String(args.context) : undefined;
        const pid = args.profile_id ? String(args.profile_id) : undefined;
        const analysis = await analyze({ text, mode, context: ctx, profile_id: pid });
        const profile = pid ? getProfile(pid) : undefined;
        return textResult(formatAnalysis(analysis, mode, profile));
      }
      case "fix_message": {
        const text = String(args.text ?? "");
        const flags = String(args.flags ?? "");
        const mode = String(args.mode ?? "") as Mode;
        if (!text || !flags) return errorResult("text and flags are required");
        if (!MODE_VALUES.includes(mode)) return errorResult(`mode must be one of: ${MODE_VALUES.join(", ")}`);
        const ctx = args.context ? String(args.context) : undefined;
        const pid = args.profile_id ? String(args.profile_id) : undefined;
        const fixed = await rewrite({ text, flags, mode, context: ctx, profile_id: pid });
        return textResult(fixed);
      }
      case "save_profile": {
        const id = String(args.id ?? "");
        const dispName = String(args.name ?? "");
        const description = String(args.description ?? "");
        if (!id || !dispName || !description) {
          return errorResult("id, name, and description are required");
        }
        const language = args.language ? String(args.language) : undefined;
        const saved = upsertProfile({ id, name: dispName, description, language });
        return textResult(`Saved profile: ${saved.id} (${saved.name})`);
      }
      case "list_profiles": {
        return textResult(formatProfileList(listProfiles()));
      }
      case "delete_profile": {
        const id = String(args.id ?? "");
        if (!id) return errorResult("id is required");
        const ok = deleteProfile(id);
        return textResult(ok ? `Deleted profile: ${id}` : `No profile with id: ${id}`);
      }
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(msg);
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("presend fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
