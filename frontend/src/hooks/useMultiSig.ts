import { useState, useCallback } from 'react';

export interface MultiSigProposal {
  id: string;
  threshold: number;
  signers: Array<{ address: string; signed: boolean; timestamp?: number }>;
  expiresAt: number;
  status: 'pending' | 'in-progress' | 'complete' | 'expired';
}

export function useMultiSig(apiUrl: string) {
  const [proposals, setProposals] = useState<Map<string, MultiSigProposal>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = useCallback(
    async (signers: string[], threshold: number, expiryMinutes: number = 60) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/multisig/proposals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signers,
            threshold,
            expiresAt: Date.now() + expiryMinutes * 60 * 1000,
          }),
        });

        if (!response.ok) throw new Error('Failed to create proposal');
        const proposal = await response.json();
        setProposals((prev) => new Map(prev).set(proposal.id, proposal));
        return proposal;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const signProposal = useCallback(
    async (proposalId: string, signer: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/multisig/proposals/${proposalId}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signer }),
        });

        if (!response.ok) throw new Error('Failed to sign proposal');
        const updated = await response.json();
        setProposals((prev) => new Map(prev).set(proposalId, updated));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const getProposal = useCallback(
    (proposalId: string) => proposals.get(proposalId),
    [proposals]
  );

  return {
    proposals,
    loading,
    error,
    createProposal,
    signProposal,
    getProposal,
  };
}
