# High Level Architecture

## Technical Summary
The application follows a **Client-Server Monolith** architectural style utilizing a **Stateful WebSocket Server**. The frontend is a React Single Page Application (SPA) built with Vite, ensuring fast rendering and minimal overhead. The backend is a dedicated Node.js/Express server running Socket.io to manage the live auction state in-memory (for sub-500ms latency) while continuously syncing to a PostgreSQL database (for durability). The monorepo structure allows the backend and frontend to share TypeScript interfaces, ensuring the Constraint Engine and UI are always perfectly aligned.

## Platform and Infrastructure Choice
**Platform:** Vercel (Frontend) + Render / Railway (Backend) + Supabase (PostgreSQL Database)
**Rationale:** Standard serverless platforms drop WebSocket connections. We need a persistent Node.js container for the backend to maintain the Socket.io connection pool. Render or Railway provides easy Docker/Node container hosting. Supabase provides a robust, managed PostgreSQL database. Vercel provides best-in-class edge caching for the static React frontend.

## Repository Structure
**Structure:** Monorepo (using npm workspaces)
**Package Organization:** 
- `apps/web`: The React/Vite frontend.
- `apps/api`: The Node.js/Express/Socket.io backend.
- `packages/shared`: Shared TypeScript interfaces, types, and constraint math utility functions.

## High Level Architecture Diagram
```mermaid
graph TD
    subgraph Clients
        C[Captain Mobile UI]
        A[Auctioneer Dashboard]
        V[Viewer Broadcast UI]
    end

    subgraph Vercel
        CDN[Frontend Static Assets]
    end

    subgraph Persistent Node.js Server
        API[Express REST API]
        WS[Socket.io Server]
        SM[In-Memory State Machine]
        CE[Constraint Engine]
    end

    subgraph Supabase
        DB[(PostgreSQL)]
    end

    C & A & V <-->|WebSocket Events| WS
    C & A <-->|HTTP Setup/Auth| API
    CDN -.->|Serves UI| Clients
    
    WS <--> SM
    SM <--> CE
    SM <-->|Periodic Sync / Finalization| DB
    API <-->|Excel Upload / Init| DB