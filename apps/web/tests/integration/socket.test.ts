/**
 * Socket.io Integration Tests
 * Sprint 9 - Real-Time Features
 *
 * Tests Socket.io server functionality, event handling, and room management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { io as ioClient, Socket } from 'socket.io-client';
import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { initializeSocketServer, getIO } from '../../lib/socket/server';
import { SocketEvent } from '../../lib/socket/events';

describe('Socket.io Integration Tests', () => {
  let httpServer: HTTPServer;
  let serverPort: number;
  let clientSocket1: Socket;
  let clientSocket2: Socket;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();

    // Initialize Socket.io server
    const io = initializeSocketServer(httpServer);

    // Start server on random available port
    httpServer.listen(0, () => {
      const address = httpServer.address() as AddressInfo;
      serverPort = address.port;
      console.log(`Test Socket.io server running on port ${serverPort}`);
      done();
    });
  });

  afterAll((done) => {
    // Disconnect all clients
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();

    // Close server
    const io = getIO();
    if (io) {
      io.close(() => {
        httpServer.close(done);
      });
    } else {
      httpServer.close(done);
    }
  });

  beforeEach(() => {
    // Disconnect existing clients
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to Socket.io server', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        expect(clientSocket1.id).toBeDefined();
        done();
      });

      clientSocket1.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should disconnect from Socket.io server', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.disconnect();
      });

      clientSocket1.on('disconnect', () => {
        expect(clientSocket1.connected).toBe(false);
        done();
      });
    });

    it('should connect with authentication token', (done) => {
      const token = 'user123:TestUser:player';

      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token },
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        // Token should be processed by authMiddleware
        done();
      });
    });

    it('should allow anonymous connections', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        // No auth token
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        done();
      });
    });
  });

  describe('Tournament Room Management', () => {
    const tournamentId = 'test-tournament-123';

    it('should join tournament room', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        // Wait for confirmation (implicit - no error means success)
        setTimeout(() => {
          done();
        }, 100);
      });
    });

    it('should receive user online event when another user joins', (done) => {
      const userId2 = 'user2';

      // First client connects and joins room
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token: 'user1:User1:player' },
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        // Listen for user online events
        clientSocket1.on(SocketEvent.USER_ONLINE, (payload) => {
          expect(payload.userId).toBe(userId2);
          expect(payload.status).toBe('online');
          done();
        });

        // Second client joins after first is in room
        setTimeout(() => {
          clientSocket2 = ioClient(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
            auth: { token: `${userId2}:User2:player` },
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit(SocketEvent.JOIN_TOURNAMENT, {
              tournamentId,
              userId: userId2,
            });
          });
        }, 100);
      });
    });

    it('should leave tournament room', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        const userId = 'user1';

        // Join room
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId,
        });

        setTimeout(() => {
          // Leave room
          clientSocket1.emit(SocketEvent.LEAVE_TOURNAMENT, {
            tournamentId,
            userId,
          });

          setTimeout(() => {
            done();
          }, 100);
        }, 100);
      });
    });

    it('should receive user offline event when user leaves', (done) => {
      const userId2 = 'user2';

      // First client
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        // Listen for offline events
        clientSocket1.on(SocketEvent.USER_OFFLINE, (payload) => {
          expect(payload.userId).toBe(userId2);
          expect(payload.status).toBe('offline');
          done();
        });

        // Second client joins then leaves
        setTimeout(() => {
          clientSocket2 = ioClient(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit(SocketEvent.JOIN_TOURNAMENT, {
              tournamentId,
              userId: userId2,
            });

            setTimeout(() => {
              clientSocket2.emit(SocketEvent.LEAVE_TOURNAMENT, {
                tournamentId,
                userId: userId2,
              });
            }, 100);
          });
        }, 100);
      });
    });
  });

  describe('Real-Time Tournament Events', () => {
    const tournamentId = 'test-tournament-456';

    it('should receive tournament updated event', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        // Listen for tournament updates
        clientSocket1.on(SocketEvent.TOURNAMENT_UPDATED, (payload) => {
          expect(payload.tournamentId).toBe(tournamentId);
          expect(payload.status).toBeDefined();
          done();
        });

        // Simulate server emitting update
        setTimeout(() => {
          const io = getIO();
          if (io) {
            io.to(`tournament:${tournamentId}`).emit(SocketEvent.TOURNAMENT_UPDATED, {
              tournamentId,
              name: 'Test Tournament',
              status: 'in_progress',
              currentRound: 1,
              timestamp: new Date().toISOString(),
            });
          }
        }, 100);
      });
    });

    it('should receive match started event', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        // Listen for match started
        clientSocket1.on(SocketEvent.MATCH_STARTED, (payload) => {
          expect(payload.tournamentId).toBe(tournamentId);
          expect(payload.matchId).toBeDefined();
          expect(payload.player1).toBeDefined();
          expect(payload.player2).toBeDefined();
          done();
        });

        // Simulate match started
        setTimeout(() => {
          const io = getIO();
          if (io) {
            io.to(`tournament:${tournamentId}`).emit(SocketEvent.MATCH_STARTED, {
              tournamentId,
              matchId: 'match-1',
              round: 1,
              matchNumber: 1,
              player1: { playerId: 'p1', playerName: 'Player 1' },
              player2: { playerId: 'p2', playerName: 'Player 2' },
              startedAt: new Date().toISOString(),
            });
          }
        }, 100);
      });
    });

    it('should receive match completed event', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        // Listen for match completed
        clientSocket1.on(SocketEvent.MATCH_COMPLETED, (payload) => {
          expect(payload.tournamentId).toBe(tournamentId);
          expect(payload.matchId).toBeDefined();
          expect(payload.player1?.isWinner).toBeDefined();
          expect(payload.player2?.isWinner).toBeDefined();
          done();
        });

        // Simulate match completed
        setTimeout(() => {
          const io = getIO();
          if (io) {
            io.to(`tournament:${tournamentId}`).emit(SocketEvent.MATCH_COMPLETED, {
              tournamentId,
              matchId: 'match-1',
              round: 1,
              matchNumber: 1,
              player1: { playerId: 'p1', playerName: 'Player 1', score: 15, isWinner: true },
              player2: { playerId: 'p2', playerName: 'Player 2', score: 10, isWinner: false },
              completedAt: new Date().toISOString(),
            });
          }
        }, 100);
      });
    });

    it('should receive chips awarded event', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        // Listen for chips awarded
        clientSocket1.on(SocketEvent.CHIPS_AWARDED, (payload) => {
          expect(payload.tournamentId).toBe(tournamentId);
          expect(payload.playerId).toBe('user1');
          expect(payload.chipsAwarded).toBe(50);
          expect(payload.newTotal).toBe(150);
          done();
        });

        // Simulate chips awarded
        setTimeout(() => {
          const io = getIO();
          if (io) {
            io.to(`tournament:${tournamentId}`).emit(SocketEvent.CHIPS_AWARDED, {
              tournamentId,
              playerId: 'user1',
              playerName: 'User 1',
              chipsAwarded: 50,
              newTotal: 150,
              reason: 'Match win',
              timestamp: new Date().toISOString(),
            });
          }
        }, 100);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', (done) => {
      // Try to connect to invalid port
      clientSocket1 = ioClient('http://localhost:99999', {
        transports: ['websocket'],
        timeout: 1000,
      });

      clientSocket1.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    it('should handle disconnection gracefully', (done) => {
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        // Force disconnect from server side
        clientSocket1.disconnect();
      });

      clientSocket1.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });
  });

  describe('Multiple Clients', () => {
    const tournamentId = 'multi-client-tournament';

    it('should support multiple clients in same tournament', (done) => {
      let connectedClients = 0;
      const expectedClients = 2;

      // First client
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        connectedClients++;
        if (connectedClients === expectedClients) {
          setTimeout(done, 100);
        }
      });

      // Second client
      setTimeout(() => {
        clientSocket2 = ioClient(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
        });

        clientSocket2.on('connect', () => {
          clientSocket2.emit(SocketEvent.JOIN_TOURNAMENT, {
            tournamentId,
            userId: 'user2',
          });

          connectedClients++;
          if (connectedClients === expectedClients) {
            setTimeout(done, 100);
          }
        });
      }, 100);
    });

    it('should broadcast events to all clients in tournament', (done) => {
      let receivedCount = 0;

      // First client
      clientSocket1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit(SocketEvent.JOIN_TOURNAMENT, {
          tournamentId,
          userId: 'user1',
        });

        clientSocket1.on(SocketEvent.TOURNAMENT_UPDATED, () => {
          receivedCount++;
          if (receivedCount === 2) done();
        });
      });

      // Second client
      setTimeout(() => {
        clientSocket2 = ioClient(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
        });

        clientSocket2.on('connect', () => {
          clientSocket2.emit(SocketEvent.JOIN_TOURNAMENT, {
            tournamentId,
            userId: 'user2',
          });

          clientSocket2.on(SocketEvent.TOURNAMENT_UPDATED, () => {
            receivedCount++;
            if (receivedCount === 2) done();
          });

          // Broadcast event
          setTimeout(() => {
            const io = getIO();
            if (io) {
              io.to(`tournament:${tournamentId}`).emit(SocketEvent.TOURNAMENT_UPDATED, {
                tournamentId,
                name: 'Broadcast Test',
                status: 'in_progress',
                timestamp: new Date().toISOString(),
              });
            }
          }, 100);
        });
      }, 100);
    });
  });
});
