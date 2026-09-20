import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface StoredData {
  [syncCode: string]: {
    syncCode: string;
    config: any;
    dailyExpenses: any[];
    lastUpdated: number;
    license?: any;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'budgets.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadBudgets(): StoredData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading budgets file:', err);
  }
  return {};
}

function saveBudgets(data: StoredData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing budgets file:', err);
  }
}

// In-memory store initialized from disk
let budgetsCache: StoredData = loadBudgets();

// Helper to find the richest / most complete existing budget in the store
function getBestExistingBudget(): any {
  if (budgetsCache['MI-PRESUPUESTO']) {
    return budgetsCache['MI-PRESUPUESTO'];
  }
  const keys = Object.keys(budgetsCache);
  // Find any room that has daily expenses loaded
  for (const k of keys) {
    const item = budgetsCache[k];
    if (item && Array.isArray(item.dailyExpenses) && item.dailyExpenses.length > 0) {
      return item;
    }
  }
  // Fallback to first available room
  if (keys.length > 0 && budgetsCache[keys[0]]) {
    return budgetsCache[keys[0]];
  }
  return getDefaultBudgetData('MI-PRESUPUESTO');
}

// Ensure MI-PRESUPUESTO exists and contains the user's data on startup
if (!budgetsCache['MI-PRESUPUESTO']) {
  const best = getBestExistingBudget();
  budgetsCache['MI-PRESUPUESTO'] = {
    ...best,
    syncCode: 'MI-PRESUPUESTO',
  };
  saveBudgets(budgetsCache);
}

// Default initial state generator
function getDefaultBudgetData(syncCode: string) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return {
    syncCode,
    config: {
      salary: 1200000,
      savingsGoal: 200000,
      fixedExpenses: [
        { id: 'f-1', name: 'Alquiler / Hipoteca', amount: 350000, category: 'Vivienda', dueDate: 5, isPaid: true },
        { id: 'f-2', name: 'Servicios (Luz, Agua, Gas)', amount: 65000, category: 'Servicios', dueDate: 10, isPaid: true },
        { id: 'f-3', name: 'Internet y Telefonía', amount: 35000, category: 'Servicios', dueDate: 15, isPaid: false },
        { id: 'f-4', name: 'Seguro Médico / Obra Social', amount: 50000, category: 'Salud', dueDate: 20, isPaid: false },
        { id: 'f-5', name: 'Suscripciones (Streaming)', amount: 20000, category: 'Ocio', dueDate: 12, isPaid: true },
      ],
      currency: '$',
      month: currentMonth,
    },
    dailyExpenses: [
      {
        id: 'd-1',
        amount: 8500,
        category: 'Comida y Supermercado',
        description: 'Supermercado compras semanales',
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Tarjeta de Débito',
        createdAt: Date.now() - 1000 * 60 * 60 * 3,
      },
      {
        id: 'd-2',
        amount: 2500,
        category: 'Café y Salidas',
        description: 'Café con tostadas',
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Efectivo',
        createdAt: Date.now() - 1000 * 60 * 60 * 1,
      },
    ],
    lastUpdated: Date.now(),
    license: {
      plan: 'free',
      isActive: false,
      expiresAt: undefined,
      licenseKey: undefined,
    },
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '10mb' }));

  // REST API Routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // List saved budget rooms for easy recovery / discovery across devices
  app.get('/api/budgets/rooms', (req, res) => {
    const rooms = Object.keys(budgetsCache).map((code) => {
      const b = budgetsCache[code];
      const expenseCount = Array.isArray(b?.dailyExpenses) ? b.dailyExpenses.length : 0;
      const salary = b?.config?.salary || 0;
      return {
        syncCode: code,
        expenseCount,
        salary,
        lastUpdated: b?.lastUpdated || 0,
        hasExpenses: expenseCount > 0,
      };
    });
    // Sort so rooms with most expenses or most recently updated appear first
    rooms.sort((a, b) => b.lastUpdated - a.lastUpdated);
    res.json(rooms);
  });

  // Get budget data
  app.get('/api/budget/:syncCode', (req, res) => {
    const syncCode = req.params.syncCode.toUpperCase();
    if (syncCode === 'MI-PRESUPUESTO' || syncCode === 'DEFAULT' || syncCode === 'MAIN') {
      return res.json(budgetsCache['MI-PRESUPUESTO'] || getBestExistingBudget());
    }

    if (!budgetsCache[syncCode]) {
      // Never wipe out with blank default - always seed from the user's primary saved budget!
      const best = budgetsCache['MI-PRESUPUESTO'] || getBestExistingBudget();
      budgetsCache[syncCode] = {
        ...best,
        syncCode,
      };
      saveBudgets(budgetsCache);
    }
    res.json(budgetsCache[syncCode]);
  });

  // Save budget data
  app.post('/api/budget/:syncCode', (req, res) => {
    const syncCode = req.params.syncCode.toUpperCase();
    const payload = req.body;
    
    const updated = {
      ...payload,
      syncCode,
      lastUpdated: Date.now(),
    };
    budgetsCache[syncCode] = updated;

    // Always keep MI-PRESUPUESTO mirrored as the master user budget
    budgetsCache['MI-PRESUPUESTO'] = {
      ...updated,
      syncCode: 'MI-PRESUPUESTO',
    };
    saveBudgets(budgetsCache);
    
    // Broadcast to WebSocket clients in this room and in MI-PRESUPUESTO
    broadcastToRoom(syncCode, {
      type: 'STATE_CHANGED',
      payload: updated,
      sender: 'REST',
    });
    if (syncCode !== 'MI-PRESUPUESTO') {
      broadcastToRoom('MI-PRESUPUESTO', {
        type: 'STATE_CHANGED',
        payload: budgetsCache['MI-PRESUPUESTO'],
        sender: 'REST',
      });
    }

    res.json({ success: true, data: budgetsCache[syncCode] });
  });

  // HTTP Server & WebSockets
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of client -> syncCode
  const clientRooms = new Map<WebSocket, string>();

  function getClientsInRoom(room: string): WebSocket[] {
    const clients: WebSocket[] = [];
    clientRooms.forEach((clientRoom, client) => {
      if (clientRoom === room && client.readyState === WebSocket.OPEN) {
        clients.push(client);
      }
    });
    return clients;
  }

  function broadcastToRoom(room: string, message: any, excludeClient?: WebSocket) {
    const payloadStr = JSON.stringify(message);
    clientRooms.forEach((clientRoom, client) => {
      if (clientRoom === room && client !== excludeClient && client.readyState === WebSocket.OPEN) {
        try {
          client.send(payloadStr);
        } catch (e) {
          console.error('Failed to send to client', e);
        }
      }
    });
  }

  function broadcastRoomCount(room: string) {
    const count = getClientsInRoom(room).length;
    const msg = JSON.stringify({ type: 'ROOM_COUNT', count });
    getClientsInRoom(room).forEach(client => {
      try {
        client.send(msg);
      } catch (e) {}
    });
  }

  wss.on('connection', (ws) => {
    // Send welcome ping
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connected' }));

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        
        if (data.type === 'JOIN') {
          const syncCode = (data.syncCode || 'MI-PRESUPUESTO').toUpperCase();
          clientRooms.set(ws, syncCode);
          
          const clientPayload = data.payload;
          const clientLastUpdated = Number(data.lastUpdated) || 0;
          let serverData = budgetsCache[syncCode];

          if (!serverData) {
            // Room not in memory/disk yet
            if (clientPayload && (data.hasCustomData || (Array.isArray(clientPayload.dailyExpenses) && clientPayload.dailyExpenses.length > 0))) {
              console.log(`Restoring room ${syncCode} from client's persistent state`);
              budgetsCache[syncCode] = {
                ...clientPayload,
                syncCode,
                lastUpdated: clientLastUpdated || Date.now(),
              };
            } else {
              // Retrieve user's primary saved budget so data is never lost!
              const best = budgetsCache['MI-PRESUPUESTO'] || getBestExistingBudget();
              budgetsCache[syncCode] = {
                ...best,
                syncCode,
              };
            }
            // Mirror to primary master
            budgetsCache['MI-PRESUPUESTO'] = {
              ...budgetsCache[syncCode],
              syncCode: 'MI-PRESUPUESTO',
            };
            saveBudgets(budgetsCache);
          } else {
            // Server already has data. Check if client has newer local offline edits
            if (clientPayload && clientLastUpdated > (serverData.lastUpdated || 0)) {
              console.log(`Updating room ${syncCode} with newer client edits`);
              budgetsCache[syncCode] = {
                ...clientPayload,
                syncCode,
                lastUpdated: clientLastUpdated,
              };
              budgetsCache['MI-PRESUPUESTO'] = {
                ...clientPayload,
                syncCode: 'MI-PRESUPUESTO',
                lastUpdated: clientLastUpdated,
              };
              saveBudgets(budgetsCache);
              broadcastToRoom(syncCode, {
                type: 'STATE_CHANGED',
                payload: budgetsCache[syncCode],
              }, ws);
            }
          }
          
          // Send confirmed state to newly joined client
          ws.send(JSON.stringify({
            type: 'SYNC_STATE',
            payload: budgetsCache[syncCode],
          }));
          
          // Broadcast updated room peer count
          broadcastRoomCount(syncCode);
        } else if (data.type === 'UPDATE_STATE') {
          const syncCode = (data.syncCode || 'MI-PRESUPUESTO').toUpperCase();
          if (data.payload) {
            const updated = {
              ...data.payload,
              syncCode,
              lastUpdated: Date.now(),
            };
            budgetsCache[syncCode] = updated;
            budgetsCache['MI-PRESUPUESTO'] = {
              ...updated,
              syncCode: 'MI-PRESUPUESTO',
            };
            saveBudgets(budgetsCache);
            
            // Broadcast state to all other clients in room and in MI-PRESUPUESTO
            broadcastToRoom(syncCode, {
              type: 'STATE_CHANGED',
              payload: updated,
            }, ws);
            if (syncCode !== 'MI-PRESUPUESTO') {
              broadcastToRoom('MI-PRESUPUESTO', {
                type: 'STATE_CHANGED',
                payload: budgetsCache['MI-PRESUPUESTO'],
              });
            }
          }
        } else if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      const room = clientRooms.get(ws);
      clientRooms.delete(ws);
      if (room) {
        broadcastRoomCount(room);
      }
    });

    ws.on('error', (err) => {
      console.error('WS client error:', err);
    });
  });

  // Serve static files from public directory (PWA assets, sw.js, manifest.json, icons)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
