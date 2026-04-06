import { LayoutDashboard, CheckCircle2, CreditCard, Dumbbell, LineChart, Settings } from 'lucide-react';
import { motion } from 'motion/react';

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
      className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden bg-bg"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="bg-surface/95 backdrop-blur-2xl border border-border flex items-center justify-around shadow-md mx-2 sm:mx-3 mb-2 sm:mb-4 rounded-full overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative isolate flex items-center justify-center flex-1 h-[4.5rem] transition-all duration-300 focus-visible-outline overflow-hidden"
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-[4px] bg-accent/10 rounded-full border border-accent/30"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className={`p-2 transition-all duration-500 scale-110 ${isActive ? 'text-accent drop-shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)]' : 'text-muted/30'}`}>
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
