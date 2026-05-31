/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';

interface EmptyStateProps {
  iconName: keyof typeof Icons;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName,
  title,
  description,
  actionText,
  onAction,
}) => {
  const IconComponent = Icons[iconName] as React.ComponentType<{ className?: string }>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center p-8 sm:p-12 text-center soothing-card bg-surface/40 border border-border/60 rounded-2xl max-w-md mx-auto my-6"
    >
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft glowing radial background behind icon */}
        <div className="absolute inset-0 bg-accent/10 rounded-full blur-xl w-14 h-14 mx-auto" />
        <div className="relative p-4 rounded-xl bg-surface border border-border/80 text-accent/80 shadow-md">
          {IconComponent && <IconComponent className="h-8 w-8" />}
        </div>
      </div>

      <h3 className="text-balance font-display font-semibold text-lg text-ink mb-2">
        {title}
      </h3>
      
      <p className="text-balance text-sm text-muted mb-6 max-w-[280px] leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-bg font-sans font-medium text-sm rounded-xl hover:bg-accent-hover transition-colors shadow-lg shadow-accent/15 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none cursor-pointer"
        >
          <Icons.Plus className="w-4 h-4" />
          {actionText}
        </motion.button>
      )}
    </motion.div>
  );
};
export default EmptyState;
