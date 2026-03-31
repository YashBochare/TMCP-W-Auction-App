# Epic List

**Epic 1: Foundation & Core Infrastructure**
Establish the project monorepo, database schema, authentication/access codes for roles, and the foundational WebSocket server to handle real-time connections.

**Epic 2: Event Preparation & Data Ingestion**
Build the Admin Setup interface allowing the Auctioneer to configure team details, set baseline rules (100k purse, 7 players), and parse the Excel file upload to populate the player database.

**Epic 3: The Live Auction Engine (Core State & Constraints)**
Implement the central server-side auction state machine. This includes the constraint math engine (preventing invalid bids), the 20-second timer logic, and the core flow of Proposed Bids -> Auctioneer Acceptance -> Hammer/Sold.

**Epic 4: Role-Based Real-Time Interfaces**
Develop the specific UI views: the Captain's mobile bidding screen, the public Viewer broadcast display, and the Auctioneer's control dashboard, wiring them all into the live WebSocket events for sub-500ms updates.

**Epic 5: Advanced Controls & Edge Cases**
Implement the crucial "safety net" features for the live event: Undo last action, pause/restart, manual bid placement by the Auctioneer, editing player details on the fly, and handling/recalling unsold players.

---
