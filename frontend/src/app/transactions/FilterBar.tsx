'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import type { TxFilters } from '@/hooks/useTransactionHistory';
import type { Transaction } from '@/types';

interface GroupOption {
  id: string;
  name: string;
}

interface Props {
  filters: TxFilters;
  groups: GroupOption[];
  totalFiltered: number;
  totalAll: number;
  onUpdate: <K extends keyof TxFilters>(key: K, value: TxFilters[K]) => void;
  onReset: () => void;
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition';

const labelCls = 'block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1';

export function FilterBar({ filters, groups, totalFiltered, totalAll, onUpdate, onReset }: Props) {
  const isDirty =
    filters.search ||
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.groupId !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by member address, group, or transaction ID…"
          value={filters.search}
          onChange={(e) => onUpdate('search', e.target.value)}
          className={`${inputCls} pl-9`}
        />
        {filters.search && (
          <button
            onClick={() => onUpdate('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Type */}
        <div>
          <label className={labelCls}>Type</label>
          <select
            value={filters.type}
            onChange={(e) => onUpdate('type', e.target.value as TxFilters['type'])}
            className={inputCls}
          >
            <option value="all">All types</option>
            <option value="contribution">Contribution</option>
            <option value="payout">Payout</option>
            <option value="refund">Refund</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => onUpdate('status', e.target.value as TxFilters['status'])}
            className={inputCls}
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Group */}
        <div>
          <label className={labelCls}>Group</label>
          <select
            value={filters.groupId}
            onChange={(e) => onUpdate('groupId', e.target.value)}
            className={inputCls}
          >
            <option value="all">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className={labelCls}>From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onUpdate('dateFrom', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Date to */}
        <div>
          <label className={labelCls}>To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onUpdate('dateTo', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Showing <span className="font-semibold text-gray-700 dark:text-slate-200">{totalFiltered}</span> of{' '}
          <span className="font-semibold text-gray-700 dark:text-slate-200">{totalAll}</span> transactions
        </p>
        {isDirty && (
          <button
            onClick={onReset}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
