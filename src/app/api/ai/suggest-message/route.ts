import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

const NLM_PATH = '/Users/agustin/.local/bin/nlm';
const NOTEBOOK_ID = '48c6b3f2-936c-4033-b99c-725d93d5348b'; // "Lideres para Arquitectura" (tiene GUIA DE CONTACTO PROSPECTOS)

interface SuggestRequest {
  full_name: string;
  stage: string;
  notes?: string;
  description?: string;
  campaign_name?: string;
  ad_name?: string;
}

function buildPrompt(data: SuggestRequest): string {
  let prompt = `Sos un asistente de ventas especializado en arquitectura y construcción.`;
  prompt += ` Basate en la GUIA DE CONTACTO PROSPECTOS y los libros de marketing digital para redactar un mensaje de WhatsApp profesional y efectivo para el siguiente lead:\n\n`;
  prompt += `Nombre: ${data.full_name}\n`;
  prompt += `Etapa actual: ${data.stage.replace(/_/g, ' ')}\n`;
  if (data.description) prompt += `Descripción del proyecto: ${data.description}\n`;
  if (data.campaign_name) prompt += `Vino de la campaña: ${data.campaign_name}\n`;
  if (data.ad_name) prompt += `Anuncio: ${data.ad_name}\n`;
  if (data.notes) {
    const lastNotes = data.notes.split('\n').slice(-3).join('\n');
    prompt += `Últimas notas: ${lastNotes}\n`;
  }
  prompt += `\nImportante: el mensaje debe ser en español argentino, cordial pero directo, con un CTA claro.`;
  prompt += ` Seguí la frecuencia de contacto de la guía (1er msg día 1, 2do msg 24-48h, 3er msg día 4-5, 4to msg semana 1-2).`;
  prompt += ` Dá SOLO el mensaje, sin explicaciones ni citas.`;
  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestRequest = await request.json();
    if (!body.full_name) {
      return NextResponse.json({ error: 'Nombre del lead requerido' }, { status: 400 });
    }

    const prompt = buildPrompt(body);
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');

    const stdout = execSync(
      `${NLM_PATH} query notebook "${NOTEBOOK_ID}" "${escaped}"`,
      { encoding: 'utf-8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
    );

    const result = JSON.parse(stdout);

    return NextResponse.json({
      message: result.answer,
      conversation_id: result.conversation_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al generar sugerencia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
