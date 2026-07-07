import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealScanStatus, useScanLogs, useCancelScan } from '../hooks/useScans';

export default function ProgressPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: scan, isLoading: scanLoading, error: scanError } = useRealScanStatus(id || null, true);
  const { data: logsData } = useScanLogs(id || null, true);
  const cancelScan = useCancelScan();

  // Scroll to logs bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logsData]);

  if (scanLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center text-xs text-text-muted">
        <div className="flex flex-col items-center gap-3">
          <span className="text-xl animate-spin">🔄</span>
          <p className="font-semibold">Loading scan details...</p>
        </div>
      </div>
    );
  }

  if (scanError || !scan || !id) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6 text-xs text-red-600">
        <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm text-center max-w-sm space-y-4">
          <p className="text-2xl">⚠️</p>
          <p className="font-bold">Error loading scan details or scan not found.</p>
          <button
            onClick={() => navigate('/scans')}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer hover:bg-slate-800"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this security scan?')) {
      try {
        await cancelScan.mutateAsync(id);
      } catch (e: any) {
        alert(e.message || 'Failed to cancel scan.');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 font-bold uppercase text-body-xs font-medium rounded">Queued</span>;
      case 'PREPARING':
        return <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold uppercase text-body-xs font-medium rounded animate-pulse">Preparing</span>;
      case 'RUNNING':
        return <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold uppercase text-body-xs font-medium rounded animate-pulse">Running</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 font-bold uppercase text-body-xs font-medium rounded">Completed</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 font-bold uppercase text-body-xs font-medium rounded">Failed</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 font-bold uppercase text-body-xs font-medium rounded">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold uppercase text-body-xs font-medium rounded">{status}</span>;
    }
  };

  const getModuleStatusIcon = (status: string) => {
    switch (status) {
      case 'WAITING':
        return <span className="text-gray-400">⚪</span>;
      case 'RUNNING':
        return <span className="text-blue-500 animate-spin inline-block">🔄</span>;
      case 'COMPLETED':
        return <span className="text-green-600">✅</span>;
      case 'FAILED':
        return <span className="text-red-500">❌</span>;
      case 'SKIPPED':
        return <span className="text-gray-400">⏭️</span>;
      case 'CANCELLED':
        return <span className="text-gray-400">🚫</span>;
      default:
        return <span className="text-gray-400">⚪</span>;
    }
  };

  const isRunning = ['QUEUED', 'PREPARING', 'RUNNING'].includes(scan.status);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-xs text-text-primary p-6 space-y-6">
      
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-warm pb-4">
        <div>
          <button
            onClick={() => navigate('/scans')}
            className="text-body-sm text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors"
          >
            ← Back to Console
          </button>
          <h1 className="text-lg font-light text-text-primary mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Scan Pipeline Execution
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && (
            <button
              onClick={handleCancel}
              disabled={cancelScan.isPending}
              className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 font-bold rounded-xl cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Scan
            </button>
          )}
          <button
            onClick={() => navigate('/scans')}
            className="px-4 py-2 border border-border-warm bg-white font-bold rounded-xl cursor-pointer hover:bg-bg-primary transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* Scan completion banners */}
      {!isRunning && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          scan.status === 'COMPLETED' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{scan.status === 'COMPLETED' ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-bold text-xs">
                {scan.status === 'COMPLETED' ? 'Scan Completed' : 'Scan Completed With Errors'}
              </p>
              <p className="text-body-sm opacity-90 mt-0.5">
                The security assessment finished in {scan.elapsedTime ?? 0}s.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(`/scan/${id}/results`)} 
              className={`px-4 py-2 font-bold rounded-xl text-white text-body-sm transition-colors cursor-pointer ${
                scan.status === 'COMPLETED'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'bg-yellow-600 hover:bg-yellow-700 shadow-sm'
              }`}
            >
              View Scan Results
            </button>
            <button 
              onClick={() => navigate('/scans')} 
              className="px-3 py-2 font-bold rounded-xl border border-border-warm bg-white text-text-secondary text-body-sm hover:bg-bg-primary transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Grid split */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Status, Modules & Progress details */}
        <div className="col-span-7 space-y-6">
          
          {/* Target details and progress bar */}
          <div className="bg-white p-6 rounded-2xl border border-border-warm shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-body-sm uppercase font-bold text-text-muted">Target Asset</p>
                <p className="font-mono text-xs font-bold truncate max-w-md">{scan.targetUrl || 'Target url loading...'}</p>
              </div>
              {getStatusBadge(scan.status)}
            </div>

            {/* Progress Bar container */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-body-sm font-bold text-text-secondary">
                <span>Scan Progress</span>
                <span>{scan.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-border-warm">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${scan.progress}%` }}
                />
              </div>
            </div>

            {/* Currently Executing indicator */}
            {scan.currentModule && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-body-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-blue-700">
                  <span className="animate-pulse">●</span> Currently running: <strong className="capitalize">{scan.currentModule.replace('_', ' ')}</strong> {scan.currentTool ? `(Tool: ${scan.currentTool})` : ''}
                </span>
                <span className="text-body-xs font-medium text-text-muted">
                  Elapsed: {scan.elapsedTime ?? 0}s
                </span>
              </div>
            )}

            {/* Stats block */}
            <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border-warm text-body-sm text-text-secondary">
              <div>
                <span className="text-text-muted block text-body-xs uppercase font-bold">Elapsed / Est</span>
                <span className="font-bold text-text-primary">
                  {scan.elapsedTime ?? 0}s / {scan.estimatedRemaining !== null ? `${scan.estimatedRemaining}s` : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-green-600 block text-body-xs uppercase font-bold">Completed</span>
                <span className="font-bold text-green-700">{(scan.completedModules || []).length} modules</span>
              </div>
              <div>
                <span className="text-red-500 block text-body-xs uppercase font-bold">Failed</span>
                <span className="font-bold text-red-600">{(scan.failedModules || []).length} modules</span>
              </div>
              <div>
                <span className="text-text-muted block text-body-xs uppercase font-bold">Queued</span>
                <span className="font-bold text-text-primary">{(scan.queuedModules || []).length} left</span>
              </div>
            </div>
          </div>

          {/* Dynamic Module States Grid */}
          <div className="bg-white p-6 rounded-2xl border border-border-warm shadow-sm space-y-4">
            <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Scanner Module Pipeline</p>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(scan.modules).map(([name, mod]) => (
                <div
                  key={name}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    mod.status === 'RUNNING' ? 'border-blue-600 bg-blue-50/5' : 'border-border-warm bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-text-primary text-body-sm capitalize">
                      {name.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-3 text-body-xs font-medium text-text-muted">
                      <span>Status: {mod.status}</span>
                      {mod.duration !== null && <span>⏱️ {mod.duration}s</span>}
                    </div>
                    {mod.error && (
                      <p className="text-body-xs text-red-600 truncate max-w-[180px]" title={mod.error}>
                        Error: {mod.error}
                      </p>
                    )}
                  </div>
                  <div>
                    {getModuleStatusIcon(mod.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Live Logs Terminal window */}
        <div className="col-span-5 space-y-6">
          <div className="bg-slate-950 text-[#A6E22E] rounded-2xl border border-slate-800 shadow-lg flex flex-col min-h-[500px] overflow-hidden">
            {/* Terminal Window chrome header */}
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" />
              </div>
              <span className="text-body-xs font-medium font-mono text-slate-500 font-bold uppercase tracking-wider">
                cipherlens_pipeline.log
              </span>
              <span className="w-6" />
            </div>

            {/* Scrollable Logs body */}
            <div className="flex-1 p-4 font-mono text-body-sm leading-relaxed overflow-y-auto space-y-2 select-text text-left">
              {logsData && logsData.logs && logsData.logs.length > 0 ? (
                logsData.logs.map((item, index) => {
                  const logColor = 
                    item.level === 'ERROR' ? 'text-red-500' :
                    item.level === 'WARNING' ? 'text-yellow-500' : 'text-[#66D9EF]';
                  return (
                    <div key={index} className="flex items-start gap-1">
                      <span className="text-slate-600 flex-shrink-0">
                        [{new Date(item.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={`${logColor} font-bold flex-shrink-0`}>
                        [{item.level}]
                      </span>
                      <span className="text-slate-100 flex-1 whitespace-pre-wrap">
                        {item.message}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-500 italic">No execution logs received yet. Preparing worker stream...</p>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
