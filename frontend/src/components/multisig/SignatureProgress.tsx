'use client';

import React from 'react';

interface SignatureProgressProps {
  current: number;
  required: number;
  status: 'pending' | 'in-progress' | 'complete' | 'expired';
  expiresAt?: number;
}

export function SignatureProgress({
  current,
  required,
  status,
  expiresAt,
}: SignatureProgressProps) {
  const percentage = (current / required) * 100;
  const isExpired = status === 'expired';
  const isComplete = status === 'complete';

  const statusColors = {
    pending: 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    complete: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
  };

  const progressColors = {
    pending: 'bg-gray-400',
    'in-progress': 'bg-blue-500',
    complete: 'bg-green-500',
    expired: 'bg-red-500',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {expiresAt && (
            <span className="text-xs text-gray-600">
              Expires: {new Date(expiresAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {current}/{required}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${progressColors[status]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {isExpired && (
        <p className="text-xs text-red-600 font-medium">This signature request has expired</p>
      )}

      {isComplete && (
        <p className="text-xs text-green-600 font-medium">All signatures collected</p>
      )}
    </div>
  );
}
