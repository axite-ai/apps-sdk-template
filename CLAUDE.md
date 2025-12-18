# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Axite MCP Template** is a production-ready starter template for building ChatGPT MCP applications using **Next.js 15**, **Skybridge**, and **Better Auth**.

It is designed to be **Type-Safe End-to-End**:
- Backend tools define their shape via `AppType`.
- Frontend widgets import these types for full autocomplete.
- Skybridge provides SSR-compatible hooks for widget development.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (with Turbopack)
pnpm dev

# Production build
pnpm build

# Type checking (CRITICAL: Run this often)
pnpm typecheck

# Database operations
pnpm db:push         # Push schema to database
pnpm db:studio       # Launch Drizzle Studio GUI
```

## Architecture

### 1. MCP Server (`app/[transport]/route.ts`)

- **mcp-handler**: Uses `createMcpHandler()` with Better Auth OAuth.
- **Tool Registration**: Register tools with `server.registerTool()` and resources with `server.resource()`.
- **AppType Export**: Exports `type AppType` for frontend type inference.

**Adding a Tool:**

```typescript
// app/[transport]/route.ts
server.registerTool(
  "tool_name",
  {
    title: "Tool Title",
    description: "Tool description",
    inputSchema: { name: z.string().optional() },
    annotations: { readOnlyHint: true }, // Mark as read-only if applicable
    _meta: {
      "openai/outputTemplate": "ui://widget/tool_name.html",
      "openai/toolInvocation/invoking": "Running...",
      "openai/toolInvocation/invoked": "Complete",
      "openai/widgetAccessible": true, // Allow widget to call tools
    },
  },
  async (args) => {
    return {
      content: [{ type: "text", text: "Hello!" }],
      structuredContent: { greeting: "Hello", name: args.name },
    };
  }
);
```

### 2. Frontend Widgets (`app/widgets/*` & `src/components/*`)

- **Pages**: `app/widgets/my-widget/page.tsx` renders the widget component.
- **Components**: `src/components/my-widget/index.tsx` contains the logic.
- **Layout**: `app/widgets/layout.tsx` prevents SSR (required for Skybridge).
- **Hooks**: **ALWAYS** import from `@/src/skybridge` (not `skybridge/web` directly).

**Widget Pattern:**

```tsx
"use client";
import { useToolInfo } from "@/src/skybridge";
import type { MyContentType } from "@/lib/types/tool-responses";

export default function MyWidget() {
  const { output } = useToolInfo();
  const data = output as { structuredContent: MyContentType } | undefined;

  if (!data?.structuredContent) {
    return <div>Loading...</div>;
  }

  return <div>{data.structuredContent.greeting}</div>;
}
```

### 3. Widgets Layout (`app/widgets/layout.tsx`)

**CRITICAL**: This layout prevents SSR for all widgets. Skybridge hooks require browser context (`window.openai`) which isn't available during server-side rendering.

```tsx
"use client";
export default function WidgetsLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}
```

### 4. Skybridge Glue (`src/skybridge.ts`)

- **Single Source of Truth**: Re-exports Skybridge hooks for consistent imports.
- **Typed useCallTool**: Generated via `generateHelpers<AppType>()` for tool name autocomplete.
- **Available Hooks**: `useToolInfo`, `useCallTool`, `useWidgetState`, `useTheme`, `useDisplayMode`, `useSendFollowUpMessage`.

### 5. Authentication (`lib/auth/index.ts`)

- **Better Auth**: Handles OAuth 2.1 interaction with ChatGPT.
- **Stripe**: Optional subscription support via plugin.
- **Helper**: Use `requireAuth(session, "feature")` in tools to enforce login/billing.

### 6. Database (`lib/db/schema.ts`)

- **Drizzle ORM**: Type-safe database definition.
- **Migrations**: `pnpm db:push` to sync schema changes.

## Widget CSP (Content Security Policy)

Widgets run in a ChatGPT iframe with strict CSP. To load CSS/JS from your server, add your domain to the resource's `_meta`:

```typescript
"openai/widgetCSP": {
  connect_domains: [baseURL],  // For API calls
  resource_domains: [baseURL], // For CSS/JS
}
```

**Important**: Set `BASE_URL` in your `.env` to your public URL (e.g., ngrok URL for development).

## Best Practices

1. **Import from `@/src/skybridge`**: Always use this for hooks, never import from `skybridge/web` directly.
2. **Type Casting**: Cast `output` to your content type: `output as { structuredContent: MyType } | undefined`.
3. **No Magic Strings**: Tool names in `useCallTool("tool_name")` are validated against `AppType`.
4. **Bootstrap**: `app/layout.tsx` includes `<NextChatSDKBootstrap>`. Do not remove it.
5. **Feature Flags**: Use `lib/config/features.ts` to toggle optional modules like Subscriptions.
6. **Read-Only Tools**: Add `annotations: { readOnlyHint: true }` to tools that don't modify data.
7. **Widget Linking**: Add `_meta["openai/outputTemplate"]` to link tools to their widget resources.
8. **Widget Tool Access**: Add `_meta["openai/widgetAccessible"]: true` to allow widgets to call tools.
9. **CSP Configuration**: Add your domain to `resource_domains` to allow CSS/JS loading.
