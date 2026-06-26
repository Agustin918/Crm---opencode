'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Columns3, Table, Plus } from 'lucide-react';

export default function Nav({ onNewLead }: { onNewLead?: () => void }) {
  const path = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[#2a2a30]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#d4a853] font-semibold text-lg tracking-tight">A7</span>
            <span className="text-[#a1a1aa] text-sm hidden sm:inline">CRM</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                path === '/' ? 'bg-[#1e1e24] text-[#f0f0f2]' : 'text-[#6b6b76] hover:text-[#a1a1aa]'
              }`}
            >
              <Columns3 size={15} />
              <span className="hidden sm:inline">Kanban</span>
            </Link>
            <Link
              href="/leads"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                path === '/leads' ? 'bg-[#1e1e24] text-[#f0f0f2]' : 'text-[#6b6b76] hover:text-[#a1a1aa]'
              }`}
            >
              <Table size={15} />
              <span className="hidden sm:inline">Tabla</span>
            </Link>
          </div>
        </div>
        {onNewLead && (
          <button
            onClick={onNewLead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4a853] text-black text-sm font-medium hover:bg-[#c49a3a] transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nuevo lead</span>
          </button>
        )}
      </div>
    </nav>
  );
}
