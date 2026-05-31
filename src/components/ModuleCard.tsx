import React, { useState } from 'react';
import { Plus, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ModuleCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  status?: 'default' | 'alert' | 'active';
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  maxItems?: number;
  badge?: string;
  className?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ 
  title, 
  icon, 
  children, 
  status = 'default', 
  onAction, 
  actionIcon, 
  maxItems = 3, 
  badge,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = React.Children.toArray(children);
  const hasItems = items.length > 0;
  const canExpand = items.length > maxItems;
  const displayedItems = isExpanded ? items : items.slice(0, maxItems);

  return (
    <div className={`soothing-card flex flex-col h-fit transition-all duration-700 border ${
      status === 'alert' ? 'border-alert/20 bg-alert/[0.02]' : 
      status === 'active' ? 'border-accent/20 bg-accent/[0.02]' : 'border-border/40'
    } ${className}`}>
      <div className="p-5 pb-4 flex items-center justify-between border-b border-border/40 bg-surface-subtle/10">
        <div className="flex items-center gap-3">
          <div className={`${status === 'alert' ? 'text-alert' : status === 'active' ? 'text-accent' : 'text-muted/70'}`}>
            {icon}
          </div>
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${status === 'alert' ? 'text-alert' : 'text-ink/60'}`}>
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-accent/14 border border-accent/30 text-[10px] font-semibold text-white/90 tracking-wide leading-none">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onAction && (
            <button 
              onClick={onAction} 
              className="p-1.5 bg-surface-subtle/20 rounded-lg text-muted/70 hover:text-accent hover:bg-accent/10 transition-all focus-visible-outline"
              aria-label={`Action for ${title}`}
            >
              {actionIcon || <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          )}
          {canExpand && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-surface-subtle/20 rounded-lg text-muted/70 hover:text-accent hover:bg-accent/10 transition-all focus-visible-outline"
              aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
              title={isExpanded ? "Collapse Matrix" : "Expand Matrix"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" /> : <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      <div className={`p-4 transition-all duration-500 overflow-y-auto scrollbar-custom ${isExpanded ? 'max-h-[400px]' : ''}`}>
        {!hasItems ? (
          <div className="py-8 text-center text-xs font-medium text-muted/50">
            Nothing here yet
          </div>
        ) : (
          <motion.div 
            layout 
            className="space-y-2.5"
            transition={{ duration: 0.4, ease: "circOut" }}
          >
            {displayedItems}
            {!isExpanded && canExpand && (
               <div className="pt-1 text-center">
                  <span className="text-[10px] font-medium text-muted/50">
                     + {items.length - maxItems} more items
                  </span>
               </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ModuleCard;
