# StocksGPT ChatGPT App

Minimal TypeScript ChatGPT app that exposes an MCP tool for Alpha Vantage's **TOP_GAINERS_LOSERS** feed. The app ships with an Express server, serves a responsive widget, and tunnels via ngrok for easy ChatGPT installation.

## Features
- MCP `topMovers` tool implemented with `@modelcontextprotocol/sdk`
- Express REST fallback (`/api/top-movers`) for local preview
- Responsive widget that calls `window.openai.callTool('topMovers', { limit })` on load
- Optional ngrok tunnel helper for sharing the app with ChatGPT

## Prerequisites
- Node.js 18+
- Alpha Vantage API key (`ALPHA_VANTAGE_API_KEY`)
- (Optional) ngrok account and auth token (`NGROK_AUTHTOKEN`) for tunneling

## Quick start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Export your Alpha Vantage API key (PowerShell example):
   ```powershell
   $env:ALPHA_VANTAGE_API_KEY = "your-key"
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 to preview the widget. Outside ChatGPT the page uses the REST fallback; inside ChatGPT it will call the MCP tool directly.

## MCP endpoint
- Streamable HTTP endpoint: `POST http://localhost:3000/mcp`
- Tool ID: `topMovers`
- Input arguments: `{ "limit": number }` (1–20, defaults to 5)
- Output payload: top gainers, losers, and most-active equities with last-updated timestamp

## Tunneling with ngrok
1. Set your ngrok auth token (if required):
   ```powershell
   $env:NGROK_AUTHTOKEN = "your-ngrok-token"
   ```
2. Start the server (keep it running):
   ```bash
   npm run dev
   ```
3. In another terminal, launch the tunnel:
   ```bash
   npm run tunnel
   ```
4. Copy the printed HTTPS URL. Append `/mcp` for the MCP endpoint when registering the server inside ChatGPT.

## Production build
```bash
npm run build
npm run start
```

The build output lives in `dist/`, while static assets remain in `public/`.
