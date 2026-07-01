import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

const NLM_PATH = '/Users/agustin/.local/bin/nlm';
const NOTEBOOK_ID = '48c6b3f2-936c-4033-b99c-725d93d5348b';

interface SuggestRequest {
  full_name: string;
  stage: string;
  notes?: string;
  description?: string;
  campaign_name?: string;
  ad_name?: string;
}

const SYSTEM_PROMPT = `Sos un asistente de ventas especializado en arquitectura y construcción. Seguí estas reglas de la GUIA DE CONTACTO PROSPECTOS:

FRECUENCIA DE CONTACTO:
- 1er mensaje: día 1 (presentación, propuesta de valor, CTA para agendar)
- 2do mensaje: 24-48h después (follow-up suave, "¿pudiste verlo?")
- 3er mensaje: día 4-5 (caso de éxito o testimonio relevante)
- 4to mensaje: semana 1-2 (último intento, oferta o cierre abierto)
- Sin respuesta después de 3 intentos: seguimiento pasivo con cierre abierto (pasar a frío)

TONO Y ESTILO:
- Español argentino, cordial pero directo
- Personalizado según la etapa del lead y su proyecto
- Incluir CTA claro (llamada, reunión, ver propuesta)
- NO usar jerga técnica excesiva
- NO hablar en plural ("nosotros" solo cuando es apropiado)
- Máximo 2-3 párrafos para WhatsApp

POR ETAPA:
- lead_entrante: Presentación, validar necesidad, proponer llamada corta
- conversacion_iniciada: Seguir la conversación, profundizar en el proyecto
- reunion_encuentro: Confirmar asistencia, generar expectativa positiva
- presupuesto_enviado: Hacer seguimiento suave, ofrecer aclarar dudas
- cerrado_ganado: Agradecer, coordinar próximos pasos
- cerrado_perdido: Cierre abierto, quedar a disposición`;

function buildPrompt(data: SuggestRequest): string {
  let prompt = `Redactá un mensaje de WhatsApp profesional y efectivo para este lead:\n\n`;
  prompt += `Nombre: ${data.full_name}\n`;
  prompt += `Etapa actual: ${data.stage.replace(/_/g, ' ')}\n`;
  if (data.description) prompt += `Descripción del proyecto: ${data.description}\n`;
  if (data.campaign_name) prompt += `Vino de la campaña: ${data.campaign_name}\n`;
  if (data.ad_name) prompt += `Anuncio: ${data.ad_name}\n`;
  if (data.notes) {
    const lastNotes = data.notes.split('\n').slice(-3).join('\n');
    prompt += `Últimas notas: ${lastNotes}\n`;
  }
  prompt += `\nDá SOLO el mensaje, sin explicaciones ni citas.`;
  return prompt;
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`OpenAI API: ${data.error.message}`);
  return data.choices?.[0]?.message?.content || '';
}

function callNotebookLM(prompt: string): { answer: string; conversation_id?: string } {
  const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const stdout = execSync(
    `${NLM_PATH} query notebook "${NOTEBOOK_ID}" "${escaped}"`,
    { encoding: 'utf-8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
  );
  return JSON.parse(stdout);
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestRequest = await request.json();
    if (!body.full_name) {
      return NextResponse.json({ error: 'Nombre del lead requerido' }, { status: 400 });
    }

    const userPrompt = buildPrompt(body);
    const openAiKey = process.env.OPENAI_API_KEY;

    // Try OpenAI first (works everywhere), fallback to NotebookLM CLI (local only)
    if (openAiKey) {
      const message = await callOpenAI(SYSTEM_PROMPT, userPrompt);
      return NextResponse.json({ message, provider: 'openai' });
    }

    // Local fallback via NotebookLM CLI
    const result = callNotebookLM(userPrompt);
    return NextResponse.json({
      message: result.answer,
      conversation_id: result.conversation_id,
      provider: 'notebooklm',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al generar sugerencia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
