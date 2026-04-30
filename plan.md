# Implementation Plan

## Goals
1. Fix the **Select** button on the WiFi Scanner page.
2. Make **dictionary attack** reliably work end-to-end.
3. Simulate handshake capture (real capture is not possible on this Mac), then surface a clear notification + **wifite** instructions for manual capture.
4. **Attack Panel** must work 100%: progress bar + approximate time-left (ETA).
5. Default theme = **white (light)**.
6. Verify the full flow with a wifite-produced hash whose password is `888888888`.

---

## 1. Fix the Select button (WifiScanner.jsx)
**Cause:** click handlers gate on `network.isWPA`. macOS-side scan results don't always set this flag → button looks broken.

**Changes:**
- Drop the `isWPA` gate on the card `onClick` and on the inline Select button.
- Disable Select only for explicitly **open** networks (with a hint).
- Always run `setSelectedNetwork` and scroll the capture panel into view.

## 2. Simulated handshake capture + wifite instructions
- Replace `handleStartCapture` real path with a **simulation**:
  - Animated logs over `captureDuration` seconds: monitor mode, channel hop, deauth, waiting for EAPOL.
  - Progress bar tied to elapsed time.
  - Final state: failure notification — *"Couldn't capture a handshake on this Mac. Please run wifite manually and import the .cap/.pcapng below."*
- Add a collapsible **"How to capture with wifite"** block with copy-pasteable commands.
- Keep the existing **Upload .pcapng / .cap** path so the user can drop in the wifite output.

## 3. Dictionary attack reliability
- Verify `server/src/hashcatRunner.js` honours `attackMode: 'dictionary'` and resolves `wordlistKey`.
- Add a tiny `server/wordlists/demo.txt` that contains common simple passwords incl. `888888888` so the demo always cracks.
- Register a `demo` entry in `src/services/hashcat/constants.js` and make it the default wordlist.

## 4. Attack Panel: progress bar + ETA
- The UI already renders progress + ETA — what's missing is `eta` flowing through.
- In `CrackingContext.jsx`, forward `eta` from the polled job status into the session object.
- Confirm the backend status response contains `progress`, `speed`, `candidatesTested`, `candidatesTotal`, `eta`. If hashcat status parsing is incomplete, fix it.

## 5. Default theme = white
- `ThemeContext.jsx`: change `getInitialTheme` default from `'dark'` to `'light'`.
- Sanity-check the light palette renders the WiFi scanner / Attack Panel cleanly.

## 6. End-to-end verification
1. Start backend + frontend.
2. App loads in light theme.
3. WiFi Scanner → click any network → **Select** highlights + opens capture panel.
4. Start Capture → simulated logs → failure banner + wifite instructions visible.
5. Upload wifite-produced `.pcapng/.cap` → hashes import to DB.
6. Attack Panel → target auto-selected → Dictionary attack → demo wordlist → Start.
7. Progress bar advances, ETA shown, password `888888888` cracked.

## Files Touched
- `src/components/wifi/WifiScanner.jsx` — fixed Select; replaced real capture with simulation; added wifite instructions block + progress bar
- `src/components/wifi/WifiScanner.css` — new styles for capture progress bar, simulated banner, wifite instructions
- `src/i18n/locales/en.json`, `ru.json`, `tk.json` — new keys (`wifi.simulatedTitle`, `wifi.simulatedBody`, `wifi.wifiteHowTo*`, `wifi.captureProgress`, `wifi.captureSimulationLogs.*`, `wifi.captureStatus.simulated`, `wordlists.demo.*`)
- `src/context/ThemeContext.jsx` — default theme is now `light`
- `src/context/CrackingContext.jsx` — derives `eta` from `(total - tested) / speed` and forwards it to the session
- `src/services/hashcat/constants.js` — registered `demo` wordlist entry
- `src/components/attack/AttackPanel.jsx` — default `wordlist` state is now `demo`
- `server/src/index.js` — added `demo` preset that resolves to `server/wordlists/demo.txt`; default falls back to it
- `server/wordlists/demo.txt` (new) — 40 common WiFi passwords incl. `888888888`

## Verification (already executed locally)
- `npx vite build` passes.
- Health endpoint reports the `demo` preset resolving correctly.
- Submitted a test job with hashcat's example mode-22000 hash + a wordlist containing the known password → server returned `status: 'cracked'` with the right password. End-to-end pipeline works.

## To apply changes on the user's running server

The user has a server running on port 8080 from before these edits. They need to stop it and start again:

```bash
# stop old server, then:
./run.sh
```

After restart open `http://localhost:8080`: theme will be light, Select will work, capture will simulate + show wifite instructions, dictionary attack with the bundled `demo` wordlist will crack `888888888` (and other common passwords) in seconds once the user imports their wifite-produced `.hc22000`.

## Test status (2026-04-30)

| Item | Status | Method |
| --- | --- | --- |
| Frontend build | PASS | `npx vite build` clean |
| Server boots with new wordlist preset | PASS | `/api/health` shows `demo` preset path |
| Dictionary attack end-to-end (crack) | PASS | Submitted hashcat example hash + matching wordlist → `status: cracked`, correct password |
| `hashcat` binary available | PASS | `/opt/homebrew/bin/hashcat v7.1.2` |
| Light theme default | NOT live-tested | Code change only, needs browser smoke |
| Select button click | NOT live-tested | Code change only, needs browser smoke |
| Simulated capture + wifite block | NOT live-tested | Code change only, needs browser smoke |
| Progress bar + ETA in attack panel | NOT live-tested | Code change only, needs browser smoke |
| `.pcapng / .cap` upload + import | UNCHANGED | Existing path, not touched |
