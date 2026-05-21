import axios from 'axios';
import { executeAction } from '../utils/actionExecutor';
import { ApiKeyService } from '../services/ApiKeyService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export interface MedicineAdherence {
  medicineName: string;
  totalDoses: number;
  takenDoses: number;
  skippedDoses: number;
  missedDoses: number;
  adherencePercent: number;
  lastTaken: string | null;
  streak: number;
  startDate?: string;
}

interface PatientContext {
  name: string; age: number; gender: string; city: string;
  conditions: string[]; medicines: string[]; allergies: string;
  recent_tests: string; language: string; languageName: string;
  nativeLanguageName: string;
  adherence?: MedicineAdherence[];
}

type Tier = 'action' | 'complex' | 'simple';

// ─── Constants ────────────────────────────────────────────────────────────────

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getGeminiUrl(): string {
  const key = ApiKeyService.getGeminiKey();
  if (!key) throw new Error('Gemini API key is missing. Please set it in app settings.');
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
}

// ─── Tier detection ───────────────────────────────────────────────────────────
// RULE: More specific patterns first. No word should appear in two tiers.
// ACTION  = user wants the APP to DO something
// COMPLEX = medical reasoning, analysis, verification needed
// SIMPLE  = greeting, status check, basic timing question, small talk

// Exact phrase patterns (checked before word triggers)
const ACTION_PHRASES = [
  'delete my', 'remove my', 'stop my', 'stop taking',
  'change timing', 'change the timing', 'update timing', 'update the timing',
  'reschedule my', 'set timing', 'set time for',
  'go to', 'take me to', 'open the', 'navigate to',
  'show me insights', 'show me analysis', 'show my insights', 'show my analysis',
  'scan medicine', 'scan report', 'medicine scan', 'report scan',
  'delete report', 'delete this report', 'remove report',
];

// Single-word/short triggers for complex medical queries
const COMPLEX_WORDS = [
  // clinical
  'report', 'result', 'prescription', 'prescribed', 'prescribed me',
  'interaction', 'interact', 'contraindication', 'contraindicated',
  'side effect', 'adverse', 'reaction', 'allerg',
  'safe', 'unsafe', 'dangerous', 'risk',
  // lab values
  'hba1c', 'hemoglobin', 'haemoglobin', 'creatinine', 'cholesterol',
  'triglyceride', 'bilirubin', 'sgpt', 'sgot', 'tsh', 'platelet',
  'uric acid', 'vitamin', 'calcium', 'potassium', 'sodium',
  // symptoms
  'symptom', 'fever', 'pain', 'ache', 'headache', 'nausea',
  'vomit', 'dizzi', 'weak', 'tired', 'fatigue', 'bleed',
  'swollen', 'swelling', 'rash', 'itch', 'breath',
  // medicine reasoning
  'can i take', 'should i take', 'is it okay', 'is it safe',
  'why am i taking', 'what is this medicine', 'what does it do',
  'how does it work', 'mechanism', 'dosage', 'dose', 'overdose',
  'generic', 'substitute', 'alternative', 'brand',
  'empty stomach', 'after food', 'before food', 'with water',
  'combine', 'together with', 'along with',
  // adherence analysis
  'skipped', 'missed', 'forgot', 'adherence', 'compliance',
  'how many times', 'how often', 'pattern', 'history',
  'how am i doing', 'am i regular',
  // doctor verification
  'doctor said', 'doctor told', 'doctor prescribed', 'doctor recommended',
  'second opinion', 'is doctor right', 'should i follow',
  // conditions
  'diabetes', 'hypertension', 'bp', 'blood pressure', 'thyroid',
  'kidney', 'liver', 'heart', 'sugar level', 'glucose',
  // diet/lifestyle
  'diet', 'food', 'eat', 'drink', 'alcohol', 'smoke', 'exercise',
  'pregnant', 'pregnancy', 'breastfeed',
  // comparison/advice
  'which is better', 'compare', 'difference between', 'vs',
  'should i', 'can i', 'is it okay', 'what if',
];

function detectTier(message: string): Tier {
  const lower = message.toLowerCase().trim();

  // 1. Check action phrases first (most specific)
  if (ACTION_PHRASES.some(p => lower.includes(p))) return 'action';

  // 2. Check complex medical triggers
  if (COMPLEX_WORDS.some(w => lower.includes(w))) return 'complex';

  // 3. Short messages (≤6 words) with no medical content = simple
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 6) return 'simple';

  // 4. Longer messages without medical keywords = complex
  // (better to over-analyze than under-answer)
  return 'complex';
}

// ─── Patient block (shared across all prompts) ────────────────────────────────

function buildPatientBlock(ctx: PatientContext): string {
  const adherenceBlock = ctx.adherence?.length
  ? '\nMedicine Adherence:\n' +
    ctx.adherence.map(a => {

      // No start date available
      if (!a.startDate) {
        return `  • ${a.medicineName}: Adherence tracking data is incomplete.`;
      }

      const startDate = new Date(a.startDate);
      const now = new Date();

      // Invalid date safety
      if (isNaN(startDate.getTime())) {
        return `  • ${a.medicineName}: Invalid medicine start date.`;
      }

      const diffDays = Math.floor(
        (now.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24)
      );

      // Medicine course not started yet
      if (diffDays < 0) {
        return `  • ${a.medicineName}: Medicine course has not started yet.`;
      }

      // Newly started medicine
      if (diffDays < 3) {
        return `  • ${a.medicineName}: Adherence tracking has just started (${diffDays} day${diffDays !== 1 ? 's' : ''}).`;
      }

      // Initial tracking phase
      if (diffDays < 7) {
        return `  • ${a.medicineName}: Initial adherence tracking is in progress (${a.adherencePercent}% adherence so far).`;
      }

      // Proper adherence analysis
      let status = '';

      if (a.adherencePercent >= 90) {
        status = 'Patient is taking the medicine consistently.';
      } else if (a.adherencePercent >= 70) {
        status = 'Patient may be missing some doses.';
      } else {
        status = 'Patient is not taking the medicine regularly.';
      }

      return (
        `  • ${a.medicineName}: ${a.takenDoses}/${a.totalDoses} taken` +
        ` (${a.adherencePercent}%)` +
        ` | skipped: ${a.skippedDoses}` +
        ` | missed: ${a.missedDoses}` +
        ` | current streak: ${a.streak} days` +
        (a.lastTaken
          ? ` | last taken: ${a.lastTaken}`
          : ' | never taken') +
        `\n    → ${status}`
      );
    }).join('\n')
  : '';

  return `--- PATIENT PROFILE ---
Name: ${ctx.name} | Age: ${ctx.age}y | Gender: ${ctx.gender} | City: ${ctx.city}
Conditions: ${ctx.conditions.join(', ') || 'none reported'}
Current medicines: ${ctx.medicines.join(', ') || 'none'}
Allergies: ${ctx.allergies || 'none reported'}
Recent test results: ${ctx.recent_tests || 'none'}${adherenceBlock}
-----------------------`;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSimplePrompt(ctx: PatientContext): string {
  return `You are MediSaaN AI, a warm and knowledgeable health assistant for Indian patients.
Respond in English only. Be like a caring, knowledgeable elder sibling.

RULES:
- Keep it SHORT: 1–3 sentences max for greetings/simple questions.
- Be warm and direct. No filler like "great question!" or "I understand".
- You have real medical knowledge — use it. Don't deflect to "ask your doctor".
- Only mention emergency care for: chest pain, stroke, severe bleeding, unconsciousness.

${buildPatientBlock(ctx)}`;
}

function buildActionPrompt(ctx: PatientContext): string {
  return `You are MediSaaN AI performing an in-app action for the patient.
Your ENTIRE response must be a single valid JSON object. No intro, no explanation, no markdown.

AVAILABLE ACTIONS (pick exactly one):
{"action": "stop_medicine",        "params": {"medicineName": "<name>", "reason": "<optional>"}}
{"action": "delete_medicine",      "params": {"medicineName": "<name>"}}
{"action": "update_medicine_timing","params": {"medicineName": "<name>", "newTimes": ["HH:MM", ...]}}
{"action": "delete_report",        "params": {"reportId": <number>}}
{"action": "navigate_to_screen",   "params": {"screenName": "medicine_scan|report_scan|chat|medicines|home|settings"}}
{"action": "get_medicine_insights","params": {}}
{"action": "get_health_analysis",  "params": {}}

MEDICINE NAME MATCHING: Match medicine names case-insensitively to the patient's medicine list.
If the user says "metformin" and patient has "Metformin 500mg", use "Metformin 500mg".
If you cannot confidently match an action, respond: {"action": "unknown", "params": {"message": "Could not understand the action"}}

${buildPatientBlock(ctx)}`;
}

function buildComplexPrompt(ctx: PatientContext): string {
  return `You are MediSaaN AI — a highly capable medical AI combining the expertise of a senior physician, clinical pharmacist, and diagnostic analyst. You serve Indian patients directly.

## PRIME DIRECTIVE
The patient came to YOU instead of a doctor. Honor that trust by giving real, complete, personalized answers. Vague deflections are a failure.

## REASONING PROTOCOL
Before writing your response, mentally run through:
1. INTERACTION CHECK — Does what they're asking conflict with any of their current medicines?
2. CONDITION CHECK — Do their conditions (diabetes, hypertension, etc.) change this answer?
3. ALLERGY CHECK — Any allergy risk?
4. LAB CHECK — Do their recent test values inform this answer?
5. DEMOGRAPHICS — Does age or gender affect the recommendation?
Then answer with those checks baked in — not as a list, but woven into your response naturally.

## DOCTOR PRESCRIPTION VERIFICATION
When patient mentions a doctor's prescription or advice:
- Run the REASONING PROTOCOL above against it
- CONFIRM with specific reasoning if it checks out: "Yes, [medicine] makes sense here because [reason tied to their data]"
- FLAG concerns if something is off: "Given your [specific condition/medicine/allergy], this is worth questioning because [specific clinical reason]"
- You are allowed to say a prescription seems inappropriate — that's your job as a second opinion
- NEVER say "your doctor knows best" without analysis. That's not an answer.

## ADHERENCE ANALYSIS
When patient's adherence data is present and relevant:
- Name the specific medicines they're struggling with
- Explain the clinical consequence of skipping THAT specific medicine (e.g., skipping metformin → erratic glucose, not just "it's bad")
- Offer ONE practical improvement tip suited to their lifestyle
- Celebrate genuine streaks: "Your 12-day streak on atorvastatin is really good — keep it up"

## LAB REPORT INTERPRETATION
When interpreting values:
- State what the value means (normal/abnormal and by how much)
- Explain what that organ/marker does in simple terms
- Connect it to their existing conditions if relevant
- Say clearly what action (if any) makes sense

## RESPONSE FORMAT
- Conversational prose, not bullet points (unless listing 3+ items)
- Length: match complexity — 2 sentences for a simple drug question, 5–8 for a full analysis
- No hedging phrases: not "it might be", not "you should probably", not "consider possibly"
- No filler: not "great question", not "I understand your concern"
- End with a clear takeaway when the topic warrants it

## WHEN TO REFER TO A DOCTOR
ONLY these situations:
- True emergencies: chest pain, stroke signs, anaphylaxis, loss of consciousness, uncontrolled bleeding
- Needs physical examination: acute abdomen, suspected fracture, eye/ear inspection
- Symptoms worsening despite 7+ days of appropriate treatment
- Needs a prescription (you advise but cannot prescribe)

${buildPatientBlock(ctx)}`;
}

// ─── Context window management ────────────────────────────────────────────────
// Keep last N messages by tier — actions need minimal history,
// complex queries benefit from more context

const TIER_HISTORY_LIMIT: Record<Tier, number> = {
  action:  4,   // just enough to understand what they want to act on
  simple:  6,   // light context
  complex: 12,  // needs full conversation context for medical reasoning
};

function trimMessages(messages: Message[], tier: Tier): Message[] {
  const limit = TIER_HISTORY_LIMIT[tier];
  const nonSystem = messages.filter(m => m.role !== 'system');
  // Always keep the latest messages; if over limit, slice from end
  return nonSystem.slice(-limit);
}

// ─── API callers ──────────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  messages: Message[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await axios.post(
    getGeminiUrl(),
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        // Reduce repetition
        candidateCount: 1,
      },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  const text: string | undefined = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini empty response. Status: ${res.data?.candidates?.[0]?.finishReason}`);
  return text;
}

async function callGroq(
  systemPrompt: string,
  messages: Message[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  const groqKey = ApiKeyService.getGroqKey();
  if (!groqKey) throw new Error('Groq API key is missing. Please set it in app settings.');

  const res = await axios.post(
    GROQ_URL,
    {
      model: 'llama-3.3-70b-versatile', // stronger model for better quality fallback
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    },
    {
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  const text: string | undefined = res.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned empty response');
  return text;
}

// ─── JSON action extractor ────────────────────────────────────────────────────

function extractAction(response: string): { action: string; params: any } | null {
  try {
    // Strip markdown code fences if present
    const cleaned = response.replace(/^```(?:json)?\n?|\n?```$/gm, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.action === 'string' && parsed.params !== undefined) {
      return parsed;
    }
  } catch {
    // Try to find JSON embedded in a longer response (Groq sometimes adds explanation)
    const jsonMatch = response.match(/\{[\s\S]*"action"[\s\S]*"params"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.action === 'string') return parsed;
      } catch { /* not valid JSON */ }
    }
  }
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function chatWithBot(
  messages: Message[],
  patientContext: PatientContext,
  isVoiceMode: boolean = false
): Promise<string> {

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const tier = detectTier(lastUserMsg);

  const tierConfig: Record<Tier, { maxTokens: number; temp: number }> = {
    action:  { maxTokens: 200,  temp: 0.1 },
    simple:  { maxTokens: 300,  temp: 0.6 },
    complex: { maxTokens: 1200, temp: 0.4 },
  };

  const { maxTokens, temp } = tierConfig[tier];

  const promptBuilders: Record<Tier, (ctx: PatientContext) => string> = {
    action:  buildActionPrompt,
    simple:  buildSimplePrompt,
    complex: buildComplexPrompt,
  };

  let systemPrompt = promptBuilders[tier](patientContext);
  if (isVoiceMode) {
    systemPrompt += '\n\nVOICE MODE: Use flowing natural sentences only. No bullet points, no markdown, no lists.';
  }

  const trimmedMessages = trimMessages(messages, tier);

  // ── Try Gemini → fallback to Groq ──
  let response: string;
  let provider = 'Gemini';

  try {
    response = await callGemini(systemPrompt, trimmedMessages, maxTokens, temp);
  } catch (geminiErr: any) {
    console.warn('[MediSaaN] Gemini failed →', geminiErr?.response?.data?.error?.message ?? geminiErr.message);
    provider = 'Groq';
    try {
      response = await callGroq(systemPrompt, trimmedMessages, maxTokens, temp);
    } catch (groqErr: any) {
      console.error('[MediSaaN] Groq also failed →', groqErr?.response?.data?.error?.message ?? groqErr.message);
      throw new Error('Service temporarily unavailable. Please check your connection and try again.');
    }
  }

  console.log(`[MediSaaN] tier=${tier} | provider=${provider} | tokens≤${maxTokens}`);

  // ── Check if response is an app action ──
  const action = extractAction(response);
  if (action) {
    if (action.action === 'unknown') {
      return action.params?.message ?? "Sorry, I couldn't understand what action you want. Can you rephrase?";
    }
    return await executeAction(action.action, action.params, patientContext);
  }

  return response;
}