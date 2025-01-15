import { Server } from 'socket.io'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let io: any

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'production') {
    if (!io) {
      const httpServer = (req as any).socket.server
      io = new Server(httpServer, {
        path: '/api/socketio',
        addTrailingSlash: false,
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      })

      io.on('connection', (socket: any) => {
        console.log('Socket connected:', socket.id)

        socket.on('join-room', (roomId: string, userId: string) => {
          socket.join(roomId)
          socket.to(roomId).emit('user-connected', userId)
          
          socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId)
          })
        })
      })
    }
  }

  return NextResponse.json({ success: true })
}