# Epic Details

## Epic 1: Foundation & Core Infrastructure
**Epic Goal:** Establish the project monorepo, database schema, authentication using access codes, and the foundational WebSocket server. This ensures all subsequent features have a solid, real-time-capable base to build upon.

### Story 1.1 Project Scaffolding & Health Check
**As a** Developer,
**I want** the basic monorepo structure with a backend server and frontend application configured,
**so that** I have a foundational environment to build the application and deploy a basic health check.
**Acceptance Criteria:**
1. Monorepo is initialized with separate frontend and backend configurations.
2. Backend exposes a `/api/health` REST endpoint returning a 200 OK status.
3. Frontend loads a basic "System Online" placeholder page.
4. CI/CD pipeline or basic build scripts are functional without errors.

### Story 1.2 Database Schema & Models
**As a** Developer,
**I want** the database schema and ORM configured for Users, Teams, Players, and AuctionState,
**so that** application data can be persisted and retrieved reliably.
**Acceptance Criteria:**
1. Database connection is successfully established.
2. `Team` model includes fields for Name, Color Code, and Purse (default 100,000).
3. `Player` model includes Name, Photo URL, Role, Club Level, Speaking Skill, Fun Title, Base Price, and Status (Pending, Sold, Unsold).
4. `AuctionState` model tracks Current Player, Current Highest Bid, Bidding Status, and Timer.

### Story 1.3 Role-Based Access Control
**As a** System Administrator,
**I want** a simple login system using unique access codes,
**so that** Auctioneers and Captains can securely access their specific dashboards, while Viewers can access a public route.
**Acceptance Criteria:**
1. Users navigating to `/captain` are prompted for an access code.
2. Valid access codes generate a secure session (JWT or session cookie) mapping to a specific Team.
3. Users navigating to `/admin` must enter the master Auctioneer password.
4. The `/viewer` route requires no authentication.

### Story 1.4 WebSocket Infrastructure Setup
**As a** System,
**I want** a robust WebSocket server implementation,
**so that** clients can connect, subscribe to real-time events, receive updates with sub-500ms latency, and recover gracefully.
**Acceptance Criteria:**
1. Clients (Captains, Viewers, Auctioneer) successfully connect to the WebSocket server upon loading their respective pages.
2. Server maintains a registry of connected clients and their roles.
3. A basic "ping/pong" event successfully syncs between server and connected clients.
4. Client automatically fetches the latest full auction state upon WebSocket reconnection to prevent stale data.

---

## Epic 2: Event Preparation & Data Ingestion
**Epic Goal:** Build the Admin Setup interface allowing the Auctioneer to configure team details, set baseline rules, and parse the Excel file upload to automatically populate the player database.

### Story 2.1 Event & Team Configuration
**As an** Auctioneer,
**I want** to configure the number of teams, their names, access codes, and the global minimum base price,
**so that** the event rules are locked in before the auction starts.
**Acceptance Criteria:**
1. Auctioneer can create N teams (default 4), assigning a Name, access code, and minimal professional accent color (e.g., slate, gold, navy).
2. Auctioneer can set the global configuration: Starting Purse (100,000), Max Squad Size (7), and Minimum Base Price (e.g., 3,000).

### Story 2.2 Excel Player Upload
**As an** Auctioneer,
**I want** to upload an Excel file containing player details,
**so that** I don't have to manually enter 30+ participants into the system.
**Acceptance Criteria:**
1. Auctioneer can upload an `.xlsx` or `.csv` file.
2. System parses columns: Name, Role, Club Level, Speaking Skill, Fun Title, Base Price.
3. System validates data (e.g., Base Price is a valid number) and creates Player records in the database.
4. Errors in the spreadsheet are clearly reported to the Auctioneer.

### Story 2.3 Player Roster Management
**As an** Auctioneer,
**I want** to view the loaded player roster sorted by Base Price (descending),
**so that** I can verify the import and see the exact order the auction will follow.
**Acceptance Criteria:**
1. Auctioneer dashboard shows a tabular view of all loaded players.
2. Players are strictly ordered by Base Price (Highest to Lowest).
3. Auctioneer can manually edit a player's details or delete a player before the auction begins.

---

## Epic 3: The Live Auction Engine (Core State & Constraints)
**Epic Goal:** Implement the central server-side auction state machine. This includes the complex constraint math engine, the 20-second timer logic, and the core flow of Proposed Bids -> Auctioneer Acceptance -> Hammer/Sold.

### Story 3.1 Auction State Machine
**As an** Auctioneer,
**I want** to move the auction through its phases (Next Player -> Bidding Open -> Bidding Closed -> Sold/Unsold),
**so that** the system tracks exactly what is happening at any given moment.
**Acceptance Criteria:**
1. API allows transitioning state to "Next Player" (pulls highest priced pending player).
2. API allows toggling "Bidding Open" and "Bidding Closed".
3. API allows marking current player as "Sold" (assigning to team, deducting purse) or "Unsold".
4. State changes are broadcasted via WebSockets to all clients.

### Story 3.2 Constraint Math Engine
**As the** System,
**I want** to calculate the Maximum Allowed Bid for every captain continuously,
**so that** no captain can bid an amount that prevents them from filling their 7-player squad.
**Acceptance Criteria:**
1. Logic calculates Max Bid: `Current Purse - ((7 - Current Squad Size - 1) * Minimum Base Price)`.
2. API rejects any proposed bid that exceeds a team's Maximum Allowed Bid.
3. API rejects any proposed bid if the team already has 7 players.
4. Includes comprehensive unit tests validating edge cases of the constraint math.

### Story 3.3 Bid Proposal API
**As a** Captain,
**I want** to submit a proposed bid for the current player,
**so that** the Auctioneer can see my intent to buy.
**Acceptance Criteria:**
1. Captain submits a bid amount via API/WebSocket.
2. System validates the bid against the Constraint Engine (Story 3.2) and ensures it is higher than the Current Accepted Bid.
3. Valid proposed bids are queued on the server and broadcasted *only* to the Auctioneer's interface.

### Story 3.4 Bid Acceptance API
**As an** Auctioneer,
**I want** to select a proposed bid and accept it as the official current highest bid,
**so that** the auction progresses officially.
**Acceptance Criteria:**
1. Auctioneer sends an "Accept Bid" command referencing a specific proposed bid.
2. System updates the Current Highest Bid and the Leading Team in the DB.
3. System broadcasts the new Current Highest Bid to all clients (Viewers, Captains).
4. System clears older/lower proposed bids from the queue.

### Story 3.5 Server-Side Timer Logic
**As the** System,
**I want** to manage a 20-second countdown timer on the server,
**so that** all clients display a perfectly synchronized clock that resets fairly.
**Acceptance Criteria:**
1. Server ticks a timer down from 20s when Bidding is Open.
2. Timer broadcasts the current seconds remaining to all clients every 1 second.
3. Timer automatically resets to 20s immediately when the Auctioneer accepts a new bid (Story 3.4).

---

## Epic 4: Role-Based Real-Time Interfaces
**Epic Goal:** Develop the specific UI views using a minimal yet professional dark palette, wiring them all into the live WebSocket events for sub-500ms updates.

### Story 4.1 Viewer Broadcast Display
**As a** Viewer,
**I want** a large-screen optimized dashboard showing the live auction state,
**so that** I can follow the event's drama without needing to interact.
**Acceptance Criteria:**
1. UI uses a minimal dark palette (slate, professional accents).
2. Left/Center panel prominently displays the Current Player details, Photo, and the Current Accepted Bid.
3. Right panel/sidebar shows a leaderboard of Teams, their remaining purses, and current squad count (e.g., 3/7).
4. Includes a highly visible 20-second countdown timer.
5. Displays a clear, elegant "SOLD" or "UNSOLD" animation overlay when the Auctioneer finalizes a player.

### Story 4.2 Captain Mobile Bidding Screen
**As a** Captain,
**I want** a mobile-optimized bidding screen,
**so that** I can rapidly and safely propose bids during the 20-second window.
**Acceptance Criteria:**
1. UI displays the Current Player and Current Accepted Bid.
2. UI prominently displays the Captain's remaining purse and their specific Max Allowed Bid.
3. Includes quick-tap increment buttons (+3000, +5000, +10000) and a custom input field.
4. UI provides clear color-coded status feedback: "Bid Proposed" (Yellow/Pending), "Highest Bidder" (Green), "Outbid" (Red), "Insufficient Funds" (Disabled/Gray).

### Story 4.3 Auctioneer Control Dashboard
**As an** Auctioneer,
**I want** a dense, desktop-optimized control center,
**so that** I can see all incoming proposed bids and click to accept them instantly.
**Acceptance Criteria:**
1. UI displays a list of the upcoming player queue.
2. UI displays an "Incoming Bids" panel, showing which captains are proposing what amounts.
3. Each incoming bid has a clear "Accept" button.
4. Prominent global controls: "Start Next Player", "Hammer/Sell", "Mark Unsold".

---

## Epic 5: Advanced Controls & Edge Cases
**Epic Goal:** Implement crucial "safety net" features for the live event: Undo, pause, manual bid placement, editing player details on the fly, and handling unsold players.

### Story 5.1 Pause & Manual Timer Control
**As an** Auctioneer,
**I want** to pause the auction timer and bidding process,
**so that** I can address real-world interruptions or explain a rule.
**Acceptance Criteria:**
1. "Pause" button stops the server-side timer and prevents Captains from proposing bids.
2. "Resume" button restarts the timer from where it paused.

### Story 5.2 Undo Last Action
**As an** Auctioneer,
**I want** an "Undo" button to revert the last major state change (e.g., accidental Hammer or wrong accepted bid),
**so that** human errors don't ruin the integrity of the squads and purses.
**Acceptance Criteria:**
1. If a player is marked "Sold", Undo reverts the player to "Pending", removes them from the team, and refunds the purse.
2. If a bid was Accepted, Undo reverts to the previous highest bid.
3. State reversal is instantly broadcasted to all clients.

### Story 5.3 Manual Bid Entry & Overrides
**As an** Auctioneer,
**I want** to manually input a bid on behalf of a captain,
**so that** if a captain's phone dies or disconnects, they can shout their bid and I can enter it into the system.
**Acceptance Criteria:**
1. Auctioneer UI has a "Manual Bid" module.
2. Auctioneer selects a Team from a dropdown, enters an amount, and clicks "Force Accept".
3. System applies the constraint math to validate it, then instantly makes it the Current Accepted Bid.

### Story 5.4 Unsold Player Recall
**As an** Auctioneer,
**I want** to recall all "Unsold" players back into the queue at the end of the auction,
**so that** teams who still need players can bid on them in a lightning round.
**Acceptance Criteria:**
1. Once the primary queue is empty, a "Recall Unsold" button appears.
2. Clicking it resets all "Unsold" players to "Pending" and populates them back into the active queue.