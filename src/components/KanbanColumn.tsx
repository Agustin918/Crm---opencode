'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { type Lead } from '@/lib/types';
import KanbanCard from './KanbanCard';

interface Props {
  stage: { id: string; label: string; color: string };
  leads: Lead[];
}

export default function KanbanColumn({ stage, leads }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div className="flex items-center gap-2 px-1 pb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
        <span className="text-sm font-medium text-[#f0f0f2]">{stage.label}</span>
        <span className="text-xs text-[#6b6b76] ml-auto">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 transition-colors min-h-[200px] ${
          isOver ? 'bg-[#1e1e24] ring-1 ring-[#d4a853]/30' : 'bg-[#121214]'
        }`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="text-xs text-[#6b6b76] text-center py-8">Sin leads</div>
        )}
      </div>
    </div>
  );
}
