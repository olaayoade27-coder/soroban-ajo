'use client';

import React from 'react';
import { SimulationResult } from '@/services/transactionSimulator';

interface SimulationPreviewProps {
  result: SimulationResult | null;
  loading: boolean;
  error: string | null;
}

export function SimulationPreview({ result, loading, error }: SimulationPreviewProps) {
  if (loading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">Simulating transaction...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm font-semibold text-red-700">Simulation Error</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Status</p>
          <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? 'Valid' : 'Invalid'}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700">Estimated Fee</p>
          <p className="text-sm text-gray-600">{result.estimatedFee} stroops</p>
        </div>

        {result.stateChanges.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700">State Changes</p>
            <div className="mt-2 space-y-1">
              {result.stateChanges.map((change, idx) => (
                <div key={idx} className="text-xs bg-white p-2 rounded border border-gray-200">
                  <p className="font-mono text-gray-600">{change.key}</p>
                  <p className="text-gray-500">{change.type}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.warnings && result.warnings.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-yellow-700">Warnings</p>
            <ul className="text-xs text-yellow-600 mt-1 space-y-1">
              {result.warnings.map((w, idx) => (
                <li key={idx}>• {w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
