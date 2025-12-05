import http from 'http';

const server = http.createServer((req, res) => {
  console.log(`[Mock] Received ${req.method} ${req.url}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/mcp') {
    // Check for Authorization Header
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // SIMULATE OAUTH CHALLENGE
      // This is the critical part your proxy must forward
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="mock-realm", error="invalid_token", error_description="The access token is missing"'
      });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: 401, message: "Unauthorized" },
        id: null
      }));
      console.log('[Mock] Returned 401 Unauthorized with WWW-Authenticate header');
    } else {
      // SIMULATE SUCCESS
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        result: { content: [{ type: "text", text: "You are authenticated!" }] },
        id: 1
      }));
      console.log('[Mock] Returned 200 OK (Authenticated)');
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3001, () => {
  console.log('Mock MCP Server running on http://localhost:3001');
});
