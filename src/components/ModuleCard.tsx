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
      status === 'active' ? 'border-accent/20 bg-accent/[0.02]' : 'border-white/5'
    } ${className}`}>
      <div className="p-5 pb-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className={`${status === 'alert' ? 'text-alert' : status === 'active' ? 'text-accent' : 'text-muted/40'}`}>
            {icon}
          </div>
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${status === 'alert' ? 'text-alert' : 'text-ink/60'}`}>
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[8px] font-black text-accent uppercase tracking-widest leading-none">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onAction && (
            <button 
              onClick={onAction} 
              className="p-1.5 bg-white/5 rounded-lg text-muted/40 hover:text-accent hover:bg-accent/10 transition-all focus-visible-outline"
              aria-label={`Action for ${title}`}
            >
              {actionIcon || <Plus className="w-3.5 h-3.5" />}
            </button>
          )}
          {canExpand && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-white/5 rounded-lg text-muted/40 hover:text-accent hover:bg-accent/10 transition-all focus-visible-outline"
              aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
              title={isExpanded ? "Collapse Matrix" : "Expand Matrix"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className={`p-4 transition-all duration-500 overflow-y-auto scrollbar-custom ${isExpanded ? 'max-h-[400px]' : ''}`}>
        {!hasItems ? (
          <div className="py-8 text-center text-[9px] font-black text-muted/10 uppercase tracking-widest">
            No data protocol initialized
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
                  <span className="text-[8px] font-bold text-muted/20 uppercase tracking-widest">
                     + {items.length - maxItems} More Encrypted
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
