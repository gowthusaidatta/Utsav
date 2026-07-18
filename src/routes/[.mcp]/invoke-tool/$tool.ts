// To take ownership, delete this banner line; the plugin then leaves the file alone.
// route: /.mcp/invoke-tool/$tool
// emitted to: src/routes/[.mcp]/invoke-tool/$tool.ts

import { createFileRoute } from "@tanstack/react-router";

import {
  createTanStackInvokeToolHandler,
  type TanStackInvokeToolHandler,
} from "@lovable.dev/mcp-js/stacks/tanstack";

const mcpOptions = {
  resourcePath: "/mcp",
  metadataPath: "/.well-known/oauth-protected-resource",
  trustForwardedHost: true,
};

let handlerPromise: Promise<TanStackInvokeToolHandler> | undefined;

async function getInvokeToolHandler() {
  handlerPromise ??= import("../../../lib/mcp/index").then(({ default: mcp }) =>
    createTanStackInvokeToolHandler(mcp, mcpOptions),
  );
  return handlerPromise;
}

export const Route = createFileRoute("/.mcp/invoke-tool/$tool")({
  server: {
    handlers: {
      // ANY: TanStack returns SPA HTML for methods not in `handlers`; the SDK 405s instead.
      ANY: async (ctx: Parameters<TanStackInvokeToolHandler>[0]) =>
        (await getInvokeToolHandler())(ctx),
    },
  },
});
