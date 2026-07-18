// To take ownership, delete this banner line; the plugin then leaves the file alone.
// route: /.well-known/oauth-protected-resource
// emitted to: src/routes/[.well-known]/oauth-protected-resource.ts

import { createFileRoute } from "@tanstack/react-router";

import {
  createTanStackOAuthProtectedResourceMetadataHandler,
  type TanStackOAuthProtectedResourceMetadataHandler,
} from "@lovable.dev/mcp-js/stacks/tanstack";

const mcpOptions = {
  resourcePath: "/mcp",
  metadataPath: "/.well-known/oauth-protected-resource",
  trustForwardedHost: true,
};

let handlerPromise: Promise<TanStackOAuthProtectedResourceMetadataHandler> | undefined;

async function getOAuthProtectedResourceMetadataHandler() {
  handlerPromise ??= import("../../lib/mcp/index").then(({ default: mcp }) =>
    createTanStackOAuthProtectedResourceMetadataHandler(mcp, mcpOptions),
  );
  return handlerPromise;
}

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      ANY: async (ctx: Parameters<TanStackOAuthProtectedResourceMetadataHandler>[0]) =>
        (await getOAuthProtectedResourceMetadataHandler())(ctx),
    },
  },
});
