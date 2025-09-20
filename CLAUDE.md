# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server (Next.js frontend only)
- `npm run dev:all` - Start both frontend and collaboration server (Next.js + Hocuspocus)
- `npm run hocuspocus` - Start collaboration server only

### Database
- `npm run prisma:generate` - Generate Prisma client after schema changes
- `npm run prisma:migrate` - Create and apply database migrations

### Build & Production
- `npm run build` - Full production build (includes Prisma generate, DB push, Next.js build, and server build)
- `npm run build:server` - Build Express server only
- `npm run start` - Start production server

### Utilities
- `npm run migrate:tasks` - Run task description migration script

## Architecture

### Project Structure
This is a comprehensive team collaboration platform built with Next.js, featuring:

**Frontend**: Next.js 14 app router with TypeScript
- `/src/app` - Next.js pages and API routes
- `/src/components` - Reusable UI components (Radix UI + Tailwind CSS)
- `/src/hooks` - Custom React hooks
- `/src/contexts` - React contexts for state management

**Backend Services**:
- Next.js API routes for main application logic
- Express server for production (`dist/server.js`)
- Hocuspocus server for real-time document collaboration (`hocuspocus-server.js`)
- Socket.io for real-time features

**Database**: PostgreSQL with Prisma ORM
- Schema in `prisma/schema.prisma`
- Key models: User, Project, Task, Document, Meeting, Calendar

### Key Features & Components

**Real-time Collaboration**:
- Document editing with Y.js and Hocuspocus for operational transformation
- TipTap editor with collaborative cursors and extensions
- Socket.io for general real-time updates

**Video Conferencing**:
- WebRTC with PeerJS for video/audio communication
- Meeting transcription and AI-powered summaries
- Meeting records and playback

**Project Management**:
- Kanban boards with drag-and-drop (React Beautiful DnD)
- Task management with Epic organization
- Team member invitations and role management

**Document System**:
- Rich text editing with TipTap
- Password-protected documents
- Folder organization within projects

### Authentication & Security
- Clerk for authentication (configured in layout.tsx)
- JWT tokens for API authentication
- Password protection for documents with bcrypt

### Theming
- Uses next-themes for dark/light mode
- Primary dark mode colors: #1f1f21, #2a2a2c
- Tailwind CSS with custom configuration

### Development Notes
- Korean language support (as per Cursor rules)
- Uses TypeScript throughout
- Express server runs alongside Next.js in production
- Real-time collaboration requires running both Next.js and Hocuspocus servers

### Important File Locations
- Database schema: `prisma/schema.prisma`
- Socket events: `socket-events/onCall.js`
- Collaboration server: `hocuspocus-server.js`
- Server configuration: `tsconfig.server.json`
- Main layout with theme setup: `src/app/layout.tsx`