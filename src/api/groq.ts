import axios from 'axios';
import { GROQ_API_KEY } from '@env';
import { executeAction } from '../utils/actionExecutor';
import { navigationRef } from '../navigation/navigationRef';
import { stopMedicine, updateMedicineTiming } from '../db/queries/medicines';
import { deleteScanResult, getScanHistory } from '../db/queries/reports';
import { getMedicines } from '../db/queries/medicines';
import { getScanHistory as getReports } from '../db/queries/reports';
import { buildPatientContext } from '../utils/promptBuilder';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';

interface Message { role: 'user' | 'assistant' | 'system'; content: string; }


interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export async function chatWithBot(
  messages: Message[],
  patientContext: {
    name: string; age: number; gender: string; city: string;
    conditions: string[]; medicines: string[]; allergies: string;
    recent_tests: string; language: string; languageName: string; nativeLanguageName: string;
  },
  isVoiceMode: boolean = false
): Promise<string> {
  const systemPrompt = `You are MediSaaN, a caring health assistant for Indian patients.
Speak ONLY in simple English. EVERY word and sentence MUST be in English. NEVER switch languages.
Use very simple, warm words — like a caring family member.
Keep every response to 2-3 short sentences maximum. Never be verbose.
Always be reassuring and kind.
For any serious health concern, always add a suggestion to see a doctor.
Never give a definitive medical diagnosis.

IMPORTANT: You can perform actions in the app. If the user asks to do something specific, respond with a JSON action instead of normal text. Use this format:
{"action": "action_name", "params": {"key": "value"}}

Available actions:
- stop_medicine: {"medicineName": "name", "reason": "optional"}
- delete_medicine: {"medicineName": "name"}
- update_medicine_timing: {"medicineName": "name", "newTimes": ["09:00", "15:00"]}
- delete_report: {"reportId": number}
- navigate_to_screen: {"screenName": "medicine_scan|report_scan|chat|medicines|home|settings"}
- get_medicine_insights: {}
- get_health_analysis: {}

Patient you are talking with:
- Name: ${patientContext.name}
- Age: ${patientContext.age} years, Gender: ${patientContext.gender}
- City: ${patientContext.city}
- Medical conditions: ${patientContext.conditions.join(', ')}
- Current medicines: ${patientContext.medicines.join(', ')}
- Known allergies: ${patientContext.allergies}
- Recent tests: ${patientContext.recent_tests}

If you need information not provided above, ask politely.`;

  const finalSystemPrompt = isVoiceMode 
    ? systemPrompt + `\nIMPORTANT: You are communicating via VOICE. Keep your reply extremely concise, conversational, professional, and easy to hear. Do not use markdown, emojis, or lists. Remember to ALWAYS respond in English.`
    : systemPrompt;

  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        max_tokens: 250,
        messages: [{ role: 'system', content: finalSystemPrompt }, ...messages],
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );
    let response = res.data?.choices?.[0]?.message?.content || 'I am sorry, I could not understand that. Can you repeat?';
    
    // Check if response is a JSON action
    try {
      const parsed = JSON.parse(response);
      if (parsed.action && parsed.params) {
        const actionResult = await executeAction(parsed.action, parsed.params, patientContext);
        return actionResult;
      }
    } catch (e) {
      // Not a JSON action, return normal response
    }
    
    return response;
  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}
