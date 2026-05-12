import axios from 'axios';
import { GROQ_API_KEY } from '@env';


interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export async function chatWithBot(
  messages: Message[],
  patientContext: {
    name: string; age: number; gender: string; city: string;
    conditions: string[]; medicines: string[]; allergies: string;
    recent_tests: string; language: string;
  }
): Promise<string> {
  const systemPrompt = `You are MediSaaN, a caring health assistant for Indian patients.
Speak in ${patientContext.language} using very simple, warm words — like a caring family member.
Keep every response to 2-3 short sentences maximum. Never be verbose.
Always be reassuring and kind.
For any serious health concern, always add a suggestion to see a doctor.
Never give a definitive medical diagnosis.

Patient you are talking with:
- Name: ${patientContext.name}
- Age: ${patientContext.age} years, Gender: ${patientContext.gender}
- City: ${patientContext.city}
- Medical conditions: ${patientContext.conditions.join(', ')}
- Current medicines: ${patientContext.medicines.join(', ')}
- Known allergies: ${patientContext.allergies}
- Recent tests: ${patientContext.recent_tests}

If you need information not provided above, ask politely.`;

  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        max_tokens: 250,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );
    return res.data?.choices?.[0]?.message?.content || 'I am sorry, I could not understand that. Can you repeat?';
  } catch (error: any) {
    console.error('Groq API Error:', error?.response?.data || error.message);
    throw error;
  }
}
