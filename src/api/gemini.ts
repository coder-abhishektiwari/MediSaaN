import axios from 'axios';
import { GEMINI_API_KEY } from '@env';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string, base64Images: string | string[], mimeType = 'image/jpeg') {
  const images = Array.isArray(base64Images) ? base64Images : [base64Images];
  const body = {
    contents: [{
      parts: [
        ...images.map(base64Image => ({ inline_data: { mime_type: mimeType, data: base64Image } })),
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    }
  };
  try {
    const res = await axios.post(GEMINI_URL, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    
    let text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty response from Gemini');

    // Debug log to see why it fails
    console.log('Gemini Raw Response Length:', text.length);
    if (text.length < 50) console.log('Gemini Raw Preview:', text);

    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      // Fallback: Try to extract the first/main JSON object found
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const extracted = text.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(extracted);
        } catch (e) {
          console.error('Extraction Parse Error:', extracted.slice(-50)); // See the end of the string
          throw new Error('AI response was incomplete or malformed');
        }
      }
      throw new Error('Could not parse AI response as JSON');
    }
  } catch (error: any) {
    const apiError = error?.response?.data?.[0]?.error?.message || error?.response?.data?.error?.message || error.message;
    console.error('Gemini API Error:', apiError);
    throw new Error(apiError);
  }
}

export async function precheckMedicine(base64Image: string) {
  const prompt = `Decide if this camera image clearly shows a medicine, such as a tablet, capsule, medicine strip, bottle, syrup, injection, or medicine packet.

Respond ONLY in valid JSON:
{
  "is_medicine": true,
  "message": "Medicine detected! Hold steady..."
}

If it is not medicine-related, respond ONLY with:
{
  "is_medicine": false,
  "message": "This is not a Medicine. Please align properly."
}`;
  return callGemini(prompt, base64Image);
}

export async function scanMedicine(base64Image: string, patientContext: any) {
  const prompt = `You are a medical assistant for elderly Indian patients.
First decide whether the image clearly shows a medicine, medicine strip, medicine bottle, tablet/capsule, injection, syrup, or medicine packaging.
If it is not a medicine-related image, do not guess a medicine name.

Patient context: ${patientContext.age} year old ${patientContext.gender}, diagnosed with: ${(patientContext.conditions || []).join(', ')}.
Currently taking: ${(patientContext.medicines || []).join(', ')}.

IMPORTANT: Respond in ${patientContext.nativeLanguageName} (language code: ${patientContext.language}). ALL text fields MUST be in ${patientContext.nativeLanguageName}. NEVER use any other language. Use the native script only; do not use Latin letters, transliteration, or English.

Respond ONLY in valid JSON (no markdown):
{
  "is_medicine": true,
  "not_medicine_message": null,
  "medicine_name": "exact medicine name",
  "generic_name": "generic/salt name",
  "simple_description": "ONE sentence in ${patientContext.nativeLanguageName} — what this medicine is for",
  "uses": "uses in ${patientContext.nativeLanguageName}",
  "dosage_instructions": "typical dosage",
  "side_effects": "common side effects in simple words in ${patientContext.nativeLanguageName}",
  "warnings": "important warnings in ${patientContext.nativeLanguageName}",
  "how_to_take": "before_food or after_food or with_food or anytime",
  "drug_interactions": "any interactions with the patient's current medicines, or null",
  "identified_confidence": "high or medium or low",
  "medicine_form": "tablet or capsule or syrup or injection or cream or drops or powder or patch or other",
  "strength": "e.g. 500mg, 10ml, etc. or null",
  "category": "antibiotic or painkiller or diabetes or bp or thyroid or vitamin or other"
}

If the image is not medicine-related, respond ONLY with:
{
  "is_medicine": false,
  "not_medicine_message": "This is not a medicine. Please place a medicine strip, tablet, bottle, syrup, injection, or medicine packet in front of the camera.",
  "medicine_name": null,
  "generic_name": null,
  "simple_description": null,
  "uses": null,
  "dosage_instructions": null,
  "side_effects": null,
  "warnings": null,
  "how_to_take": null,
  "drug_interactions": null,
  "identified_confidence": "low",
  "category": "not_medicine"
}`;
  return callGemini(prompt, base64Image);
}

export async function precheckReport(base64Image: string) {
  const prompt = `Decide if this camera image clearly shows a medical/health report, lab report, prescription report, X-ray/ECG printout, or diagnostic document.

Respond ONLY in valid JSON:
{
  "is_report": true,
  "message": "Report Detected! Hold steady..."
}

If it is not a medical report, respond ONLY with:
{
  "is_report": false,
  "message": "This is not a Report. Please align properly."
}`;
  return callGemini(prompt, base64Image);
}

export async function analyzeReport(base64Images: string[], patientContext: any) {
  const prompt = `You are a medical assistant for Indian patients.
First decide whether the image clearly shows a health/medical report, lab report, prescription report, X-ray/ECG printout, or diagnostic document.
If it is not a medical report, do not guess report values.

Patient: ${patientContext.name}, ${patientContext.age} years old, ${patientContext.gender}, city: ${patientContext.city}.
Known conditions: ${(patientContext.conditions || []).join(', ')}. Allergies: ${patientContext.allergies}.

IMPORTANT: Respond in ${patientContext.nativeLanguageName} (language code: ${patientContext.language}). ALL text fields MUST be in ${patientContext.nativeLanguageName}. NEVER use any other language. Use the native script only; do not use Latin letters, transliteration, or English.

Respond ONLY in valid JSON:
{
  "is_report": true,
  "not_report_message": null,
  "simple_verdict": "ONE sentence in ${patientContext.nativeLanguageName} — is everything normal or what needs attention",
  "severity": "normal or mild_concern or needs_attention or urgent",
  "parameters": [
    { "name": "...", "value": "...", "unit": "...", "normal_range": "...", "status": "normal or high or low or critical", "meaning": "simple meaning in ${patientContext.nativeLanguageName}" }
  ],
  "report_type": "blood_test or urine or xray or ecg or other",
  "possible_conditions": "simple explanation in ${patientContext.nativeLanguageName}",
  "diet_advice": "diet recommendations in ${patientContext.nativeLanguageName}",
  "lifestyle_advice": "lifestyle changes in ${patientContext.nativeLanguageName}",
  "specialist_to_see": "which specialist",
  "follow_up_when": "when to retest",
  "urgent_action": "only if severity is urgent, else null"
}

If the image is not a medical report, respond ONLY with:
{
  "is_report": false,
  "not_report_message": "This is not a medical report. Please place a lab report, prescription report, X-ray, ECG, or diagnostic document in front of the camera.",
  "simple_verdict": null,
  "severity": "normal",
  "parameters": [],
  "report_type": "not_report",
  "possible_conditions": null,
  "diet_advice": null,
  "lifestyle_advice": null,
  "specialist_to_see": null,
  "follow_up_when": null,
  "urgent_action": null
}`;
  return callGemini(prompt, base64Images);
}

// ─── Text-only Gemini call (no images) ───────────────────────────────────────

async function callGeminiText(prompt: string) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };
  try {
    const res = await axios.post(GEMINI_URL, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000,
    });

    let text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty response from Gemini');

    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      }
      throw new Error('Could not parse AI response as JSON');
    }
  } catch (error: any) {
    const apiError = error?.response?.data?.[0]?.error?.message || error?.response?.data?.error?.message || error.message;
    console.error('Gemini Text API Error:', apiError);
    throw new Error(apiError);
  }
}

// ─── AI Doctor Consultation ──────────────────────────────────────────────────

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
  name: string;
  age: number;
  gender: string;
  conditions: string[];
  medicines: { name: string; dose: string; timesPerDay: number }[];
  adherenceStats: { total: number; taken: number; skipped: number };
  skippedMedicines: { name: string; time: string }[];
  activeDoses: number;
  currentTime: string;
  nextDoseTime: string;
  adherenceTrend: string[];
  healthScore: number;
  recentReports: { type: string; verdict: string; severity: string; date: string }[];
  allergies: string;
  language: string;
  nativeLanguageName: string;
}): Promise<DoctorConsultation> {
  const medicineList = ctx.medicines.length > 0
    ? ctx.medicines.map(m => `${m.name} (${m.dose}, ${m.timesPerDay}x/day)`).join(', ')
    : 'No medicines added yet';

  const skippedList = ctx.skippedMedicines.length > 0
    ? ctx.skippedMedicines.map(s => `${s.name} at ${s.time}`).join(', ')
    : 'None';

  const reportList = ctx.recentReports.length > 0
    ? ctx.recentReports.map(r => `[${r.date}] ${r.type}: ${r.verdict} (${r.severity})`).join('; ')
    : 'No reports scanned yet';

  const pending = ctx.adherenceStats.total - ctx.adherenceStats.taken - ctx.adherenceStats.skipped;

  const prompt = `You are a loving, caring family member who also happens to know about health — like a wise grandmother or a caring uncle.
You are checking in on your family member's health for today. You know everything about them already.

CRITICAL RULES FOR LANGUAGE:
- Use EXTREMELY simple, everyday language. Imagine you are talking to someone who has NEVER been to a medical college.
- Do NOT use any medical/doctor terminology. For example:
  × "blood sugar level monitor karein" → ✓ "meetha kam khao, sugar check karte raho"
  × "hypertension management" → ✓ "BP zyada na ho, namak kam khao"
  × "medication adherence" → ✓ "dawai time pe lena mat bhoolna"
  × "follow-up consultation" → ✓ "mahine mein ek baar doctor ko dikha dena"
- Talk like a caring family member, NOT like a doctor reading from a textbook.
- Keep sentences SHORT and warm.

PATIENT:
- Name: ${ctx.name}
- Age: ${ctx.age} years, Gender: ${ctx.gender}
- Health issues: ${ctx.conditions.length > 0 ? ctx.conditions.join(', ') : 'None'}
- Allergies: ${ctx.allergies || 'None'}
- Overall Health Score: ${ctx.healthScore} (100+ is great, <50 is bad)

CURRENT TIME: ${ctx.currentTime}
NEXT MEDICINE DUE AT: ${ctx.nextDoseTime}
MEDICINES CURRENTLY DUE RIGHT NOW: ${ctx.activeDoses}

MEDICINES THEY TAKE:
${medicineList}

TODAY'S MEDICINE STATUS:
- Total doses for today: ${ctx.adherenceStats.total}
- Already taken: ${ctx.adherenceStats.taken}
- Deliberately skipped: ${ctx.adherenceStats.skipped}
- Still coming up later (NOT YET DUE): ${pending}
- Skipped medicines: ${skippedList}

PAST 7 DAYS ADHERENCE TREND (Oldest to Newest):
${ctx.adherenceTrend.join(' -> ')}

VERY IMPORTANT ABOUT MEDICINES:
- "No data" in the 7-day trend means the patient completely IGNORED the app and FAILED to take their medicines on that day. Treat "No data" as 0% taken (very bad).
- ALWAYS look at the TREND first before deciding if they are doing good. 
  * If they have a bad history (multiple days of 'No data' or '0%') but today is perfect: Point out that they were ignoring medicines previously and it's good they are back on track today. Don't just blindly praise them as if everything is perfect.
  * If they were doing great before but skipped today: Warn them lovingly.
  * If they have been skipping/ignoring for days (including today): Scold them lovingly but firmly like an elder family member.
- If "Still coming up later" is > 0, it means those doses are SCHEDULED FOR LATER. Do NOT warn them about doses that haven't arrived yet.
- ONLY warn about today's missed doses if "Deliberately skipped" > 0 or if they have a bad history.
- If no medicines are due right now and skipped is 0 AND their past trend is good, ONLY THEN say something positive like "sab sahi chal raha hai".

RECENT HEALTH REPORTS:
${reportList}

ABOUT FOLLOW-UP:
- Do NOT say "come meet me" or "mujhse milein" — you are an AI app, not a real doctor.
- Instead give practical advice like "har 3 mahine mein apne doctor ko dikha dena" or "agar XYZ ho to doctor ke paas chale jaana"
- If they have regular conditions (diabetes, BP), remind them when their next real doctor visit or test should be.

IMPORTANT: Respond ONLY in ${ctx.nativeLanguageName} (language code: ${ctx.language}). ALL text MUST be in ${ctx.nativeLanguageName} using native script only. NO English, NO transliteration, NO Latin letters.

Respond ONLY in valid JSON:
{
  "overall_status": "good | attention_needed | concerning",
  "greeting": "Warm, loving greeting like a family member would say — use their name, in ${ctx.nativeLanguageName}",
  "health_summary": "1-2 SIMPLE sentences about how they're doing health-wise today, in ${ctx.nativeLanguageName}. Very easy language.",
  "condition_insights": [
    { "condition": "health issue name in SIMPLE ${ctx.nativeLanguageName}", "insight": "What to keep in mind about this issue in VERY SIMPLE words in ${ctx.nativeLanguageName}", "severity": "stable | watch | alert" }
  ],
  "medicine_alert": "ONLY if they actually SKIPPED doses (skipped > 0), lovingly but firmly remind them in ${ctx.nativeLanguageName}. If skipped is 0, set this to null.",
  "report_highlight": "If there are reports, explain the key finding in VERY SIMPLE words in ${ctx.nativeLanguageName}. No medical jargon. null if no reports.",
  "top_advice": "One simple, practical health tip they can do today — like what to eat, drink water, walk etc. in ${ctx.nativeLanguageName}",
  "follow_up": "When they should visit their REAL doctor (not this app) for a checkup, in ${ctx.nativeLanguageName}"
}`;

  return callGeminiText(prompt);
}
