import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import planRoute from './routes/plan.route';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    // In production, replace '*' with your actual frontend origin
    origin: '*',
    methods: ['GET', 'POST'],
  }),
);
app.use(express.json({ limit: '1mb' }));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'criccoach-backend', timestamp: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', planRoute);

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ CricCoach backend running on http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/api/generate-plan`);
  console.log(`   GET  http://localhost:${PORT}/health`);

  if (!process.env.GOOGLE_API_KEY) {
    console.warn('⚠️  WARNING: GOOGLE_API_KEY is not set in .env!');
  } else {
    console.log('   🔑 Gemini API key loaded.');
  }
});
