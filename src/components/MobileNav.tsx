import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  CreditCard, 
  LineChart, 
  Coins, 
  Dumbbell, 
  Settings, 
  Grid, 
  X, 
  KeyRound, 
  LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../utils/haptics';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

const primaryNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'expenses', label: 'Expenses', icon: CreditCard },
  { id: 'trade-tracker', label: 'Trades', icon: LineChart },
];

const secondaryNavItems = [
  { id: 'loans', label: 'Loans', desc: 'Receivables & Payables', icon: Coins },
  { id: 'exercises', label: 'Exercises', desc: 'Physical Load & Exertion', icon: Dumbbell },
  { id: 'settings', label: 'Settings', desc: 'System Protocol Control', icon: Settings },
  { id: 'api-check', label: 'API Check', desc: 'Verify Data Access', icon: KeyRound },
];

export default function MobileNav({ activeTab, setActiveTab, user, onLogout }: MobileNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isMoreActive = ['loans', 'exercises', 'settings', 'api-check'].includes(activeTab);

  // Prevent background body scrolling when drawer is open
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreOpen]);

  const handlePrimaryClick = (id: string) => {
    haptics.light();
    setActiveTab(id);
    setIsMoreOpen(false);
  };

  const handleSecondaryClick = (id: string) => {
    haptics.medium();
    setActiveTab(id);
    setIsMoreOpen(false);
  };

  const handleLogoutClick = () => {
    haptics.heavy();
    setIsMoreOpen(false);
    onLogout();
  };

  return (
    <>
      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden flex justify-center pointer-events-none" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="px-4 w-full flex justify-center">
        <nav
          className="pointer-events-auto bg-surface/75 backdrop-blur-2xl border border-border/30 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-around gap-1 px-2 py-2">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !isMoreOpen;

              return (
                <button
                  key={item.id}
                  onClick={() => handlePrimaryClick(item.id)}
                  className="relative isolate flex flex-col items-center justify-center flex-1 h-14 min-w-0 rounded-2xl transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  aria-label={`Navigate to ${item.label}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-active-bg"
                      className="absolute inset-[4px] bg-accent/15 rounded-xl border border-accent/25 z-0"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-300 ${isActive ? 'scale-105 text-accent' : 'text-muted/50 hover:text-ink/75'}`}>
                    <Icon 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`w-5 h-5 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''}`} 
                      aria-hidden="true"
                    />
                    <span className="text-[10px] uppercase tracking-wide font-bold mt-0.5">{item.label}</span>
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

            {/* "More" Button */}
            <button
              onClick={() => {
                haptics.light();
                setIsMoreOpen(!isMoreOpen);
              }}
              className="relative isolate flex flex-col items-center justify-center flex-1 h-14 min-w-0 rounded-2xl transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              aria-label="Open secondary navigation"
              aria-current={isMoreActive || isMoreOpen ? 'page' : undefined}
            >
              {(isMoreActive || isMoreOpen) && (
                <motion.div
                  layoutId="mobile-nav-active-bg"
                  className="absolute inset-[4px] bg-accent/15 rounded-xl border border-accent/25 z-0"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}
              <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-300 ${isMoreActive || isMoreOpen ? 'scale-105 text-accent' : 'text-muted/50 hover:text-ink/75'}`}>
                <Grid 
                  strokeWidth={isMoreActive || isMoreOpen ? 2.5 : 2}
                  className={`w-5 h-5 transition-all duration-300 ${isMoreActive || isMoreOpen ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''}`} 
                  aria-hidden="true"
                />
                <span className="text-[10px] uppercase tracking-wide font-bold mt-0.5">More</span>
              </div>
              {(isMoreActive || isMoreOpen) && (
                <motion.div 
                  layoutId="active-dot"
                  className="absolute bottom-1 w-1 h-1 bg-accent rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          </div>
        </nav>
        </div>
      </div>

      {/* Drawer Overlay Bottom Sheet */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                haptics.light();
                setIsMoreOpen(false);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] lg:hidden"
            />

            {/* Bottom Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.1, bottom: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  haptics.light();
                  setIsMoreOpen(false);
                }
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
              className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] z-[100] max-h-[82vh] flex flex-col pointer-events-auto overflow-hidden lg:hidden"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-muted/20 rounded-full mx-auto my-4 cursor-grab active:cursor-grabbing shrink-0" />

              {/* Title & Close */}
              <div className="px-6 pb-4 flex justify-between items-center shrink-0">
                <div>
                  <h3 id="mobile-menu-title" className="text-base font-display font-bold text-ink uppercase tracking-tight">Navigation</h3>
                  <p className="text-xs text-muted/60 tracking-wide mt-0.5">Access secondary modules</p>
                </div>
                <button
                  onClick={() => {
                    haptics.light();
                    setIsMoreOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-muted hover:text-accent transition-all"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Grid Content Area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6" style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))' }}>
                <div className="grid grid-cols-2 gap-4">
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSecondaryClick(item.id)}
                        className={`flex flex-col items-start p-5 rounded-3xl border text-left transition-all duration-300 relative overflow-hidden group ${
                          isActive 
                            ? 'bg-accent/14 border-accent/30 text-white shadow-lg shadow-accent/10' 
                            : 'bg-surface-subtle/50 border-border text-muted hover:bg-surface hover:border-accent/20'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all duration-300 mb-4 ${
                          isActive 
                            ? 'bg-accent border-accent text-white shadow-md shadow-accent/15' 
                            : 'bg-surface border-border text-muted group-hover:text-accent group-hover:border-accent/30'
                        }`}>
                          <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wide block transition-colors ${isActive ? 'text-white' : 'text-ink'}`}>{item.label}</span>
                        <span className="text-[10px] font-medium text-muted/70 block mt-1 leading-snug group-hover:text-muted/95 transition-colors">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* User Section inside Drawer */}
                <div className="border-t border-border pt-6 mt-6">
                  <div className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-surface-subtle/40 border border-border/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user?.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=synapse`}
                          alt={user?.displayName || 'User avatar'}
                          width={36}
                          height={36}
                          className="w-10 h-10 rounded-full border border-border object-cover grayscale hover:grayscale-0 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg ${
                            user ? 'bg-success animate-pulse' : 'bg-muted/40'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-ink text-xs font-semibold tracking-tight truncate">
                          {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
                        </p>
                        <div aria-live="polite" aria-atomic="true" className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-medium ${user ? 'text-success' : 'text-muted/60'}`}>
                            {user ? 'Synced' : 'Local Mode'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {user && (
                      <button
                        onClick={handleLogoutClick}
                        className="p-3 bg-alert/5 border border-alert/15 rounded-2xl text-alert hover:bg-alert hover:text-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                        aria-label="Sign out"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
