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
