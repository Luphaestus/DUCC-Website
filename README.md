# DUCC Website

## Technical Stack
- Node.js / Express.js
- SQLite
- Passport.js
- SASS / PicoCSS
- Docker / Caddy
- Jest

## Installation
```bash
npm install
npm run db:init
```

## Commands
- `npm run dev`: Sass Wactcher, Nodemon, and seeded data.
- `npm test`: Executes Jest test suite (initializes database.test.db).
- `npm run sass:build`: Compiles SASS to public directory.
- `npm run apidoc`: Generates the API documentation html file from the openapi.json file.

## Deployment
This is optional and is only intended for deploying to a remote server (It mean I can test locally, and only push to server when ready).

Deployment requires a `.env.deploy` file containing `SERVER_IP`, `SERVER_PASSWORD`, and `DOMAIN_NAME`.

### Flags
- `-d, --dev`: Sets NODE_ENV=dev (equivalent to running with `npm run dev`).
- `-c, --clear`: Removes remote data/ directory before deployment. (Use with caution!)
- `-l, --logs`: Streams remote docker logs.
- `-h, --help`: Displays usage information.

## Directory Structure
- `public/`: Frontend assets and client-side logic.
  - `js/widgets/`: Reusable UI components (e.g., StandardCard, Tag).
  - `js/pages/`: Page-specific logic.
- `server/`: Express application and API routes.
- `server/db/`: SQLite drivers and initialization scripts.
- `src/`: SASS partials.
- `tests/`: Integration and unit tests.
- `Caddyfile`: Reverse proxy and TLS configuration.
- `Dockerfile`: Container image definition.
- `docker-compose.yml`: Service definitions.

## API Documentation
The API documentation is generated from `public/openapi.json`.
- View the documentation: [public/openapi.html](public/openapi.html) (open in browser)
- Regenerate documentation: `npm run apidoc`

## License
Apache-2.0