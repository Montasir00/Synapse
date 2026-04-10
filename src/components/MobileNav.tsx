import { LayoutDashboard, CheckCircle2, CreditCard, Dumbbell, LineChart, Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'expenses', label: 'Expenses', icon: CreditCard },
  { id: 'exercises', label: 'Exercises', icon: Dumbbell },
  { id: 'trade-tracker', label: 'Trade Tracker', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden border-t border-border/60 bg-surface"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex items-center justify-around gap-1 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative isolate flex items-center justify-center flex-1 h-14 min-w-0 rounded-2xl transition-all duration-300 focus-visible-outline overflow-hidden"
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-[3px] bg-accent/10 rounded-2xl border border-accent/30"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className={`p-2 transition-all duration-500 ${isActive ? 'scale-110 text-accent drop-shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)]' : 'text-muted/50'}`}>
                <Icon 
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className="w-6 h-6 transition-all duration-500" 
                />
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
