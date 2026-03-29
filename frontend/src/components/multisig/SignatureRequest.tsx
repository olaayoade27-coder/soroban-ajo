'use client';

import React, { useState } from 'react';

interface Signer {
  address: string;
  signed: boolean;
  timestamp?: number;
}

interface SignatureRequestProps {
  proposalId: string;
  signers: Signer[];
  threshold: number;
  onSign: (proposalId: string) => Promise<void>;
  loading?: boolean;
}

export function SignatureRequest({
  proposalId,
  signers,
  threshold,
  onSign,
  loading = false,
}: SignatureRequestProps) {
  const [error, setError] = useState<string | null>(null);
  const signedCount = signers.filter((s) => s.signed).length;
  const isComplete = signedCount >= threshold;

  const handleSign = async () => {
    setError(null);
    try {
      await onSign(proposalId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign');
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Signature Request</h3>
        <p className="text-sm text-gray-600 mt-1">
          Proposal ID: <span className="font-mono text-xs">{proposalId}</span>
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Signatures</p>
          <p className="text-sm text-gray-600">
            {signedCount} of {threshold} required
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${(signedCount / threshold) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {signers.map((signer) => (
          <div key={signer.address} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${signer.signed ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className="text-xs font-mono text-gray-600">{signer.address.slice(0, 10)}...</span>
            </div>
            {signer.signed && (
              <span className="text-xs text-green-600">✓ Signed</span>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded mb-4">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleSign}
        disabled={loading || isComplete}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
      >
        {loading ? 'Signing...' : isComplete ? 'Complete' : 'Sign Transaction'}
      </button>
    </div>
  );
}
