import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import NewScanModal from '../components/NewScanModal';
import { useSchedules, useUpdateSchedule, useDeleteSchedule, type ScanScheduleRecord } from '../hooks/useSchedules';
import ConfirmationDialog from '../components/ConfirmationDialog';
import EmptyState from '../components/EmptyState';
import PageHeading from '../components/PageHeading';
import Card from '../components/Card';
import { LoadingScreen } from '../components/LoadingScreen';

export default function SchedulesPage() {
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: schedules = [], isPending } = useSchedules();
  const updateScheduleMutation = useUpdateSchedule();
  const deleteScheduleMutation = useDeleteSchedule();

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    if (updateScheduleMutation.isPending) return; // prevent double-click race
    updateScheduleMutation.mutate({
      id,
      payload: { isActive: !currentStatus },
    });
  };

  const handleDeleteClick = (id: string) => {
    setSelectedScheduleId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedScheduleId) {
      deleteScheduleMutation.mutate(selectedScheduleId);
    }
    setIsDeleteOpen(false);
    setSelectedScheduleId(null);
  };

  if (isPending) {
    return (
      <LoadingScreen
        title="Loading Schedules"
        subtitle="Fetching automated scan schedule rules..."
      />
    );
  }

  const activeSchedulesCount = schedules.filter(s => s.isActive).length;

  return (
    <DashboardLayout activePage="schedules">
      <div className="py-8 px-10 space-y-7 w-full text-left min-h-screen">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeading
            title="Scan Schedules"
            description="Automated vulnerability and configuration scanning schedules."
          />
          <button
            onClick={() => setIsNewScheduleOpen(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-dark text-xs font-semibold text-white rounded-xl flex items-center gap-2 transition-colors shadow-sm cursor-pointer self-start"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Scan Schedule
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Total Schedules</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{schedules.length}</p>
              </div>
              <p className="text-[10px] text-text-muted mt-1 font-semibold">Registered automation rules</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-info-bg text-text-primary flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </Card>
          
          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Active Schedules</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{activeSchedulesCount}</p>
              </div>
              <p className="text-[10px] text-text-muted mt-1 font-semibold">Currently running in background</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-success-bg text-text-primary flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </Card>

          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Paused Schedules</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{schedules.length - activeSchedulesCount}</p>
              </div>
              <p className="text-[10px] text-text-muted mt-1 font-semibold">Temporarily disabled schedules</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-warning-bg text-text-primary flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
            </div>
          </Card>
        </div>

        {/* Schedules Grid / Empty State */}
        {schedules.length === 0 ? (
          <div className="w-full">
            <EmptyState
              icon={
                <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
              title="No schedules found"
              description="Create a scan schedule to run automated vulnerability checks against your assets."
              actionLabel="Create Scan Schedule"
              onAction={() => setIsNewScheduleOpen(true)}
            />
          </div>
        ) : (
          <div className="w-full">
            {/* Table Headers */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 font-bold uppercase tracking-wider text-body-sm select-none"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              <div className="col-span-4">Name / Target</div>
              <div className="col-span-2">Frequency</div>
              <div className="col-span-2">Date & Time</div>
              <div className="col-span-2">Last Run</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Body rows */}
            <div className="rounded-3xl overflow-hidden divide-y divide-border"
              style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', boxShadow: '0 1px 4px 0 rgba(60,40,10,0.05)' }}>
              {schedules.map((schedule: ScanScheduleRecord) => (
                <div key={schedule.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 transition-colors group text-xs animate-fade-in"
                  style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Name / Target */}
                  <div className="col-span-4 flex items-center">
                    <div className="mr-3 text-text-muted flex-shrink-0">
                      {schedule.targetType === 'REPOSITORY' ? (
                        <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate" style={{ fontFamily: 'var(--font-body)' }}>
                        {schedule.name}
                      </p>
                      <p className="text-body-xs font-medium text-text-muted mt-0.5 truncate max-w-[280px]">
                        {schedule.targetUrl}
                      </p>
                    </div>
                  </div>

                  {/* Frequency */}
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded-lg border border-border bg-bg-primary text-[10px] font-extrabold text-text-muted">
                      {schedule.frequency}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="col-span-2 space-y-0.5">
                    <p className="font-semibold text-text-primary text-[11px]">{schedule.startDate}</p>
                    <p className="text-text-muted text-[10px]">{schedule.startTime} ({schedule.timezone})</p>
                  </div>

                  {/* Last Run */}
                  <div className="col-span-2 text-text-primary font-medium text-[11px]">
                    {schedule.lastRunAt ? (
                      new Date(schedule.lastRunAt).toLocaleString()
                    ) : (
                      <span className="text-text-muted italic">Never run</span>
                    )}
                  </div>

                  {/* Status Toggle */}
                  <div className="col-span-1 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        schedule.isActive ? 'bg-accent' : 'bg-border'
                      }`}
                    >
                      <span className={`bg-bg-primary w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                        schedule.isActive ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-[10px] font-bold ${
                      schedule.isActive ? 'text-accent' : 'text-text-muted'
                    }`}>
                      {schedule.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => handleDeleteClick(schedule.id)}
                      className="px-2.5 py-1 text-[10px] font-bold text-danger hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create schedule modal */}
      {isNewScheduleOpen && (
        <NewScanModal
          isOpen={isNewScheduleOpen}
          onClose={() => setIsNewScheduleOpen(false)}
          mode="schedule"
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        title="Delete Scan Schedule"
        description="Are you sure you want to delete this scan schedule? This action will permanently remove the automated scan schedule rule."
        confirmLabel="Delete Schedule"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </DashboardLayout>
  );
}
