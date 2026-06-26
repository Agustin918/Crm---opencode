'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getSupabase } from '@/lib/supabase';
import { STAGES, type Lead, type LeadStage } from '@/lib/types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import NewLeadModal from './NewLeadModal';

export default function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [showNew, setShowNew] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchLeads = useCallback(async () => {
    const { data } = await getSupabase().from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const getLeadsByStage = (stage: string) =>
    leads.filter((l) => l.stage === stage);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    let newStage: LeadStage | null = null;

    const overId = over.id as string;
    const stage = STAGES.find((s) => s.id === overId);
    if (stage) {
      newStage = stage.id;
    } else {
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) newStage = overLead.stage;
    }

    if (!newStage || newStage === lead.stage) return;

    const now = new Date().toISOString();
    const update: Partial<Lead> = {
      stage: newStage,
      stage_changed_at: now,
      updated_at: now,
    };
    if (newStage === 'cerrado_ganado' || newStage === 'cerrado_perdido') {
      update.closed_at = now;
    }

    await getSupabase().from('leads').update(update).eq('id', leadId);
    await getSupabase().from('lead_activity_log').insert({
      lead_id: leadId,
      from_stage: lead.stage,
      to_stage: newStage,
    });

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, ...update } : l))
    );
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <h2 className="text-lg font-semibold text-[#f0f0f2]">Pipeline de leads</h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4a853] text-black text-sm font-medium hover:bg-[#c49a3a] transition-colors"
        >
          + Nuevo lead
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-3.5rem)] px-4 sm:px-6">
          {STAGES.map((stage) => (
            <SortableContext
              key={stage.id}
              items={getLeadsByStage(stage.id).map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                stage={stage}
                leads={getLeadsByStage(stage.id)}
              />
            </SortableContext>
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeLead && <KanbanCard lead={activeLead} isDrag />}
        </DragOverlay>
      </DndContext>
      {showNew && <NewLeadModal onClose={() => setShowNew(false)} onCreated={fetchLeads} />}
    </>
  );
}
