// To take ownership, delete this banner line; the plugin then leaves the file alone.
// route: /.mcp/list-tools
// emitted to: src/routes/[.mcp]/list-tools.ts

import { createFileRoute } from "@tanstack/react-router";

import {
  createTanStackListToolsHandler,
  type TanStackListToolsHandler,
} from "@lovable.dev/mcp-js/stacks/tanstack";

const mcpOptions = {
  resourcePath: "/mcp",
  metadataPath: "/.well-known/oauth-protected-resource",
  trustForwardedHost: true,
};

let handlerPromise: Promise<TanStackListToolsHandler> | undefined;

async function getListToolsHandler() {
  handlerPromise ??= import("../../lib/mcp/index").then(({ default: mcp }) =>
    createTanStackListToolsHandler(mcp, mcpOptions),
  );
  return handlerPromise;
}

export const Route = createFileRoute("/.mcp/list-tools")({
  server: {
    handlers: {
      // ANY: TanStack returns SPA HTML for methods not in `handlers`; the SDK 405s instead.
      ANY: async (ctx: Parameters<TanStackListToolsHandler>[0]) =>
        (await getListToolsHandler())(ctx),
    },
  },
});
