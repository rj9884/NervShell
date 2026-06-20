<img width="2850" height="1558" alt="landing" src="https://github.com/user-attachments/assets/b75c36ea-f884-430f-b8b4-42601e7eb37b" />

# NervShell: Personal AI Workspace Assistant

An autonomous, local AI assistant dashboard designed to translate natural language instructions into safe workspace actions, directory manipulation, and verified system command execution. Built using Node.js, Express, Vite, Tailwind CSS (v4), and OpenRouter APIs.

---

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Core Features](#core-features)
- [Project Directory Structure](#project-directory-structure)
- [API Reference](#api-reference)
  - [Sessions API](#sessions-api)
  - [Workspace & Diagnostics API](#workspace--diagnostics-api)
  - [Agent Execution API](#agent-execution-api)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Security Guidelines](#security-guidelines)

---

## Introduction

NervShell provides developers and system administrators with a technical workspace companion. By connecting natural language processing to sandboxed workspace tools, the application offers an alternative to executing raw terminal instructions manually, maintaining a secure verification loop before any CLI action takes place.

---

<img width="2880" height="1550" alt="chat" src="https://github.com/user-attachments/assets/c31c1b9c-00de-4b2c-91fe-e03db9f7ac1c" />

---

## Architecture Overview

The system divides responsibilities between a client dashboard, a REST API server, and an AI reasoning agent coordinating local tools:

```
┌──────────────────────┐      REST API      ┌────────────────────┐      API       ┌─────────────────┐
│  Browser Dashboard   │ ◄────────────────► │   Express Server   │ ◄────────────► │   OpenRouter    │
│  (Landing & Console) │                    │     (Node.js)      │                │  (Gemini/LLaMA) │
└──────────────────────┘                    └─────────┬──────────┘                └─────────────────┘
                                                      │
                                                      │ Path Scans & CLI Executes
                                                      ▼
                                           ┌─────────────────────┐
                                           │ Workspace Engine    │
                                           │ (File Tree / Shell) │
                                           └─────────────────────┘
```

---

## Core Features

- **Interactive Workspace Explorer**: A file explorer sidebar rendering directories dynamically, allowing live inspections of repository contents.
- **Host OS Connection Switch**: A sidebar toggle allowing the user to select the assistant's boundaries:
  - *Disconnected Mode*: The assistant is restricted to reading, writing, and listing files inside the local repository.
  - *Connected Mode*: Boundaries expand relative to the user's home directory (~), permitting system-wide directory scans.
- **System Telemetry Monitoring**: Periodic background polling capturing active CPU load, CPU cores, RAM allocation metrics, platform OS description, and system uptime.
- **Safe Mode Interruption (Enabled by Default)**: Terminal command proposals halt execution and trigger a high-contrast confirmation warning panel. Command executions require explicit user authorization before launching.
- **Multi-Session Conversation persistence**: In-memory and file-based session manager storing history logs in a local JSON database across server restarts.
- **Custom Markdown Translator**: Client-side parser translating headers, bold/italic markup, inline codes, code blocks with copy utilities, lists, and HTML tables.

---

## Project Directory Structure

```
.
├── src/
│   ├── server/
│   │   ├── index.ts     # Express server setup, API routers, and telemetry polling
│   │   ├── agent.ts     # LLM coordinator, conversation storage, and Safe Mode approval loop
│   │   ├── tools.ts     # Tool definitions (executeCommand, readFile, writeFile, listFiles)
│   │   └── session.ts   # Session persistence manager storing logs in .sessions.json
│   │
│   └── client/
│       ├── app.ts       # Application state coordinator and view toggles
│       ├── types.ts     # Typescript type definitions
│       ├── components/
│       │   ├── Chat.ts  # Render bubbles, loading indicators, and approval panels
│       │   ├── Sidebar.ts# Manage session selections, safe mode state, and engine selection
│       │   └── Workspace.ts # Workspace directory scans and telemetry gauge renderers
│       └── utils/
│           └── markdown.ts # Fenced blocks, tables, and link markdown compiler
│
├── public/              # Favicon assets, global images, and site manifests
├── index.html           # Landing page markup and dashboard grid structures
├── package.json         # Project script parameters and dependencies
├── vite.config.ts       # Proxy routing settings and watch exclusions
└── tsconfig.json        # TypeScript compiler configurations
```

---

## API Reference

### Sessions API

#### GET /api/sessions
Returns a list of saved conversation summaries.

#### POST /api/sessions
Creates a new conversation session.
- Request Body: `{ id?: string, title?: string }`

#### DELETE /api/sessions/:id
Deletes target conversation session files.

---

### Workspace & Diagnostics API

#### GET /api/workspace
Returns directory node listings. Adapts automatically to scan home directories when System OS connection is active.

#### GET /api/system
Obtains CPU cores, active loads, RAM stats, platform details, and uptime.

#### POST /api/settings
Updates settings configurations or connects/disconnects System OS toggles.
- Request Body: `{ model?: string, systemConnected?: boolean }`

---

### Agent Execution API

#### POST /message
Submits user message query to the agent loop.
- Request Body: `{ message: string, sessionId: string, safeMode: boolean }`
- Interrupted Response: `{ status: "awaiting_approval", toolCall: { id, name, command } }`
- Completed Response: `{ response: string }`

#### POST /api/approve
Approves or rejects pending shell executions.
- Request Body: `{ sessionId: string, toolCallId: string, approved: boolean, command: string, safeMode: boolean }`
- Response: `{ response: string }`

#### GET /history
Obtains conversation messages.
- Query Parameter: `sessionId`

#### POST /clear
Clears session message history logs.
- Request Body: `{ sessionId: string }`

---

## Setup and Installation

### Prerequisites
- Node.js 18 or higher
- OpenRouter API Key (retrieve a free key at [openrouter.ai](https://openrouter.ai))

### Configuration
1. Initialize directory dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and configure your API key:
   ```env
   OPENROUTER_API_KEY=your_key_here
   ```

### Running the Application
- **Development Mode**: Runs Vite and Express servers concurrently with hot-reloading:
  ```bash
  npm run dev
  ```
  Access the client dashboard at `http://localhost:5173`.

- **Production Mode**: Compiles TypeScript backend and Vite client bundles:
  ```bash
  npm run build
  npm start
  ```
  Access the server port at `http://localhost:3000`.

- **Vercel Deployment**:
  1. Go to the Vercel dashboard and click **New Project**.
  2. Select and import your `NervShell` repository.
  3. In the project settings configuration:
     - **Framework Preset**: Choose **Vite** or **Other**.
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist/client`
  4. Configure your environment variables in Vercel:
     - Add `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`).
  5. Deploy. Vercel automatically deploys the static frontend from `dist/client` and builds the serverless API functions located in the `/api` directory.

---

## Security Guidelines

1. **Path Scopes**: Path inputs are resolved relative to strict root directories. When disconnected, any relative path resolving outside of the repository boundary throws an access denial exception.
2. **Safe Mode Default**: Command executions remain blocked until authorized inside the client confirmation decider panel.
3. **API Keys**: Do not commit the `.env` configuration file to source control. Keep keys secure.
