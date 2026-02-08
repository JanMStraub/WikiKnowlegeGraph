# WikiGraph Pro

A client-side knowledge graph visualizer that explores connections between Wikipedia/Wikidata entities. Runs entirely in the browser — no backend required.

## Features

- **Interactive Knowledge Graph**: Visualize relationships between entities using vis-network
- **Smart Search**: Autocomplete-powered entity search via Wikidata API
- **Multi-depth Exploration**: Explore connections up to 10 degrees of separation
- **Entity Categories**: People, countries, cities, locations, organizations, companies, schools, and concepts
- **Live Progress**: Real-time status updates during graph generation
- **Client-side SPARQL**: Queries Wikidata directly from the browser (no backend needed)
- **Caching**: localStorage cache for SPARQL results + in-memory cache for graph data
- **Modern UI**: Dark mode, responsive design, graph export (PNG/JSON)
- **Static Hosting**: Deploy to GitHub Pages or any static file server

## Prerequisites

- Node.js 18+

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Deploy to GitHub Pages

```bash
cd frontend
npm run build
```

The `dist/` folder contains a fully self-contained static site. Deploy it to GitHub Pages, Netlify, Vercel, or any static host.

All asset paths are relative (`base: './'`), so it works in any subdirectory.

## How It Works

1. **Search**: Type an entity name — autocomplete queries `wikidata.org/w/api.php`
2. **Resolve**: Entity names are resolved to Wikidata QIDs via SPARQL
3. **Explore**: A BFS algorithm fetches connections layer by layer from the Wikidata SPARQL endpoint
4. **Visualize**: Nodes and edges render in an interactive vis-network graph

All SPARQL queries run directly in the browser via `fetch()` to `https://query.wikidata.org/sparql` (CORS-enabled).

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components (GraphView, Sidebar, Legend, etc.)
│   ├── hooks/               # Custom React hooks (useGraphState)
│   ├── lib/                 # Core logic
│   │   ├── sparql.ts        # Direct SPARQL client (fetch-based)
│   │   ├── graphGenerator.ts # BFS graph generation algorithm
│   │   ├── sanitization.ts  # SPARQL injection protection
│   │   └── cache.ts         # localStorage cache with TTL
│   ├── utils/               # Utility functions
│   ├── styles/              # CSS variables and global styles
│   ├── types.ts             # TypeScript type definitions
│   ├── api.ts               # API layer (wraps lib modules)
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── package.json
└── vite.config.ts
```

## Entity Categories

| Category | Color | Examples |
|---|---|---|
| People | Blue | Albert Einstein, Marie Curie |
| Countries | Red | United States, Germany |
| Cities | Cyan | New York, Berlin |
| Locations | Green | Geographic regions, mountains |
| Organizations | Pink | United Nations, NATO |
| Companies | Amber | Apple, Google |
| Schools | Purple | MIT, Oxford University |
| Other | Gray | Everything else |

## Performance

- **Rate limiting**: 500ms delay between SPARQL batch requests (Wikidata fair-use policy)
- **localStorage cache**: QID lookups (24h TTL), connection data (1h TTL)
- **In-memory cache**: Full graph results (10min TTL)
- **Batch queries**: Multiple entities queried in a single SPARQL request
- **Edge deduplication**: O(1) lookup using sets

## Security

- SPARQL injection protection via input sanitization
- XSS prevention via React's safe JSX rendering
- No secrets or API keys required

## Testing

```bash
cd frontend
npm test
```

## License

MIT
