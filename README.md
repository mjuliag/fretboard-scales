# Fretboard Scales

An interactive guitar and bass fretboard for exploring scales, Greek modes, intervals, and playable fret positions.

Live app: [fretboard-scales-2c0.pages.dev](https://fretboard-scales-2c0.pages.dev)

## Why it exists

This project is a personal learning tool focused on bass, readability, interval awareness, and consistent sharp-only note naming.

## Features

- Bass and guitar fretboards spanning frets 0–24
- Player-perspective string orientation
- Root note and scale selection
- Notes, Intervals, and Both display modes
- Seven Greek modes with parent major-scale context
- Position view with configurable fret ranges
- Distinct root and scale-note highlighting
- Sharp-only note names
- Installable Progressive Web App (PWA)
- Offline support

The fretboard works best in landscape orientation on small mobile screens.

## Tech stack

- React
- TypeScript
- Vite
- vite-plugin-pwa
- Node.js built-in test runner

## Local development

Install dependencies and start the development server:

```sh
npm install
npm run dev
```

## Verification

Run the test, lint, and production build checks:

```sh
npm test
npm run lint
npm run build
```

## License

Released under the [MIT License](LICENSE).
