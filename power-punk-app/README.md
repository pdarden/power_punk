# Power Punk - Grassroots Climate Solutions Crowdfunding Platform

A decentralized crowdfunding platform for community-driven climate projects including solar microgrids, batteries, community parks, HVAC systems, tree planting, electrification equipment, bitcoin mining kits, and GPU infrastructure.

## Features

- **Interactive Project Discovery**: Map and list views with advanced filtering by project type, location, and status
- **Dual Escrow Options**: Choose between AI-powered AgentKit escrow or individual trustless smart contract escrow
- **Project Type Icons**: Visual identification with color-coded icons for all project categories  
- **Referral System**: Earn rewards by referring new contributors
- **Real-time Updates**: Live project cards with funding progress and contributor tracking
- **Embedded Wallet Integration**: Seamless onboarding with Coinbase CDP Embedded Wallets
- **Decentralized Storage**: Immutable project data stored on Walrus

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI Components**: Custom dropdowns with Lucide icons, responsive design
- **Maps**: Leaflet.js for interactive project mapping with popup cards
- **Database**: Supabase for user accounts and campaign metadata
- **Storage**: Walrus for immutable project data storage
- **Smart Contracts**: Individual CoopEscrow contracts per project with ProjectRegistry for tracking
- **Payments**: 
  - Coinbase Embedded Wallets for seamless user authentication
  - Coinbase AgentKit for AI-managed project wallets
  - USDC transactions on Base Network
- **AI**: OpenAI integration for agent decision-making and fund distribution

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
├── contracts/             # Smart contract integrations
│   ├── abi/              # Contract ABIs
│   ├── coopEscrow.ts     # Contract deployment and interaction helpers
│   ├── registry.json     # Deployed contract addresses
│   └── types.ts          # Contract type definitions
├── lib/                   # Core libraries
│   ├── coinbase/         # Coinbase integrations
│   ├── supabase/         # Database clients
│   ├── walrus/           # Decentralized storage
│   └── utils/            # Utility functions
└── types/                # TypeScript type definitions
```

## Usage

### Creating a Project

1. Connect your wallet using embedded authentication
2. Click "Create Project" 
3. Fill in project details including:
   - Project title and description
   - Project type (with visual icon selection)
   - Escrow type: Agent Escrow (CDP AgentKit) or Individual Smart Contract Escrow
   - Location with coordinates
   - Funding goal and unit costs
   - Project timeline and deadline
4. Deploy individual escrow contract or create agent wallet based on escrow choice

### Contributing to a Project

1. Browse projects using interactive map or filterable list view
2. Click on project markers or "View Project" to see detailed information
3. Use the contribution widget to select number of units
4. Complete USDC payment through embedded wallet integration
5. Receive transaction confirmation and track your contribution in real-time

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
