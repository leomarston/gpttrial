import ngrok from 'ngrok';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const run = async () => {
  try {
    const url = await ngrok.connect({
      addr: port,
      authtoken: process.env.NGROK_AUTHTOKEN,
      proto: 'http'
    });

    console.log(`ngrok tunnel established: ${url}`);
    console.log(`Local server forwarding: http://localhost:${port}`);
    console.log(`MCP endpoint: ${url.replace(/\/$/, '')}/mcp`);
  } catch (error) {
    console.error('Failed to start ngrok tunnel', error);
    process.exit(1);
  }
};

run();
