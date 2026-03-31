# Project Brief: Impromptu Premier League Auction System

## Executive Summary
The Impromptu Premier League Auction System is a real-time, web-based platform designed for a Toastmasters club event. Inspired by IPL-style sports auctions, the system enables team captains to bid on participants (players) using a 100,000 virtual purse to build a strict 7-player squad. Unlike fully automated auction platforms, this system centers around a human Auctioneer who manually reviews proposed bids and controls the flow of the event. The platform features real-time synchronization across three distinct user roles (Auctioneer, Captains, Viewers) and delivers a premium, dark-themed, sports-broadcast visual experience.

## Problem Statement
Traditional digital auction tools are typically fully automated, stripping away the human drama, pacing, and excitement of a live sports auction. For a live Toastmasters event, an automated highest-bidder-wins system fails to capture the desired "Impromptu Premier League" atmosphere. Furthermore, manual tracking (using whiteboards or spreadsheets) is slow, error-prone, and lacks audience engagement. The club needs a reusable, specialized system that enforces complex constraints (budget and squad size) while giving a human auctioneer absolute control over the pacing, bid acceptance, and edge-case overrides.

## Proposed Solution
A specialized, real-time web application featuring three synchronized interfaces:
1. **Auctioneer Dashboard:** A comprehensive control panel to manage the auction lifecycle (start/pause, accept bids, hammer/finalize, mark unsold, override, undo, edit).
2. **Captain Interface:** A mobile-optimized bidding screen where captains propose bids (custom or predefined increments) and track their 100,000 purse and 7-player squad limits.
3. **Viewer Interface:** A public, large-screen optimized display showing live auction action, current player details, timers, and team standings with dynamic, premium animations.
The core differentiator is the "semi-controlled" bidding mechanic: captains *propose* bids, but the auctioneer *accepts* them, bridging digital efficiency with live human moderation.

## Target Users
### Primary User Segment: The Auctioneer (Admin)
- **Profile:** The master of ceremonies for the event (1 user).
- **Needs:** Absolute control over the auction state. Needs to see incoming proposed bids, accept them, manage the 20-second timer, and handle edge cases (undo, manual bids, unsold players).
- **Behaviors:** High cognitive load during the event; requires a highly responsive, clearly laid out desktop/tablet interface.

### Secondary User Segment: Team Captains
- **Profile:** Participants bidding on players (~4 users).
- **Needs:** Clear visibility of their remaining purse, current squad size, and the active player. Need fast, reliable buttons to propose bids (e.g., +3000, +5000) or enter custom amounts.
- **Behaviors:** Bidding via mobile devices. Needs instant feedback on bid status (Proposed, Accepted, Outbid, Insufficient Funds).

### Tertiary User Segment: Viewers (Audience)
- **Profile:** Club members watching the event live (~30-35 users).
- **Needs:** A highly visual, dramatic representation of the auction. Wants to see who is being bid on, the current highest bid, squad compositions, and remaining team purses.

## Goals & Success Metrics
### Business Objectives
- **Reusability:** The system must be usable for future events, not hardcoded for a single session.
- **Fairness & Compliance:** 0% error rate in enforcing the 100,000 purse limit and exactly 7-player squad constraint.

### User Success Metrics
- **Real-time Sync:** < 500ms latency between an auctioneer accepting a bid and all screens updating.
- **Auctioneer Efficiency:** Auctioneer can easily process bids and transition to the next player without system bottlenecks.

### Key Performance Indicators (KPIs)
- **System Uptime:** 100% stability during the live 1-2 hour event.
- **Engagement:** Smooth animations and clear "SOLD" states trigger positive audience reactions.

## MVP Scope
### Core Features (Must Have)
- **Player Management:** Bulk Excel upload for ~30 players with attributes (name, photo, role, club level, speaking skill, fun title, base price). Auto-sorting by descending base price.
- **Role-Based Interfaces:** Distinct views for Auctioneer, Captain, and Viewer.
- **Semi-Controlled Bidding Engine:** Captains submit proposed bids; Auctioneer manually selects and accepts the winning bid.
- **Constraint Engine:** Strict enforcement of 100k purse and 7-player squad limits (preventing bids that would break the math for remaining slots).
- **Auctioneer Controls:** Next player, open/close bidding, accept bid, hammer (sell), unsold, pause, restart, undo last action, manual bid, edit player, override.
- **Real-Time Timer:** 20-second countdown that resets on accepted bids.
- **Premium UI:** Dark theme, team colors, bold typography, and dramatic "SOLD" animations.

### Out of Scope for MVP
- Automated algorithmic bidding or bot captains.
- Complex multi-league management or historical analytics dashboards.
- Integrated video streaming (assumes an in-person or separate Zoom setup).

### MVP Success Criteria
A successful mock auction run-through with 4 captains and 1 auctioneer where all constraints are perfectly enforced, and all screens sync flawlessly over a local network/Wi-Fi.

## Post-MVP Vision
### Phase 2 Features
- Customizable rule sets (variable purse sizes, different squad limits).
- Player retention or trading mechanics between captains.
- Exportable post-auction reports and team analytics.

### Long-term Vision
To become the premier reusable auction platform for Toastmasters and similar club events globally, offering highly customizable, broadcast-quality auction experiences.

## Technical Considerations
- **Target Platforms:** Web Responsive. Mobile-first for Captains; Desktop/TV-optimized for Auctioneer and Viewers.
- **Technology Preferences:** Requires robust real-time WebSocket capabilities (e.g., Node.js + Socket.io, or equivalent real-time sync engines like Supabase/Firebase). 
- **Architecture Considerations:** Centralized state management is critical. The server must be the ultimate source of truth to prevent race conditions when multiple captains bid simultaneously.

## Constraints & Assumptions
### Constraints
- **Scale:** Small concurrent user base (~40 users), but requires ultra-low latency.
- **UI Design:** Must strictly avoid looking like a basic admin table/dashboard. Must feel premium and sports-inspired.

### Key Assumptions
- Users will be on a stable network connection (likely the same local network or stable Wi-Fi).
- Registration happens offline/late, necessitating the Excel upload feature rather than a self-service player portal.

## Risks & Open Questions
### Key Risks
- **Network Latency/Disconnects:** If a captain's device disconnects, they might miss a bidding window.
- **Auctioneer Overload:** The auctioneer has many controls. If the UI is cluttered, they may make mistakes during fast-paced bidding.
- **Constraint Math:** Calculating maximum allowed bids (ensuring a captain can still buy remaining required players at minimum base prices) must be bulletproof.

### Open Questions
- What is the minimum base price for a player? (Needed for constraint math).
- If a captain disconnects, should the auctioneer have a way to pause the timer automatically, or is that manual?

## Next Steps
### Immediate Actions
1. Review and refine this Project Brief.
2. Answer the open questions regarding minimum base prices and disconnect handling.
3. Proceed to PM Handoff for PRD Generation.

### PM Handoff
This Project Brief provides the full context for the Impromptu Premier League. Upon approval, we will transition to 'PRD Generation Mode' to detail the exact functional requirements and user stories.

***

### 💡 Rationale & Trade-offs Made
*   **Data Ingestion:** I specified an "Excel upload" explicitly as you requested, which trades off a self-service registration portal for speed and flexibility for the organizers.
*   **Constraint Engine:** I explicitly highlighted the "Constraint Math" as a key risk. If a captain has 10,000 left and needs 2 players, and the minimum base price is 3,000, their maximum allowed bid for the current player is 7,000. The system *must* calculate this on the fly to prevent broken states.
*   **State Authority:** Emphasized that the server is the ultimate source of truth. With multiple captains tapping at once, the WebSocket server must queue proposals for the auctioneer rather than auto-resolving them.

***

