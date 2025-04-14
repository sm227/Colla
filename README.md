# Video Conferencing Platform

A comprehensive video conferencing solution built with Next.js, offering robust real-time communication, project management, and team collaboration features.

## 🚀 Features

### Video Conferencing
- Real-time video and audio communication using WebRTC and PeerJS
- Toggle microphone and camera during meetings
- Chat functionality during meetings
- Meeting room sharing and invitation system
- AI-powered meeting summary generation

### Project Management
- Interactive Kanban boards for task management
- Team member invitation and collaboration
- Project dashboard with progress tracking
- Document creation and sharing
- Calendar for scheduling meetings and deadlines

### User Experience
- Modern responsive UI built with Tailwind CSS
- Real-time updates via Socket.io
- Secure authentication with Clerk

## 🔧 Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Real-time Communication**: Socket.io, PeerJS, WebRTC
- **Backend**: Express, Node.js
- **Database**: Prisma ORM
- **Authentication**: Clerk
- **AI Integration**: Google Generative AI

## 📋 Getting Started

### Prerequisites
- Node.js v14+ and npm/yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/video-conferencing-platforms.git
cd video-conferencing-platforms
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Set up your environment variables
```
# Create a .env file based on the example
cp .env.example .env
# Edit the .env file with your API keys and configuration
```

4. Set up the database
```bash
# Generate Prisma client
npm run prisma:generate
# Run migrations
npm run prisma:migrate
```

5. Run the development server
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🧰 Project Structure

- `/src/app` - Next.js application pages and API routes
- `/src/components` - Reusable UI components
- `/prisma` - Database schema and migrations
- `/socket-events` - Socket.io event handlers
- `/providers` - React context providers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
