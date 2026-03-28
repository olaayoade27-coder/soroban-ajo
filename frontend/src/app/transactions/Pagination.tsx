'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS, type PageSizeOption } from '@/hooks/useTransactionHistory';

interface Props {
  page: number;
  totalPages: number;
  pageSize: PageSizeOption;
  totalFiltered: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: PageSizeOption) => void;
}

export function Pagination({ page, totalPages, pageSize, totalFiltered, onPageChange, onPageSizeChange }: Props) {
  const from = Math.min((page - 1) * pageSize + 1, totalFiltered);
  const to = Math.min(page * pageSize, totalFiltered);

  // Build page numbers with ellipsis
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnBase = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors';
  const btnActive = `${btnBase} bg-indigo-600 text-white`;
  const btnInactive = `${btnBase} text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700`;
  const btnDisabled = `${btnBase} text-gray-300 dark:text-slate-600 cursor-not-allowed`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      {/* Count + page size */}
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
        <span>{totalFiltered === 0 ? '0' : `${from}–${to}`} of {totalFiltered}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSizeOption)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s} per page</option>
          ))}
        </select>
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={page === 1 ? btnDisabled : btnInactive}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-gray-400 dark:text-slate-500 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={p === page ? btnActive : btnInactive}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={page === totalPages ? btnDisabled : btnInactive}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
