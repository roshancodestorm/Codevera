import http from 'http';

const TOOLS = [
  {
    name: 'calc_add',
    description: 'Add two numbers and return the sum.',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
      required: ['a', 'b'],
    },
  },
  {
    name: 'calc_multiply',
    description: 'Multiply two numbers and return the product.',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
      required: ['a', 'b'],
    },
  },
  {
    name: 'stock_quote',
    description: 'Return a deterministic fake stock quote for a ticker symbol.',
    inputSchema: {
      type: 'object',
      properties: { ticker: { type: 'string' } },
      required: ['ticker'],
    },
  },
];

function json(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function error(id, message) {
  return { jsonrpc: '2.0', id, error: { code: -32603, message } };
}

function handleCall(id, params) {
  const name = params?.name;
  const args = params?.arguments || {};

  if (name === 'calc_add') {
    const a = Number(args.a);
    const b = Number(args.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return error(id, 'a and b must be numbers');
    return json(id, { content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }] });
  }
  if (name === 'calc_multiply') {
    const a = Number(args.a);
    const b = Number(args.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return error(id, 'a and b must be numbers');
    return json(id, { content: [{ type: 'text', text: `${a} * ${b} = ${a * b}` }] });
  }
  if (name === 'stock_quote') {
    const ticker = String(args.ticker || '').toUpperCase();
    const seed = ticker.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const price = (100 + (seed % 9000) / 100).toFixed(2);
    const change = (((seed * 7) % 41) - 20) / 10;
    return json(id, { content: [{ type: 'text', text: `${ticker}: $${price} (${change >= 0 ? '+' : ''}${change.toFixed(1)}%)` }] });
  }
  return error(id, `Unknown tool: ${name}`);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400).end('invalid JSON');
      return;
    }

    let reply;
    if (payload.method === 'initialize') {
      reply = json(payload.id, {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'demo-mcp', version: '1.0.0' },
      });
    } else if (payload.method === 'notifications/initialized') {
      res.writeHead(202).end();
      return;
    } else if (payload.method === 'tools/list') {
      reply = json(payload.id, { tools: TOOLS });
    } else if (payload.method === 'tools/call') {
      reply = handleCall(payload.id, payload.params);
    } else {
      reply = error(payload.id, `Unsupported method: ${payload.method}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'demo-session-1' });
    res.end(JSON.stringify(reply));
  });
});

const PORT = Number(process.env.PORT || 4010);
server.listen(PORT, () => {
  console.log(`Demo MCP server listening on http://localhost:${PORT}`);
});
