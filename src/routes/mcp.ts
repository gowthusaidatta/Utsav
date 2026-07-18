// To take ownership, delete this banner line; the plugin then leaves the file alone.
// route: /mcp
// emitted to: src/routes/mcp.ts

import { createFileRoute } from "@tanstack/react-router";

import {
  createTanStackMcpHandler,
  type TanStackMcpHandler,
} from "@lovable.dev/mcp-js/stacks/tanstack";

const mcpOptions = {
  resourcePath: "/mcp",
  metadataPath: "/.well-known/oauth-protected-resource",
  trustForwardedHost: true,
};

let handlerPromise: Promise<TanStackMcpHandler> | undefined;

async function getMcpHandler() {
  handlerPromise ??= import("../lib/mcp/index").then(({ default: mcp }) =>
    createTanStackMcpHandler(mcp, mcpOptions),
  );
  return handlerPromise;
}

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      ANY: async (ctx: Parameters<TanStackMcpHandler>[0]) => (await getMcpHandler())(ctx),
    },
  },
});
