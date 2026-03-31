# Technical Assumptions

## Repository Structure: Monorepo
A Monorepo is highly recommended here. Because the Auctioneer, Captain, and Viewer interfaces must perfectly sync the exact same data structures over WebSockets, sharing TypeScript types/interfaces across the frontend and backend in a single repository will prevent a massive class of bugs and ensure rapid development.

## Service Architecture: Monolith with Stateful WebSockets
Given the scale (~40 concurrent users) and the need for ultra-low latency (< 500ms), a distributed microservices architecture would add unnecessary complexity and latency. A robust Node.js monolith maintaining a stateful WebSocket connection pool (using Socket.io or similar) is ideal. The server will act as the absolute source of truth, queuing incoming bids and broadcasting accepted states.

## Testing Requirements: Unit + E2E for Critical Paths
- **Unit Testing:** Mandatory for the "Constraint Engine" (the math that ensures a captain cannot bid more than their allowed maximum while reserving funds for remaining squad slots).
- **E2E Testing:** Critical for the bidding flow (Captain proposes bid -> Server queues it -> Auctioneer accepts -> Server broadcasts -> All screens update).

## Additional Technical Assumptions and Requests
- **Data Persistence:** While the event is live and fast-paced, the state must be backed by a database (e.g., PostgreSQL or SQLite) rather than just in-memory. If the server restarts or the Auctioneer loses connection, the auction state (purses, squads, current player) must be instantly recoverable.
- **Data Ingestion:** The Excel upload parsing will be handled entirely on the backend to sanitize inputs and populate the database before the event begins.

---
