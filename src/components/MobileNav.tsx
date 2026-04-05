import { LayoutDashboard, CheckCircle2, CreditCard, Dumbbell, LineChart, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'expenses', label: 'Finances', icon: CreditCard },
  { id: 'exercises', label: 'Exercise', icon: Dumbbell },
  { id: 'trade-tracker', label: 'Trades', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="bg-surface/95 backdrop-blur-2xl border border-border px-1 sm:px-4 pt-2 pb-2 flex items-center justify-around shadow-md mx-1 sm:mx-3 mb-2 sm:mb-4 rounded-full pill-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative isolate flex flex-col items-center justify-center gap-0.5 sm:gap-1 flex-1 h-[56px] sm:h-[64px] transition-all duration-300 focus-visible-outline overflow-hidden"
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-1 bg-accent/20 rounded-full border border-accent/40 shadow-[0_0_24px_rgba(99,102,241,0.35)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                <Icon
                  className={`transition-all duration-300 ${
                    isActive ? 'text-accent scale-110 w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_0_12px_rgba(99,102,241,0.45)]' : 'text-muted/80 w-4.5 h-4.5 sm:w-5 sm:h-5'
                  }`}
                  aria-hidden="true"
                />
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.08em] text-accent leading-none"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
