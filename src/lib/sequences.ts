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

const TEMPLATES: Record<string, Sequence[]> = {
  lead_entrante: [
    {
      stage: 'lead_entrante', temperature: 'caliente',
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
    {
      stage: 'lead_entrante', temperature: 'tibio',
      label: 'Lead nuevo — tibio',
      steps: [
        { day: 1, label: 'Presentación inicial', cta: 'Presentarse y entender proyecto',
          template: 'Hola {{name}}, soy Agustín de A7 Arquitectura. Vi que consultaste por tu proyecto y quería conocer un poco más sobre lo que estás buscando. ¿Qué tipo de obra tenés en mente?' },
        { day: 7, label: 'Primer seguimiento', cta: 'Retomar contacto + compartir valor',
          template: 'Hola {{name}}, te comparto algunos proyectos similares al tuyo que estamos haciendo. Avísame si querés que los veamos juntos y te armo un presupuesto sin compromiso.' },
      ],
    },
    {
      stage: 'lead_entrante', temperature: 'frio',
      label: 'Lead nuevo — frío (seguimiento pasivo)',
      steps: [
        { day: 1, label: 'Apertura suave', cta: 'Reactivar con contenido de valor',
          template: 'Hola {{name}}, te comparto este proyecto que hicimos recientemente por si te sirve de inspiración. Cuando quieras retomar la conversación, estoy acá.' },
      ],
    },
  ],
  conversacion_iniciada: [
    {
      stage: 'conversacion_iniciada', temperature: 'caliente',
      label: 'Conversación activa — caliente',
      steps: [
        { day: 1, label: 'Profundizar proyecto', cta: 'Seguir conociendo necesidades',
          template: '{{name}}, contame un poco más sobre el terreno y qué estilo de construcción imaginás. Así puedo empezar a pensar algunas ideas.' },
        { day: 3, label: 'Proponer avance', cta: 'Ofrecer llamado o presupuesto',
          template: '{{name}}, con lo que me contaste ya tengo una idea del proyecto. ¿Querés que te prepare un presupuesto tentativo para ir viendo números?' },
      ],
    },
    {
      stage: 'conversacion_iniciada', temperature: 'tibio',
      label: 'Conversación pausada — tibio',
      steps: [
        { day: 1, label: 'Retomar contacto', cta: 'Reactivar conversación',
          template: 'Hola {{name}}, ¿cómo estás? Te escribía para ver si pudiste seguir pensando en el proyecto. Cualquier cosa que necesites, avísame.' },
        { day: 7, label: 'Segundo intento', cta: 'Compartir valor',
          template: 'Hola {{name}}, te quería compartir este proyecto que estamos haciendo, tiene un estilo similar a lo que buscabas. ¿Qué te parece?' },
      ],
    },
  ],
  llamada_realizada: [
    {
      stage: 'llamada_realizada', temperature: 'caliente',
      label: 'Post-llamada — caliente',
      steps: [
        { day: 1, label: 'Resumen de llamada', cta: 'Enviar resumen y próximos pasos',
          template: '{{name}}, gracias por la llamada de hoy. Quedamos en que te paso más información sobre tu proyecto. Te escribo en estos días con todo.' },
        { day: 4, label: 'Seguimiento', cta: 'Verificar interés y ofrecer presupuesto',
          template: 'Hola {{name}}, como te prometí, te paso información adicional. ¿Te parece si coordinamos una videollamada con Nicolás para ver el proyecto en detalle y empezar a planificar?' },
      ],
    },
    {
      stage: 'llamada_realizada', temperature: 'tibio',
      label: 'Post-llamada — tibio',
      steps: [
        { day: 1, label: 'Resumen', cta: 'Enviar resumen',
          template: '{{name}}, gracias por la llamada. Quedamos en contacto. Cualquier duda, avísame.' },
      ],
    },
  ],
  presupuesto_enviado: [
    {
      stage: 'presupuesto_enviado', temperature: 'caliente',
      label: 'Presupuesto enviado — caliente',
      steps: [
        { day: 3, label: 'Seguimiento rápido', cta: 'Consultar si lo revisó',
          template: 'Hola {{name}}, ¿pudiste revisar el presupuesto que te envié? Cualquier duda que tengas, estoy para ayudarte a entender cada parte.' },
        { day: 7, label: 'Resolver objeciones', cta: 'Ajustar si es necesario',
          template: 'Hola {{name}}, quería consultarte si tenés alguna pregunta o si necesitás que ajustemos algo para adecuarlo mejor a tu proyecto.' },
        { day: 14, label: 'Último intento', cta: 'Cierre o seguimiento pasivo',
          template: 'Hola {{name}}, entiendo que estos proyectos llevan su tiempo. Cuando quieras retomar la conversación, estoy acá. ¡Éxitos con el proyecto!' },
      ],
    },
    {
      stage: 'presupuesto_enviado', temperature: 'tibio',
      label: 'Presupuesto enviado — tibio',
      steps: [
        { day: 5, label: 'Seguimiento', cta: 'Consultar si lo revisó',
          template: 'Hola {{name}}, ¿pudiste revisar el presupuesto? Cualquier duda, avísame.' },
        { day: 12, label: 'Último contacto', cta: 'Cierre abierto',
          template: 'Hola {{name}}, por cualquier cosa que necesites en el futuro, acá estoy. ¡Que tengas un excelente proyecto!' },
      ],
    },
  ],
  reunion_encuentro: [
    {
      stage: 'reunion_encuentro', temperature: 'caliente',
      label: 'Post-reunión — caliente',
      steps: [
        { day: 1, label: 'Agradecer encuentro', cta: 'Cerrar compromisos',
          template: 'Hola {{name}}, gracias por el tiempo de hoy. Quedamos en que te paso el presupuesto esta semana, ¿correcto? Cualquier cosa me escribís.' },
        { day: 5, label: 'Seguimiento presupuesto', cta: 'Verificar si recibió',
          template: 'Hola {{name}}, te envié el presupuesto que hablamos. Avísame si tenés alguna duda o querés que lo ajustemos.' },
        { day: 12, label: 'Cierre', cta: 'Resolver o pasar a frío',
          template: 'Hola {{name}}, quería consultarte si avanzaron con la decisión. Si necesitás más tiempo, no hay problema. Estoy a tu disposición.' },
      ],
    },
    {
      stage: 'reunion_encuentro', temperature: 'tibio',
      label: 'Post-reunión — tibio',
      steps: [
        { day: 1, label: 'Agradecer', cta: 'Cerrar compromisos',
          template: 'Hola {{name}}, gracias por el tiempo. Quedamos atentos a lo que resuelvan.' },
        { day: 10, label: 'Seguimiento final', cta: 'Consultar decisión',
          template: 'Hola {{name}}, quería saber si ya tomaron una decisión con el proyecto. Avísame cualquier cosa.' },
      ],
    },
  ],
};

export function getSequencesForStage(stage: LeadStage, temperature: LeadTemperature): Sequence[] {
  const base = TEMPLATES[stage] || [];
  return base.filter(s => s.temperature === temperature);
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
