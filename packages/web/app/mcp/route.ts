/**
 * MCP Proxy Route
 *
 * Forwards MCP requests to the standalone MCP server.
 * This allows the Next.js app to serve as a unified endpoint
 * while the actual MCP logic runs in the server package.
 */

import { NextRequest } from "next/server";

// Expects the FULL URL to the MCP endpoint (e.g. http://localhost:3001/mcp)
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001/mcp";

export async function GET(request: NextRequest) {
  return Response.json({
    status: "active",
    service: "MCP GPT Proxy",
    timestamp: new Date().toISOString(),
  });
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Prepare Headers for Upstream Request
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    const auth = request.headers.get("Authorization");
    if (auth) {
      headers.set("Authorization", auth);
    }

    const accept = request.headers.get("Accept");
    if (accept) {
      headers.set("Accept", accept);
    }

    // 2. Forward Request to Upstream MCP Server
    const response = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: headers,
      body: await request.text(),
    });

    // 3. Prepare Headers for Downstream Response (to Client)
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Forward critical headers for Auth and Content-Type
      if (["content-type", "www-authenticate"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // 4. Return Response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[MCP Proxy] Failed to forward request:", error);

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "MCP server unavailable",
        },
        id: null,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
