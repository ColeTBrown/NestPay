// components/QuickBooksConnect.jsx
// Add this component to your landlord dashboard

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function QuickBooksConnect() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null); // 'connected', 'error', null
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const qbConnected = searchParams.get('qb_connected');
    const qbError = searchParams.get('qb_error');

    if (qbConnected === 'true') {
      setStatus('connected');
    } else if (qbError) {
      setStatus('error');
      setErrorMsg(qbError);
    }
  }, [searchParams]);

  const handleConnect = () => {
    window.location.href = '/api/quickbooks/auth';
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <span className="text-2xl">📊</span>
            QuickBooks
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Auto-sync rent payments to QuickBooks as income entries
          </p>
        </div>

        <div className="flex items-center gap-3">
          {status === 'connected' && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Connected
            </span>
          )}
          {status === 'error' && (
            <span className="text-red-400 text-sm">
              Connection failed: {errorMsg}
            </span>
          )}

          <button
            onClick={handleConnect}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              status === 'connected'
                ? 'bg-[#1e293b] text-slate-300 hover:bg-[#334155]'
                : 'bg-[#38BDF8] text-[#020617] hover:bg-[#7DD3FC]'
            }`}
          >
            {status === 'connected' ? 'Reconnect' : 'Connect QuickBooks'}
          </button>
        </div>
      </div>

      {status === 'connected' && (
        <div className="mt-4 pt-4 border-t border-[#1e293b]">
          <p className="text-slate-400 text-xs">
            ✓ Rent payments will automatically appear in QuickBooks as sales receipts
          </p>
        </div>
      )}
    </div>
  );
}
