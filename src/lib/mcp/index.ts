import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listEventsTool from "./tools/list-events";
import getEventTool from "./tools/get-event";
import createEventDraftTool from "./tools/create-event-draft";
import changeEventStatusTool from "./tools/change-event-status";
import listMyRegistrationsTool from "./tools/list-my-registrations";

// The OAuth issuer MUST be the direct Supabase host — the .lovable.cloud proxy
// publishes the direct supabase.co issuer in its discovery document and mcp-js
// rejects mismatches (RFC 8414). VITE_SUPABASE_PROJECT_ID is inlined by Vite
// at build time; the fallback keeps the URL well-formed during the throwaway
// manifest-extract eval — no real token will ever verify against the sentinel.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "utsav-mcp",
  title: "Utsav",
  version: "0.1.0",
  instructions:
    "Utsav is an event management platform. These tools read and modify events, registrations, and roles for the signed-in user. All calls are scoped by the user's Utsav role and RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listEventsTool,
    getEventTool,
    createEventDraftTool,
    changeEventStatusTool,
    listMyRegistrationsTool,
  ],
});
