import { useState, useCallback } from 'react';
import { TransactionSimulator, SimulationResult } from '@/services/transactionSimulator';

export function useSimulation(rpcUrl: string) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(
    async (xdr: string) => {
      setLoading(true);
      setError(null);
      try {
        const simulator = new TransactionSimulator(rpcUrl);
        const simulationResult = await simulator.simulateTransaction(xdr);
        setResult(simulationResult);
        if (!simulationResult.success) {
          setError(simulationResult.error || 'Simulation failed');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [rpcUrl]
  );

  return { result, loading, error, simulate };
}
