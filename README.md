# NervShell

An AI-powered shell agent that gives a large language model direct access to your machine's command line. Send natural language instructions over HTTP and let the agent figure out the commands.

Built with Node.js, OpenRouter, Express, and Zod.

## How It Works

1. You send a message to the `/message` endpoint in plain English.
2. The AI decides which shell commands to run to fulfill your request.
3. Commands are executed on the host machine, and results are fed back to the AI.
4. The AI interprets the output and responds, or runs follow-up commands if needed.
5. Conversation history is maintained across requests for multi-turn interactions.

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set your OpenRouter API key (get one free at https://openrouter.ai/keys)
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes | - | Your OpenRouter API key (free tier available) |
| `OPENROUTER_MODEL` | No | `google/gemini-2.0-flash-exp:free` | Model to use |
| `PORT` | No | `3000` | Server port |

## Usage

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

### API Endpoints

#### `POST /message` - Send a message to the agent

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"message": "list all files in the current directory"}'
```

#### `GET /history` - View conversation history

```bash
curl http://localhost:3000/history
```

#### `POST /clear` - Clear conversation history

```bash
curl -X POST http://localhost:3000/clear
```

#### `GET /health` - Health check

```bash
curl http://localhost:3000/health
```

## Project Structure

```
src/
  index.ts   - Express server and route handlers
  agent.ts   - AI agent with OpenRouter integration, Zod validation, message history
  tools.ts   - Tool definitions and shell command execution
```

## Extending

New tools can be added by:

1. Defining the tool schema in `toolDefinitions` inside `src/tools.ts`
2. Implementing the handler function
3. Adding a case to the `runTool` switch

The agent loop automatically handles multi-step tool calls, so new tools work with the existing conversation flow without changes to `agent.ts`.

## Security Notice

This agent executes arbitrary shell commands on the host machine. Run it only in trusted environments or sandboxed containers. Do not expose the server to the public internet without authentication.

## License

ISC
