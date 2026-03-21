import { Router, Request, Response } from 'express';
import { GeminiService, GeneratePlanInput } from '../gemini.service';

const router = Router();
const gemini = new GeminiService();

/**
 * POST /api/generate-plan
 *
 * Body (JSON):
 * {
 *   "profile": { ... },
 *   "daily_checkin": { ... },
 *   "logic_output": { ... }
 * }
 *
 * Response:
 * {
 *   "training": "...",
 *   "rehab": "...",
 *   "nutrition": "...",
 *   "why_changed": "...",
 *   "caution": "..."
 * }
 */
router.post('/generate-plan', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<GeneratePlanInput>;

    // ── Input validation ──────────────────────────────────────────
    if (!body.profile || !body.daily_checkin || !body.logic_output) {
      res.status(400).json({
        error: 'Missing required fields: profile, daily_checkin, logic_output',
      });
      return;
    }

    const input: GeneratePlanInput = {
      profile: body.profile,
      daily_checkin: body.daily_checkin,
      logic_output: body.logic_output,
    };

    console.log(
      `[generate-plan] Request for athlete: ${input.profile.name ?? 'Anonymous'}`,
    );

    // ── Call Gemini ───────────────────────────────────────────────
    const plan = await gemini.generatePlan(input);

    console.log('[generate-plan] Plan generated successfully');
    res.status(200).json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-plan] Error:', message);
    res.status(500).json({ error: 'Failed to generate plan', details: message });
  }
});

export default router;
