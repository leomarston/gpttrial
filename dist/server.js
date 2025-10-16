import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.resolve(__dirname, '../public');
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
if (!ALPHA_VANTAGE_API_KEY) {
    console.warn('ALPHA_VANTAGE_API_KEY is not set. The topMovers tool will fail until you provide a valid API key.');
}
const toolInputShape = {
    limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
};
const instrumentSchema = z.object({
    ticker: z.string(),
    price: z.number(),
    changeAmount: z.number(),
    changePercentage: z.number(),
    volume: z.number()
});
const toolOutputShape = {
    source: z.literal('Alpha Vantage TOP_GAINERS_LOSERS'),
    lastUpdated: z.string().nullable(),
    topGainers: z.array(instrumentSchema),
    topLosers: z.array(instrumentSchema),
    mostActivelyTraded: z.array(instrumentSchema)
};
const toolInputParser = z.object(toolInputShape);
const toolOutputParser = z.object(toolOutputShape);
const server = new McpServer({
    name: 'stocksgpt',
    version: '1.0.0'
});
const app = express();
app.use(express.json());
app.use(express.static(staticDir));
const parseNumeric = (value) => {
    if (!value) {
        return 0;
    }
    const cleaned = value.replace(/[%,$]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeList = (entries, limit) => {
    return entries
        .slice(0, limit)
        .map((item) => (item ?? {}))
        .map((item) => ({
        ticker: item.ticker ?? 'N/A',
        price: parseNumeric(item.price),
        changeAmount: parseNumeric(item.change_amount),
        changePercentage: parseNumeric(item.change_percentage),
        volume: parseNumeric(item.volume)
    }));
};
const fetchTopMovers = async (rawInput) => {
    if (!ALPHA_VANTAGE_API_KEY) {
        throw new Error('Missing Alpha Vantage API key. Set ALPHA_VANTAGE_API_KEY before calling the topMovers tool.');
    }
    const { limit } = toolInputParser.parse(rawInput ?? {});
    const normalizedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'TOP_GAINERS_LOSERS');
    url.searchParams.set('apikey', ALPHA_VANTAGE_API_KEY);
    const response = await fetch(url);
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Alpha Vantage request failed with status ${response.status}: ${body.substring(0, 200)}`);
    }
    const payload = (await response.json());
    const topGainers = Array.isArray(payload.top_gainers) ? payload.top_gainers : [];
    const topLosers = Array.isArray(payload.top_losers) ? payload.top_losers : [];
    const mostActive = Array.isArray(payload.top_most_actively_traded)
        ? payload.top_most_actively_traded
        : [];
    const output = {
        source: 'Alpha Vantage TOP_GAINERS_LOSERS',
        lastUpdated: typeof payload.last_updated === 'string' ? payload.last_updated : null,
        topGainers: normalizeList(topGainers, normalizedLimit),
        topLosers: normalizeList(topLosers, normalizedLimit),
        mostActivelyTraded: normalizeList(mostActive, normalizedLimit)
    };
    return toolOutputParser.parse(output);
};
server.registerTool('topMovers', {
    title: 'Alpha Vantage Top Movers',
    description: 'Fetch top gainers, losers, and most actively traded US equities.',
    inputSchema: toolInputShape,
    outputSchema: toolOutputShape
}, async (args) => {
    const data = await fetchTopMovers(args);
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(data, null, 2)
            }
        ],
        structuredContent: data
    };
});
app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });
    res.on('close', () => {
        transport.close();
    });
    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('MCP request failed', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal MCP server error' });
        }
    }
});
app.get('/api/top-movers', async (req, res) => {
    const limitValue = req.query.limit;
    const limitCandidate = typeof limitValue === 'string'
        ? limitValue
        : Array.isArray(limitValue)
            ? String(limitValue[0])
            : undefined;
    const limitParam = Number.parseInt(limitCandidate ?? `${DEFAULT_LIMIT}`, 10);
    const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
        : DEFAULT_LIMIT;
    try {
        const payload = await fetchTopMovers({ limit });
        res.json(payload);
    }
    catch (error) {
        console.error('REST top movers request failed', error);
        res.status(500).json({ error: error.message });
    }
});
app.use((req, res, next) => {
    if (req.method !== 'GET') {
        return next();
    }
    res.sendFile(path.join(staticDir, 'index.html'));
});
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
app
    .listen(port, () => {
    console.log(`StocksGPT server listening on http://localhost:${port}`);
    console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
})
    .on('error', (error) => {
    console.error('Failed to start server', error);
    process.exit(1);
});
