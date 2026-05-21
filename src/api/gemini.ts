import axios from 'axios';
import { ApiKeyService } from '../services/ApiKeyService';

// ─── Constants ────────────────────────────────────────────────────────────────

const GROQ_URL          = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TEXT_MODEL   = 'llama-3.3-70b-versatile';

function getGeminiUrl(): string {
  const key = ApiKeyService.getGeminiKey();
  if (!key) throw new Error('Gemini API key is missing. Please set it in app settings.');
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
}

function getGroqKey(): string {
  const key = ApiKeyService.getGroqKey();
  if (!key) throw new Error('Groq API key is missing. Please set it in app settings.');
  return key;
}

// ─── Shared JSON parser ───────────────────────────────────────────────────────

function parseJsonResponse(text: string): any {
  const cleaned = text.replace(/```json\n?|\n?```/gm, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(cleaned.substring(start, end + 1));
      } catch {
        console.error('[MediSaaN] JSON parse failed. Tail:', cleaned.slice(-150));
        throw new Error('AI response was incomplete or malformed. Please try again.');
      }
    }
    throw new Error('Could not parse AI response as JSON.');
  }
}

// ─── Gemini callers ───────────────────────────────────────────────────────────

async function callGeminiVision(
  prompt: string,
  base64Images: string | string[],
  mimeType = 'image/jpeg'
): Promise<any> {
  const images = Array.isArray(base64Images) ? base64Images : [base64Images];
  const res = await axios.post(
    getGeminiUrl(),
    {
      contents: [{
        parts: [
          ...images.map(data => ({ inline_data: { mime_type: mimeType, data } })),
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  const text: string = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error(`Gemini vision empty. Reason: ${res.data?.candidates?.[0]?.finishReason}`);
  return parseJsonResponse(text);
}

async function callGeminiText(prompt: string): Promise<any> {
  const res = await axios.post(
    getGeminiUrl(),
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
  );

  const text: string = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error(`Gemini text empty. Reason: ${res.data?.candidates?.[0]?.finishReason}`);
  return parseJsonResponse(text);
}

// ─── Groq callers ─────────────────────────────────────────────────────────────

async function callGroqVision(
  prompt: string,
  base64Images: string | string[],
  mimeType = 'image/jpeg'
): Promise<any> {
  const images = Array.isArray(base64Images) ? base64Images : [base64Images];
  const res = await axios.post(
    GROQ_URL,
    {
      model: GROQ_VISION_MODEL,
      max_tokens: 4096,
      temperature: 0.1,
      // JSON mode — llama-4-scout supports it
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          ...images.map(data => ({
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${data}` },
          })),
          { type: 'text', text: prompt },
        ],
      }],
    },
    {
      headers: {
        'Authorization': `Bearer ${getGroqKey()}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const text: string = res.data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Groq vision returned empty response');
  return parseJsonResponse(text);
}

async function callGroqText(prompt: string): Promise<any> {
  const res = await axios.post(
    GROQ_URL,
    {
      model: GROQ_TEXT_MODEL,
      max_tokens: 2048,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: prompt + '\n\nRespond ONLY with a valid JSON object. No markdown, no explanation.',
      }],
    },
    {
      headers: {
        'Authorization': `Bearer ${getGroqKey()}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  const text: string = res.data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Groq text returned empty response');
  return parseJsonResponse(text);
}

// ─── Unified callers with fallback ───────────────────────────────────────────

async function callVision(
  prompt: string,
  base64Images: string | string[],
  mimeType = 'image/jpeg'
): Promise<any> {
  try {
    const result = await callGeminiVision(prompt, base64Images, mimeType);
    console.log('[MediSaaN] Vision: Gemini');
    return result;
  } catch (geminiErr: any) {
    console.warn('[MediSaaN] Gemini vision failed →', geminiErr?.response?.data?.error?.message ?? geminiErr.message);
    try {
      const result = await callGroqVision(prompt, base64Images, mimeType);
      console.log('[MediSaaN] Vision: Groq (fallback)');
      return result;
    } catch (groqErr: any) {
      console.error('[MediSaaN] Groq vision also failed →', groqErr?.response?.data?.error?.message ?? groqErr.message);
      throw new Error('Image analysis unavailable right now. Please check your connection and try again.');
    }
  }
}

async function callText(prompt: string): Promise<any> {
  try {
    const result = await callGeminiText(prompt);
    console.log('[MediSaaN] Text: Gemini');
    return result;
  } catch (geminiErr: any) {
    console.warn('[MediSaaN] Gemini text failed →', geminiErr?.response?.data?.error?.message ?? geminiErr.message);
    try {
      const result = await callGroqText(prompt);
      console.log('[MediSaaN] Text: Groq (fallback)');
      return result;
    } catch (groqErr: any) {
      console.error('[MediSaaN] Groq text also failed →', groqErr?.response?.data?.error?.message ?? groqErr.message);
      throw new Error('Service temporarily unavailable. Please try again.');
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function precheckMedicine(base64Image: string) {
  const prompt = `Decide if this camera image clearly shows a medicine — tablet, capsule, strip, bottle, syrup, injection, or medicine packet.

Respond ONLY in valid JSON:
{"is_medicine": true, "message": "Medicine detected! Hold steady..."}

If not medicine-related:
{"is_medicine": false, "message": "This is not a Medicine. Please align properly."}`;
  return callVision(prompt, base64Image);
}

export async function scanMedicine(base64Image: string, patientContext: any) {
  const prompt = `You are MediSaaN AI, a smart but simple health companion for ordinary Indian people.

Think deeply like an experienced doctor internally,
but explain medicines in very simple everyday English.

Most users are not medically educated.
Some users may have very little education.

IMPORTANT:
- Explain in simple words only
- Keep sentences short
- Never sound like a hospital report
- Avoid difficult medical terms
- Explain what the medicine actually does in real life
- Explain dangers in a calm simple way
- Patient should understand without Google
- If a normal Indian family member cannot easily understand the sentence, rewrite it simpler.

Decide whether the image clearly shows a medicine, strip, bottle, tablet, capsule, injection, syrup, or medicine packaging.
If it is NOT medicine-related, do not guess a medicine name.

Patient: ${patientContext.age}y ${patientContext.gender}, conditions: ${(patientContext.conditions || []).join(', ')}, medicines: ${(patientContext.medicines || []).join(', ')}.

Respond ONLY in English. Respond ONLY in valid JSON (no markdown):
{
  "is_medicine": true,
  "not_medicine_message": null,
  "medicine_name": "Exact Name from packaging (Sentence case)",
  "generic_name": "Generic/Salt name or null",
  "simple_description": "ONE sentence — what this medicine is for",
  "uses": "uses in simple English",
  "dosage_instructions": "typical dosage",
  "side_effects": "common side effects",
  "warnings": "important warnings",
  "how_to_take": "before_food or after_food or with_food or anytime",
  "drug_interactions": "interactions with patient's current medicines, or null",
  "identified_confidence": "high or medium or low",
  "medicine_form": "tablet or capsule or syrup or injection or cream or drops or powder or patch or other",
  "strength": "e.g. 500mg or null",
  "category": "antibiotic or painkiller or diabetes or bp or thyroid or vitamin or other"
}

If not medicine-related:
{
  "is_medicine": false,
  "not_medicine_message": "This is not a medicine. Please place a medicine strip, tablet, bottle, syrup, injection, or medicine packet in front of the camera.",
  "medicine_name": null, "generic_name": null, "simple_description": null,
  "uses": null, "dosage_instructions": null, "side_effects": null,
  "warnings": null, "how_to_take": null, "drug_interactions": null,
  "identified_confidence": "low", "medicine_form": null, "strength": null,
  "category": "not_medicine"
}`;
  return callVision(prompt, base64Image);
}

export async function precheckReport(base64Image: string) {
  const prompt = `Decide if this camera image clearly shows a medical/health report, lab report, prescription, X-ray, ECG, or diagnostic document.

Respond ONLY in valid JSON:
{"is_report": true, "message": "Report Detected! Hold steady..."}

If not a medical report:
{"is_report": false, "message": "This is not a Report. Please align properly."}`;
  return callVision(prompt, base64Image);
}

export async function analyzeReport(base64Images: string[], patientContext: any) {
  const prompt = `You are MediSaaN AI, a deeply knowledgeable but very simple health companion.

Think deeply like an experienced doctor internally,
but explain reports like a caring family member.

Most users are not medically educated.

IMPORTANT:
- Use plain everyday English only
- Keep explanations short and clear
- Explain what the report means in real life
- Explain whether something is serious or not
- Give practical advice normal people can follow
- Never sound robotic or overly medical
- Patient should understand without needing Google
- If a normal Indian family member cannot easily understand the sentence, rewrite it simpler.
Decide whether the image shows a health/medical report, lab report, prescription, X-ray, ECG, or diagnostic document.
If NOT a medical report, do not guess values.

Patient: ${patientContext.name}, ${patientContext.age}y, ${patientContext.gender}, city: ${patientContext.city}.
Conditions: ${(patientContext.conditions || []).join(', ')}. Allergies: ${patientContext.allergies}.

Respond ONLY in English. Respond ONLY in valid JSON:
{
  "is_report": true,
  "not_report_message": null,
  "simple_verdict": "ONE sentence — is everything normal or what needs attention",
  "severity": "normal or mild_concern or needs_attention or urgent",
  "parameters": [
    {"name": "...", "value": "...", "unit": "...", "normal_range": "...", "status": "normal or high or low or critical", "meaning": "simple meaning"}
  ],
  "report_type": "blood_test or urine or xray or ecg or other",
  "possible_conditions": "simple explanation",
  "diet_advice": "diet recommendations",
  "lifestyle_advice": "lifestyle changes",
  "specialist_to_see": "which specialist",
  "follow_up_when": "when to retest",
  "urgent_action": "only if urgent, else null"
}

If not a medical report:
{
  "is_report": false,
  "not_report_message": "This is not a medical report. Please place a lab report, prescription, X-ray, ECG, or diagnostic document in front of the camera.",
  "simple_verdict": null, "severity": "normal", "parameters": [],
  "report_type": "not_report", "possible_conditions": null,
  "diet_advice": null, "lifestyle_advice": null,
  "specialist_to_see": null, "follow_up_when": null, "urgent_action": null
}`;
  return callVision(prompt, base64Images);
}

// ─── AI Doctor Consultation ───────────────────────────────────────────────────

export interface DoctorConsultation {
  overall_status: 'good' | 'attention_needed' | 'concerning';
  greeting: string;
  health_summary: string;
  condition_insights: { condition: string; insight: string; severity: 'stable' | 'watch' | 'alert' }[];
  medicine_alert: string | null;
  report_highlight: string | null;
  top_advice: string;
  follow_up: string;
}

export async function getDoctorConsultation(ctx: {
  name: string; age: number; gender: string;
  conditions: string[];
  medicines: { name: string; dose: string; timesPerDay: number }[];
  adherenceStats: { total: number; taken: number; skipped: number };
  skippedMedicines: { name: string; time: string }[];
  activeDoses: number; currentTime: string; nextDoseTime: string;
  adherenceTrend: string[]; healthScore: number;
  recentReports: { type: string; verdict: string; severity: string; date: string }[];
  allergies: string; language: string; nativeLanguageName: string;
}): Promise<DoctorConsultation> {
  const medicineList = ctx.medicines.length
    ? ctx.medicines.map(m => `${m.name} (${m.dose}, ${m.timesPerDay}x/day)`).join(', ')
    : 'No medicines added yet';

  const skippedList = ctx.skippedMedicines.length
    ? ctx.skippedMedicines.map(s => `${s.name} at ${s.time}`).join(', ')
    : 'None';

  const reportList = ctx.recentReports.length
    ? ctx.recentReports.map(r => `[${r.date}] ${r.type}: ${r.verdict} (${r.severity})`).join('; ')
    : 'No reports scanned yet';

  const pending = ctx.adherenceStats.total - ctx.adherenceStats.taken - ctx.adherenceStats.skipped;

  const prompt = `You are a loving, caring family member who also knows about health — like a wise elder.
You are checking in on your family member's health for today.

LANGUAGE RULES:
- Use EXTREMELY simple everyday language. No medical jargon.
- Talk like a caring family member, NOT a doctor.
- Keep sentences SHORT and warm.
- Examples: ❌ "medication adherence" → ✅ "dawai time pe lena" | ❌ "hypertension management" → ✅ "BP control mein rakhna"

PATIENT:
Name: ${ctx.name} | Age: ${ctx.age}y | Gender: ${ctx.gender}
Health issues: ${ctx.conditions.length ? ctx.conditions.join(', ') : 'None'}
Allergies: ${ctx.allergies || 'None'}
Health Score: ${ctx.healthScore}/100

CURRENT TIME: ${ctx.currentTime}
NEXT DOSE DUE: ${ctx.nextDoseTime}
DOSES DUE RIGHT NOW: ${ctx.activeDoses}

MEDICINES: ${medicineList}

TODAY'S STATUS:
- Total doses today: ${ctx.adherenceStats.total}
- Taken: ${ctx.adherenceStats.taken}
- Skipped: ${ctx.adherenceStats.skipped}
- Coming up later (NOT YET DUE): ${pending}
- Skipped medicines: ${skippedList}

PAST 7 DAYS TREND (oldest → newest): ${ctx.adherenceTrend.join(' → ')}

ADHERENCE RULES — READ CAREFULLY:
- "No data" = patient ignored the app entirely that day = 0% (very bad, treat as missed)
- Bad history + good today → acknowledge improvement but mention past neglect
- Good history + skipped today → warn lovingly
- Consistently bad → scold lovingly but firmly like an elder
- "Coming up later" > 0 → those doses are NOT due yet, do NOT warn about them
- Only warn if skipped > 0 OR bad trend history

REPORTS: ${reportList}

FOLLOW-UP RULES:
- Do NOT say "come meet me" — you are an AI app
- Say things like "har 3 mahine mein doctor ko dikha dena"
- For ongoing conditions (diabetes, BP), remind when next test/visit should be

Respond ONLY in English. Respond ONLY in valid JSON:
{
  "overall_status": "good | attention_needed | concerning",
  "greeting": "Warm loving greeting using their name, simple English",
  "health_summary": "1-2 simple sentences about how they are doing today",
  "condition_insights": [
    {"condition": "health issue in simple words", "insight": "what to keep in mind in very simple words", "severity": "stable | watch | alert"}
  ],
  "medicine_alert": "If skipped > 0: loving but firm reminder. If skipped is 0: null",
  "report_highlight": "Key finding in very simple words, null if no reports",
  "top_advice": "One simple practical health tip for today",
  "follow_up": "When to visit real doctor for checkup, simple English"
}`;

  return callText(prompt);
}