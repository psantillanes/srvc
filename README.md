# SRVC

Vehicle service tracker for a 2019 VW GTI and a 2019 Volvo XC40. It runs as a home-screen web app (PWA) in plain HTML/CSS/JS with no build step.

- Data is kept in the browser's localStorage on the device. Use **Data ▸ Export backup** to save a copy.
- `seed.js` holds the starting data that loads on first launch.
- `sw.js` caches the app for offline use. Bump `VERSION` there after changing any file.
- Fonts: Archivo and IBM Plex Mono (SIL Open Font License), self-hosted in `fonts/`.

Install: open the GitHub Pages URL in Safari, then Share ▸ Add to Home Screen.
