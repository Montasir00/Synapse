/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, style }) => {
  return (
    <div
      className={`skeleton-shimmer rounded-lg bg-surface-subtle ${className || ''}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="soothing-card bg-surface border-border p-5 flex flex-col justify-between h-28 sm:h-32">
      <div className="flex justify-between items-start w-full">
        <Skeleton className="h-4 w-24 sm:w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="space-y-2 mt-auto">
        <Skeleton className="h-6 w-16 sm:w-20" />
        <Skeleton className="h-3 w-32 sm:w-36" />
      </div>
    </div>
  );
};

export const TaskCardSkeleton: React.FC = () => {
  return (
    <div className="soothing-card bg-surface border-border p-4 flex gap-4 items-start">
      <Skeleton className="h-5 w-5 rounded-md mt-0.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
};

export const ExpenseRowSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-28 sm:w-36" />
          <Skeleton className="h-3 w-16 sm:w-20" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-16 sm:w-20 text-right" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </div>
  );
};

const STATIC_HEIGHTS = [45, 60, 30, 80, 50, 75, 40, 65, 85, 35, 55, 70];

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="soothing-card bg-surface border-border p-5 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="h-48 sm:h-56 flex items-end gap-2 pt-4">
        {STATIC_HEIGHTS.map((height, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-t"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <ChartSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
        <div className="lg:col-span-7 space-y-4">
          <Skeleton className="h-6 w-36 mb-2" />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <Skeleton className="h-6 w-36 mb-2" />
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};
