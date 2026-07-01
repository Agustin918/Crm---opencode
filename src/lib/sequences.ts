import type { Lead, LeadStage, LeadTemperature } from './types';
import { addDays } from 'date-fns';

export interface SequenceStep {
  day: number;
  label: string;
  template: string;
  cta: string;
}

export interface Sequence {
  stage: LeadStage;
  temperature: LeadTemperature;
  label: string;
  steps: SequenceStep[];
}

const TEMPLATES: Record<string, Omit<Sequence, 'temperature'>[]> = {
  lead_entrante: [
    {
      stage: 'lead_entrante',
      label: 'Lead nuevo — tibio',
      steps: [
        { day: 1, label: 'Presentación inicial', cta: 'Presentarse y entender proyecto',
          template: 'Hola {{name}}, soy Agustín de A7 Arquitectura. Vi que consultaste por tu proyecto y quería conocer un poco más sobre lo que estás buscando. ¿Qué tipo de obra tenés en mente?' },
        { day: 3, label: 'Primer seguimiento', cta: 'Retomar contacto',
          template: 'Hola {{name}}, ¿cómo estás? Te escribía para ver si pudiste pensar un poco más sobre tu proyecto. Cualquier duda que tengas, estoy acá para ayudarte.' },
        { day: 7, label: 'Segundo seguimiento', cta: 'Compartir valor + cerrar o pasar a frío',
          template: 'Hola {{name}}, te comparto algunos proyectos que estamos haciendo que son similares a lo que buscás. Avísame si querés que los veamos juntos y te armo un presupuesto sin compromiso.' },
      ],
    },
    {
      stage: 'lead_entrante',
      label: 'Lead nuevo — caliente',
      steps: [
        { day: 1, label: 'Contacto inmediato', cta: 'Responder rápido y coordinar llamada',
          template: 'Hola {{name}}, gracias por tu consulta. Soy Agustín de A7 Arquitectura. Me encantaría entender bien tu proyecto para poder ayudarte. ¿Tenés 10 minutos para una llamada esta semana?' },
        { day: 2, label: 'Follow-up rápido', cta: 'Reiterar propuesta de llamada',
          template: 'Hola {{name}}, ¿pudiste ver mi mensaje anterior? Avísame si te queda cómodo agendar una llamada para charlar sobre tu proyecto.' },
        { day: 5, label: 'Segundo follow-up', cta: 'Último intento antes de pasar a tibio',
          template: 'Hola {{name}}, no quería insistir pero quería dejarte abierta la puerta por si en algún momento querés avanzar con el proyecto. Estoy a tu disposición.' },
      ],
    },
  ],
  conversacion_iniciada: [
    {
      stage: 'conversacion_iniciada',
      label: 'Conversación activa',
      steps: [
        { day: 1, label: 'Continuar conversación', cta: 'Profundizar en el proyecto',
          template: '{{name}}, contame un poco más sobre el terreno y qué estilo de construcción imaginás. Así puedo empezar a pensar algunas ideas.' },
        { day: 3, label: 'Check-in silencio', cta: 'Reactivar si no respondió',
          template: 'Hola {{name}}, ¿seguís ahí? Cualquier cosa que necesites, avísame.' },
      ],
    },
  ],
  presupuesto_enviado: [
    {
      stage: 'presupuesto_enviado',
      label: 'Presupuesto enviado',
      steps: [
        { day: 3, label: 'Seguimiento post-presupuesto', cta: 'Consultar si lo revisó',
          template: 'Hola {{name}}, ¿pudiste revisar el presupuesto que te envié? Cualquier duda que tengas, estoy para ayudarte a entender cada parte.' },
        { day: 7, label: 'Segundo seguimiento', cta: 'Resolver objeciones',
          template: 'Hola {{name}}, quería consultarte si tenés alguna pregunta sobre el presupuesto o si necesitás que ajustemos algo para adecuarlo mejor a tu proyecto.' },
        { day: 14, label: 'Cierre o seguimiento pasivo', cta: 'Último intento',
          template: 'Hola {{name}}, entiendo que estos proyectos llevan su tiempo. Cuando quieras retomar la conversación, estoy acá. ¡Éxitos con el proyecto!' },
      ],
    },
  ],
  reunion_encuentro: [
    {
      stage: 'reunion_encuentro',
      label: 'Post-reunión',
      steps: [
        { day: 1, label: 'Agradecer encuentro', cta: 'Cerrar compromisos',
          template: 'Hola {{name}}, gracias por el tiempo de hoy. Quedamos en que te paso el presupuesto esta semana, ¿correcto? Cualquier cosa me escribís.' },
        { day: 5, label: 'Seguimiento presupuesto', cta: 'Verificar si recibió',
          template: 'Hola {{name}}, te envié el presupuesto que hablamos. Avísame si tenés alguna duda o querés que lo ajustemos.' },
      ],
    },
  ],
};

const TEMPLATES_TIBIO: Record<string, Omit<Sequence, 'temperature'>[]> = {};
const TEMPLATES_FRIO: Record<string, Omit<Sequence, 'temperature'>[]> = {};

export function getSequencesForStage(stage: LeadStage, temperature: LeadTemperature): Sequence[] {
  const base = TEMPLATES[stage] || [];
  return base.map(s => ({ ...s, temperature }));
}

export function getNextStep(lead: Lead): SequenceStep | null {
  const sequences = getSequencesForStage(lead.stage, lead.temperature);
  if (sequences.length === 0) return null;

  const seq = sequences[0];
  const daysSinceStage = lead.stage_changed_at
    ? Math.floor((Date.now() - new Date(lead.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const pendingSteps = seq.steps.filter(s => s.day > daysSinceStage);
  return pendingSteps.length > 0 ? pendingSteps[0] : null;
}

export function getCompletedSteps(lead: Lead): SequenceStep[] {
  const sequences = getSequencesForStage(lead.stage, lead.temperature);
  if (sequences.length === 0) return [];

  const seq = sequences[0];
  const daysSinceStage = lead.stage_changed_at
    ? Math.floor((Date.now() - new Date(lead.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return seq.steps.filter(s => s.day <= daysSinceStage);
}

export function getTotalSteps(lead: Lead): SequenceStep[] {
  const sequences = getSequencesForStage(lead.stage, lead.temperature);
  return sequences.length > 0 ? sequences[0].steps : [];
}

export function fillTemplate(template: string, name: string): string {
  return template.replace(/\{\{name\}\}/g, name);
}

export function suggestNextActionDate(lead: Lead): string | null {
  const step = getNextStep(lead);
  if (!step) return null;
  const baseDate = lead.stage_changed_at ? new Date(lead.stage_changed_at) : new Date();
  return addDays(baseDate, step.day).toISOString().split('T')[0];
}

export function suggestNextActionText(lead: Lead): string | null {
  const step = getNextStep(lead);
  if (!step) return null;
  return step.label;
}
