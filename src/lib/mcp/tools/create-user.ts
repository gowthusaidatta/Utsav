import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated, ok, notImplemented } from "../lib/supabase";

export default defineTool({
  name: "create_user",
  title: "Create user",
  description: "Utsav uses email/Google sign-up flows for account creation; MCP does not create user accounts. Use invite_member to add existing users to organizations.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_i, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    void supabaseForUser; void ok;
    return notImplemented("User accounts are self-service via the Utsav sign-up flow. MCP cannot mint new accounts. Use invite_member / assign_role for existing users.");
  },
});
