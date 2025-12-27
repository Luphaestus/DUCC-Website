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
- `npm run dev`: Starts development server with SASS watcher.
- `npm test`: Executes Jest test suite (initializes database.test.db).
- `npm run sass:build`: Compiles SASS to public directory.

## Deployment
Deployment requires a `.env.deploy` file containing `DROPLET_IP`, `DROPLET_PASSWORD`, and `DOMAIN_NAME`.

### Flags
- `-d, --dev`: Sets NODE_ENV=dev and seeds test data.
- `-c, --clear`: Removes remote data/ directory before deployment.
- `-l, --logs`: Streams remote docker logs.
- `-h, --help`: Displays usage information.

## Directory Structure
- `public/`: Frontend assets and client-side logic.
- `server/`: Express application and API routes.
- `server/db/`: SQLite drivers and initialization scripts.
- `src/`: SASS partials.
- `tests/`: Integration and unit tests.
- `Caddyfile`: Reverse proxy and TLS configuration.
- `Dockerfile`: Container image definition.
- `docker-compose.yml`: Service definitions.

## License
Apache-2.0
