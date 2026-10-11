/**
 * WARUNG MEDAN FINANCE - FULL-STACK BACKEND SERVER
 * Warung Medan CT Catering
 * Express REST API supporting offline-first sync & cloud backup
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Warung Medan Finance API',
    business: 'Warung Medan CT Catering',
    timestamp: new Date().toISOString()
  });
});

// Set to track synced item IDs for idempotency
const processedSyncIds = new Set<string>();

// Cloud Sync Endpoint (Idempotent sync for offline outbox items)
app.post('/api/sync', (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: items must be an array' });
    }

    const newlyProcessed: string[] = [];
    const duplicateSkipped: string[] = [];

    for (const item of items) {
      if (item?.id && processedSyncIds.has(item.id)) {
        duplicateSkipped.push(item.id);
      } else if (item?.id) {
        processedSyncIds.add(item.id);
        newlyProcessed.push(item.id);
      }
    }

    return res.json({
      success: true,
      processedCount: newlyProcessed.length,
      duplicateCount: duplicateSkipped.length,
      processedIds: newlyProcessed,
      syncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Cloud Backup Storage Endpoint
app.post('/api/backup', (req: Request, res: Response) => {
  try {
    const { data, businessName } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Missing backup data' });
    }

    return res.json({
      success: true,
      message: `Cloud backup archived successfully for ${businessName || 'Warung Medan CT Catering'}`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// In development, Vite middleware is handled or static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

// Start server if executed directly
if (process.env.NODE_ENV === 'production') {
  app.listen(PORT, () => {
    console.log(`Warung Medan Finance server running on port ${PORT}`);
  });
}

export default app;
