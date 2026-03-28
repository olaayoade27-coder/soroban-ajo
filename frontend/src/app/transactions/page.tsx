'use client';

import React, { useState, useMemo } from 'react';
import { Download, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useContractData';
import { useTransactionHistory, type TxRow } from '@/hooks/useTransactionHistory';
import { TransactionDetailModal } from '@/components/TransactionDetailModal';
import { FilterBar } from './FilterBar';
import { TransactionsTable } from './TransactionsTable';
import { Pagination } from './Pagination';
import { exportToCSV, exportToPDF } from '@/utils/exportTransactions';
import type { Transaction } from '@/types';

// ─── Demo seed (replace with real API data) ───────────────────────────────────

function seedTransactions(groups: { id: string; name: string }[]): TxRow[] {
  if (groups.length === 0) return [];
  const types: Transaction['type'][] = ['contribution', 'payout', 'refund'];
  const statuses: Transaction['status'][] = ['completed', 'confirmed', 'pending', 'failed'];
  const members = [
    'GAABC...XYZ1', 'GBBCD...XYZ2', 'GCCDE...XYZ3',
    'GDDEF...XYZ4', 'GEEFG...XYZ5',
  ];

  return Array.from({ length: 60 }, (_, i) => {
    const group = groups[i % groups.length];
    const type = types[i % types.length];
    const daysAgo = i * 3;
    const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    return {
      id: `tx-${i + 1}`,
      groupId: group.id,
      groupName: group.name,
      member: members[i % members.length],
      amount: 50 + (i % 10) * 25,
      type,
      timestamp: date,
      status: statuses[i % statuses.length],
      hash: i % 4 !== 0 ? `hash${i}abc123def456` : undefined,
    };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { address } = useAuth();
  const { data: groups = [], isLoading: groupsLoading } = useGroups(address ?? undefined);

  // Build flat transaction list across all groups
  // TODO: replace seedTransactions() with real API call e.g. useAllTransactions(address)
  const allTransactions = useMemo<TxRow[]>(
    () => seedTransactions(groups.map((g) => ({ id: g.id, name: g.name }))),
    [groups]
  );

  const groupOptions = useMemo(
    () => groups.map((g) => ({ id: g.id, name: g.name })),
    [groups]
  );

  const {
    filters, sort, page, pageSize, totalPages, totalFiltered, totalAll,
    rows, exportData,
    updateFilter, resetFilters, toggleSort, setPage, changePageSize,
  } = useTransactionHistory(allTransactions);

  // Detail modal
  const [selectedTx, setSelectedTx] = useState<TxRow | null>(null);

  // Export handlers
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const handleExportCSV = () => {
    setExporting('csv');
    try {
      exportToCSV(exportData, `transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await exportToPDF(exportData, `transactions-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-slate-400"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Transaction History</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                All contributions, payouts, and refunds across your groups
              </p>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={exporting !== null || exportData.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              {exporting === 'csv' ? 'Exporting…' : 'CSV'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting !== null || exportData.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          groups={groupOptions}
          totalFiltered={totalFiltered}
          totalAll={totalAll}
          onUpdate={updateFilter}
          onReset={resetFilters}
        />

        {/* Table */}
        <TransactionsTable
          rows={rows}
          sort={sort}
          onSort={toggleSort}
          onRowClick={setSelectedTx}
          isLoading={groupsLoading}
        />

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalFiltered={totalFiltered}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />

      </div>

      {/* Detail modal */}
      <TransactionDetailModal
        transaction={selectedTx as Transaction | null}
        isOpen={selectedTx !== null}
        onClose={() => setSelectedTx(null)}
      />
    </main>
  );
}
