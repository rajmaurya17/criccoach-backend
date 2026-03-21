import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AthleteProfile {
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  experience?: string;       // e.g. "3 years"
  bowling_style?: string;    // e.g. "right-arm fast"
  training_goal?: string;    // e.g. "Speed", "Strength", "Injury Prevention"
  diet_preference?: string;  // e.g. "Veg", "Non-Veg"
  injuries?: string[];       // e.g. ["Knee", "Lower Back"]
  weekly_overs?: number;
}

export interface DailyCheckIn {
  sleep_hours?: number;
  fatigue_level?: number;    // 1-5
  pain_level?: number;       // 0-10
  pain_areas?: string[];     // e.g. ["Right Knee", "Lower Back"]
  mood?: string;             // e.g. "Motivated", "Tired"
  overs_yesterday?: number;
  readiness_score?: number;  // 0-100
}

export interface LogicOutput {
  training_intensity?: string;   // e.g. "HIGH INTENSITY", "MEDIUM", "LOW", "RECOVERY ONLY"
  recommended_overs?: number;
  bowling_load_status?: string;  // e.g. "OPTIMAL", "HIGH LOAD", "LOW LOAD"
  recovery_percentage?: number;
  prohibited_drills?: string[];
  safety_flags?: string[];
}

export interface GeneratePlanInput {
  profile: AthleteProfile;
  daily_checkin: DailyCheckIn;
  logic_output: LogicOutput;
}

export interface GeneratedPlan {
  training: string;
  rehab: string;
  nutrition: string;
  why_changed: string;
  caution: string;
}

// ── Gemini Service ─────────────────────────────────────────────────────────

export class GeminiService {
  private readonly model;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generatePlan(input: GeneratePlanInput): Promise<GeneratedPlan> {
    const prompt = this.buildPrompt(input);

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();

    return this.parseResponse(text);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildPrompt(input: GeneratePlanInput): string {
    const { profile, daily_checkin, logic_output } = input;

    return `
You are a fast bowler performance assistant.
Use the athlete profile, today's check-in, and the system safety constraints below.
Do not diagnose injuries.
Do not override safety restrictions.
Do not suggest prohibited drills.
Keep the output concise, practical, and mobile-friendly.

---

ATHLETE PROFILE:
- Name: ${profile.name ?? 'Athlete'}
- Age: ${profile.age ?? 'Unknown'}
- Weight: ${profile.weight ? `${profile.weight}kg` : 'Unknown'}
- Height: ${profile.height ? `${profile.height}cm` : 'Unknown'}
- Experience: ${profile.experience ?? 'Unknown'}
- Bowling Style: ${profile.bowling_style ?? 'Fast bowler'}
- Training Goal: ${profile.training_goal ?? 'General fitness'}
- Diet Preference: ${profile.diet_preference ?? 'Not specified'}
- Known Injuries: ${profile.injuries?.join(', ') || 'None reported'}
- Weekly Overs Target: ${profile.weekly_overs ?? 'Not set'}

TODAY'S CHECK-IN:
- Sleep: ${daily_checkin.sleep_hours ?? 'Unknown'} hours
- Fatigue Level: ${daily_checkin.fatigue_level ?? 'Unknown'}/5
- Pain Level: ${daily_checkin.pain_level ?? 0}/10
- Pain Areas: ${daily_checkin.pain_areas?.join(', ') || 'None reported'}
- Mood: ${daily_checkin.mood ?? 'Not specified'}
- Overs Bowled Yesterday: ${daily_checkin.overs_yesterday ?? 0}
- Readiness Score: ${daily_checkin.readiness_score ?? 50}/100

SYSTEM SAFETY CONSTRAINTS:
- Training Intensity Allowed: ${logic_output.training_intensity ?? 'MEDIUM'}
- Recommended Overs Today: ${logic_output.recommended_overs ?? 0}
- Bowling Load Status: ${logic_output.bowling_load_status ?? 'OPTIMAL'}
- Recovery Percentage: ${logic_output.recovery_percentage ?? 50}%
- Prohibited Drills: ${logic_output.prohibited_drills?.join(', ') || 'None'}
- Safety Flags: ${logic_output.safety_flags?.join(', ') || 'None'}

---

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, raw JSON only):
{
  "training": "2-3 sentence specific training plan for today based on the athlete's readiness and goal",
  "rehab": "2-3 sentence targeted rehab/recovery advice based on pain areas and injuries",
  "nutrition": "2-3 sentence nutrition advice tailored to training intensity and diet preference",
  "why_changed": "1-2 sentences explaining why today's plan differs from a standard session (reference readiness/pain)",
  "caution": "1 short sentence safety warning or motivational note"
}
`.trim();
  }

  private parseResponse(raw: string): GeneratedPlan {
    // Strip markdown code fences if model wraps the response
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as GeneratedPlan;

      // Validate required fields
      const required: (keyof GeneratedPlan)[] = [
        'training', 'rehab', 'nutrition', 'why_changed', 'caution',
      ];
      for (const field of required) {
        if (!parsed[field] || typeof parsed[field] !== 'string') {
          throw new Error(`Missing or invalid field: ${field}`);
        }
      }

      return parsed;
    } catch (err) {
      throw new Error(
        `Failed to parse Gemini response as JSON. Raw response: ${raw.slice(0, 300)}`,
      );
    }
  }
}
