# Requirements

## Functional
- **FR1:** The system must support three distinct, secure, and synchronized interfaces: Auctioneer Dashboard (Admin), Captain Bidding Interface, and Viewer Display.
- **FR2:** The system must allow the Auctioneer to upload an Excel file to populate the player pool with attributes: Name, Photo, Role, Club Level, Speaking Skill, Fun Title, and Base Price.
- **FR3:** The system must automatically queue players for auction in descending order of their Base Price.
- **FR4:** The system must continuously calculate and enforce each Captain's "Maximum Allowed Bid," ensuring they retain enough funds (at the minimum base price) to fill their required 7-player squad limit.
- **FR5:** Captains must be able to submit "Proposed Bids" via predefined increment buttons (+3000, +5000, +10000) or a custom input field that adheres to allowed increment rules.
- **FR6:** The Auctioneer interface must display all incoming Proposed Bids in real-time, allowing the Auctioneer to manually select and convert one into the "Accepted Bid."
- **FR7:** The system must include a 20-second countdown timer that the Auctioneer controls. The timer must automatically reset when a new bid is accepted.
- **FR8:** The Auctioneer must have explicit controls to: Start Next Player, Open/Close Bidding, Accept Bid, Hammer (Finalize Sale), Mark Unsold, Pause/Restart Auction, Undo Last Action, Place Manual Bids on behalf of Captains, Edit Player Details, and Override the current state.
- **FR9:** Unsold players must be retained in a separate list, allowing the Auctioneer to optionally bring them back in later rounds.
- **FR10:** Viewers must see a live dashboard displaying the current player, base price, current accepted bid, leading team, countdown timer, and squad compositions/remaining purses for all teams.

## Non-Functional
- **NFR1:** The system must achieve real-time state synchronization across all connected clients with less than 500ms latency to prevent bidding race conditions.
- **NFR2:** The UI must adhere to a minimal, professional, dark-themed aesthetic with crisp typography, avoiding overly loud/neon game styles in favor of a sophisticated event broadcast look.
- **NFR3:** The system architecture must guarantee that the server is the single source of truth for the auction state, never trusting client-side calculations for purse limits or squad sizes.
- **NFR4:** The platform must comfortably support ~40 concurrent WebSocket connections (1 Auctioneer, 4 Captains, ~35 Viewers) on a local network or standard Wi-Fi without degrading performance.

---
