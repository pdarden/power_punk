# Power Punk - Grassroots Climate Solutions Crowdfunding Platform

A decentralized crowdfunding platform for community-driven climate projects including solar microgrids, batteries, community parks, HVAC systems, tree planting, electrification equipment, bitcoin mining kits, and GPU infrastructure.

## Features

- **Map-based Project Discovery**: Interactive map showing active projects with location-based filtering
- **Dynamic Pricing**: Volume-based discounts for bulk contributors
- **Referral System**: Earn rewards by referring new contributors
- **Agent-based Escrow**: Each project has its own AI agent managing funds
- **Decentralized Storage**: Project data stored on Walrus for transparency
- **Multi-wallet Support**: Coinbase embedded wallets for easy user onboarding

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Maps**: Leaflet.js for interactive project mapping
- **Database**: Supabase for user accounts and campaign metadata
- **Storage**: Walrus for immutable project data storage
- **Payments**: 
  - Coinbase AgentKit for project wallet management
  - Coinbase Embedded Wallets for user wallets
  - Base Network for transactions
- **AI**: OpenAI integration for agent decision-making

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- Coinbase Developer Platform account
- OpenAI API key
- Walrus API access

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- Supabase credentials (URL, Anon Key, Service Role Key)
- Coinbase CDP API keys
- OpenAI API key
- Walrus API credentials

### 3. Supabase Setup

Create the following tables in your Supabase project:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  wallet_id TEXT,
  location JSONB,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  walrus_id TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('draft', 'active', 'funded', 'completed', 'cancelled')),
  location JSONB,
  project_type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project wallets table
CREATE TABLE project_wallets (
  campaign_id TEXT PRIMARY KEY REFERENCES campaigns(id),
  wallet_address TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id),
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  units INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── dashboard/         # User dashboard
│   └── projects/          # Project pages
├── components/            # React components
│   ├── map/              # Map components
│   ├── projects/         # Project-related components
│   └── wallet/           # Wallet connection components
├── lib/                   # Core libraries
│   ├── coinbase/         # Coinbase integrations
│   ├── supabase/         # Database clients
│   ├── walrus/           # Decentralized storage
│   └── utils/            # Utility functions
└── types/                # TypeScript type definitions
```

## Usage

### Creating a Project

1. Connect your wallet
2. Click "Create Project"
3. Fill in project details including:
   - Title and description
   - Location (with coordinates)
   - Funding goal and unit costs
   - Timeline and milestones
   - Optional dynamic pricing curves
4. Submit to create project agent and wallet

### Contributing to a Project

1. Browse projects on the map or list view
2. Select a project to view details
3. Choose number of units to purchase
4. Complete payment through connected wallet
5. Receive confirmation and track contribution

### Referral System

1. Get your unique referral link from the dashboard
2. Share with potential contributors
3. Earn rewards when referred users contribute

## API Endpoints

- `POST /api/projects` - Create new project
- `GET /api/projects` - List projects with filters
- `POST /api/payments` - Process contribution
- `GET /api/walrus?id={walrusId}` - Fetch project data
- `POST /api/wallets` - Create project wallet

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

The application can be deployed to:
- Vercel (recommended for Next.js)
- AWS/GCP/Azure with containerization
- Self-hosted with Node.js

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open a GitHub issue or contact the team.
