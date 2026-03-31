# User Interface Design Goals

## Overall UX Vision
The application must break away from traditional, dry administrative dashboards and feel like a high-end, live professional event broadcast. It requires a clean, minimal dark aesthetic with sophisticated contrast, strict visual hierarchy, and energetic but refined micro-interactions. The experience should feel tense and focused during active bidding, culminating in clear, celebratory "SOLD" animations.

## Key Interaction Paradigms
- **Auctioneer (Control Center):** Desktop or tablet-optimized. Needs a dense but clearly organized layout to view the active player, monitor the incoming queue of "Proposed Bids", quickly select one to become the "Accepted Bid", and manage the timer/hammer actions. 
- **Captains (Action-Oriented):** Mobile-first design. Large, easily tappable buttons for predefined increments (+3000, +5000) and a custom input field. Must provide instant, unambiguous color-coded feedback on their current status (e.g., Yellow for "Proposed/Waiting", Green for "Highest Bidder", Red for "Outbid" or "Insufficient Funds").
- **Viewers (Passive Consumption):** TV/Large Display optimized. Zero interaction required. Large typography, clear focus on the current player and current highest bid, with a persistent sidebar or ticker showing squad formations and remaining purses.

## Core Screens and Views
1. **Auctioneer Dashboard:** The master control room (player queue, incoming bids, timer controls, override options).
2. **Captain Bidding Screen:** Mobile view focusing strictly on the active player, the captain's remaining purse, their current squad slots, and the bidding controls.
3. **Public Viewer Display:** The "Broadcast View" meant for projectors/TVs showing the live action, timers, and team standings.
4. **Event Setup & Admin Screen:** A pre-event screen for the Auctioneer to upload the Excel sheet of players, configure the number of teams, set base purses (default 100k), and define minimum base prices.

## Accessibility: WCAG AA
Given the dark theme and "broadcast" style, maintaining high contrast (WCAG AA) is critical so that viewers in a potentially dimly lit room (or captains looking at bright phones) can easily read numbers and player names.

## Branding
- **Theme:** Deep, sophisticated dark mode (slate grays, charcoals, deep blues/blacks) as the background.
- **Accents:** Muted but clear professional accent colors (e.g., gold, crisp white, or subtle team colors) to indicate winning bids and states without looking like a neon arcade game.
- **Typography:** Crisp, modern, sans-serif fonts optimized for data readability and large numbers.

## Target Device and Platforms: Web Responsive
- Captains: Mobile browsers.
- Auctioneer: Desktop/Tablet browsers.
- Viewers: Desktop browsers cast to Large Displays/Projectors.

---
