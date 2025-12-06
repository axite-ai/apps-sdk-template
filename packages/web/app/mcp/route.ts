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
  try {
    // Extract base URL by removing /mcp suffix if present
    const baseUrl = MCP_SERVER_URL.replace(/\/mcp$/, "");

    // Check if the actual MCP server is reachable
    const healthCheck = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (healthCheck.ok) {
      const serverStatus = await healthCheck.json();
      return Response.json({
        status: "healthy",
        proxy: "active",
        server: serverStatus,
        timestamp: new Date().toISOString(),
      });
    } else {
      return Response.json(
        {
          status: "degraded",
          proxy: "active",
          server: "unreachable",
          serverStatus: healthCheck.status,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return Response.json(
      {
        status: "unhealthy",
        proxy: "active",
        server: "down",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
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
