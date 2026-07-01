import SequenceManager from '@/components/SequenceManager';

export default function SecuenciasPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#f0f0f2]">Secuencias de seguimiento</h1>
      </div>
      <SequenceManager />
    </div>
  );
}
