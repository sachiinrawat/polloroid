# Polloroid

Polloroid is an interactive web application for creating and voting on image polls. Users can create polls with up to 8 images, vote on others' polls, and earn rewards in the process.

## Features

- Instagram-inspired scrollable feed with image polls
- Poll creation system allowing 2-8 images per poll
- One-tap voting mechanism with swipe navigation
- "Polo" in-app currency system for rewards and poll creation
- User authentication with automatic rewards for new users
- Profile management with customization options
- Deposit/withdrawal functionality for the currency system

## Technologies

- Frontend: React, TypeScript, Framer Motion, Bootstrap
- Backend: Express.js
- Database: SQLite
- Authentication: JWT

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev:full
   ```

## How It Works

1. **Browse Polls**: Scroll through the feed to see polls created by other users
2. **Vote**: Tap on an image to cast your vote and earn Polo rewards
3. **Create Polls**: Upload 2-8 images to create your own poll (requires Polo)
4. **Earn Rewards**: Get Polo for signing up and voting on polls
5. **Redeem**: Manage your Polo balance in the Redeem section

## License

MIT