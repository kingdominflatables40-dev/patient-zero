# Patient Zero

A social deduction game for 5–10 players. Most of you are still Human. A few are Infected, and one of them is the secret Patient Zero.

This is a **non-commercial fan adaptation**. The mechanics follow official [Secret Hitler](https://www.secrethitler.com/) (CC BY-NC-SA 4.0), created by Mike Boxleiter, Tommy Maranges, and Mac Schubert. The theme, names, and rules wording are original (Humans / Infected / Patient Zero, Squad Leader / Medic, Cure / Outbreak). There are no ads and no payments. This project is also released under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). You may not sell it or submit it to an app store.

Live: https://patient-zero-ia45.onrender.com

Four ways to play:

- **Online** – create a room, share the 4-letter code, everyone joins on their own phone.
- **Play with bots** – you against 4–9 computer players (runs fully in the browser, works offline). Optional “reveal all roles” checkbox for testing.
- **Solo practice** – one device, you control every seat and can see every role; the screen jumps to whoever has to act next.
- **Pass-and-play** – one phone handed around a real table.

v3 adds a full game board (Cure track, Outbreak track with power icons, failed-vote tracker, draw and thrown-away piles), original zombie-poster card art for every card (`public/art.js`, inline SVG), a “What do I do now?” banner, a 5-screen illustrated How to Play, tap-for-tooltips on the board, tap-to-flip private role cards, and a plain-language end-of-game recap. Bot logic lives in `public/bots.js`.

## Run it locally

You need Node.js 18 or newer.

```bash
cd patient-zero-online
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). To play online on real phones, use the same Wi‑Fi and open `http://YOUR-LAN-IP:3000` (or deploy, below).

```bash
npm test
```

runs the automated bot games (5, 7, and 10 players, including wins, veto, special leadership, and reconnect) and `test-modes.js` (hundreds of full Play-with-bots and Solo-practice games, card art check, client script syntax check).

## Deploy for free on Render (recommended)

Render’s free web service can run this Node server and the WebSocket game in one place. Verified against Render’s docs (including the February 2026 change that inbound WebSocket messages keep a free service awake).

**What Bryan needs:** a free [Render](https://render.com/) account (GitHub, Google, or email sign-up works) and a GitHub repository containing this folder. No credit card is required for the free instance. Do not add a payment method unless you later want a paid plan.

**Steps (do these on your own accounts; this project is not already deployed):**

1. Put this folder in a GitHub repo (only these files; `node_modules` is ignored).
2. Go to [render.com](https://render.com/), sign in, and choose **New → Web Service**.
3. Connect the repo. If Render asks for a root directory and the repo has a parent folder, set it to `patient-zero-online`.
4. Runtime: **Node**. Build command: `npm install`. Start command: `npm start`. Instance type: **Free**.
5. Deploy. Render sets `PORT` for you. When it finishes, open the `https://….onrender.com` URL on each phone.
6. One player taps **Play online**, creates a room, and reads the 4-letter code aloud. Everyone else joins with that code and a unique name. The host starts when 5–10 people are in the lobby. If a phone sleeps, reopen the site and join the same room with the **same name**.

`render.yaml` in this folder is a Blueprint with the same settings if you prefer **New → Blueprint**.

### Free-tier limits (important)

- The service **spins down after 15 minutes** with no inbound HTTP request and no inbound WebSocket message. The next visit can take **about one minute** to wake up. An active game stays awake because clients and the server exchange traffic (including WebSocket pings).
- Rooms live in memory only. If the service sleeps or restarts, **open rooms and in-progress games are gone**. Play in one sitting.
- Each Render workspace gets **750 free instance hours per month**. A sleeping service does not use those hours. If you use them up, free services pause until the next month.
- The filesystem is ephemeral (no durable disk on the free plan). Free services may be restarted at any time and cannot scale past one instance.
- Always use the `https://` site in production so phones connect with `wss://`.

A small paid Render instance (if you ever want no sleep and instant joins) is typically a few dollars a month. You do not need that for a friend-group game.

## Other hosts

A single Node process that serves the web app and `/ws` also runs on Fly.io or similar. PartyKit or Cloudflare Workers would work too, but would need a different server shape than this file. Render is the most direct free option for this repo.

## Credit

Game mechanics inspired by Secret Hitler (CC BY-NC-SA 4.0); this is a non-commercial fan adaptation.
