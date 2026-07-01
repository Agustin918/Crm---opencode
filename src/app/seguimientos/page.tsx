import FollowUpCalendar from '@/components/FollowUpCalendar';

export default function SeguimientosPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#f0f0f2]">Calendario de seguimientos</h1>
      </div>
      <FollowUpCalendar />
    </div>
  );
}
