'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { Phone, MessageSquare, Clock } from 'lucide-react';
import { formatRelative } from 'date-fns';
import { es } from 'date-fns/locale';
import { STAGES, type Lead } from '@/lib/types';

const tempColors: Record<string, string> = {
  caliente: '#10b981',
  tibio: '#f59e0b',
  frio: '#6b7280',
};

export default function KanbanCard({ lead, isDrag }: { lead: Lead; isDrag?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Link
      href={`/leads/${lead.id}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`block rounded-lg p-3 transition-colors ${
        isDrag
          ? 'bg-[#d4a853]/10 ring-1 ring-[#d4a853]/30 shadow-xl'
          : 'bg-[#1e1e24] hover:bg-[#24242c] border border-[#2a2a30]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-[#f0f0f2] truncate">{lead.full_name}</span>
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ background: tempColors[lead.temperature] || '#6b7280' }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-[#6b6b76] mb-2">
        {lead.phone && (
          <span className="flex items-center gap-0.5">
            <Phone size={10} />
            {lead.phone}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-[#6b6b76]">
        <span className="flex items-center gap-1">
          <MessageSquare size={10} />
          {STAGES.find(s => s.id === lead.stage)?.label || lead.stage}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {formatRelative(new Date(lead.created_at), new Date(), { locale: es })}
        </span>
      </div>
    </Link>
  );
}
