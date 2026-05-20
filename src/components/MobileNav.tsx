import { LayoutDashboard, CheckCircle2, CreditCard, Coins, Dumbbell, LineChart, Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'expenses', label: 'Expenses', icon: CreditCard },
  { id: 'loans', label: 'Loans', icon: Coins },
  { id: 'exercises', label: 'Exercises', icon: Dumbbell },
  { id: 'trade-tracker', label: 'Trade Tracker', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-[80] lg:hidden px-4 flex justify-center pointer-events-none">
      <nav
        className="pointer-events-auto bg-surface/70 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-around gap-1 px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative isolate flex items-center justify-center flex-1 h-14 min-w-0 rounded-2xl transition-all duration-300 focus-visible-outline"
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active-bg"
                    className="absolute inset-[4px] bg-accent/20 rounded-[24px] border border-accent/30 z-0"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={`relative z-10 p-2 transition-all duration-500 ${isActive ? 'scale-110 text-accent' : 'text-muted/40'}`}>
                  <Icon 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`w-6 h-6 transition-all duration-500 ${isActive ? 'drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]' : ''}`} 
                    aria-hidden="true"
                  />
                </div>
                {isActive && (
                    <motion.div 
                        layoutId="active-dot"
                        className="absolute bottom-1 w-1 h-1 bg-accent rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
