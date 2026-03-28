import { Search, Bell, UserCircle, Plus, Menu } from 'lucide-react';

interface TopBarProps {
  title: string;
  onAddClick?: () => void;
  onMenuClick: () => void;
  dbStatus?: boolean;
}

export default function TopBar({ title, onAddClick, onMenuClick, dbStatus }: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-20 glass-surface border-b border-white/5 flex justify-between items-center px-6 md:px-10 z-40">
      <div className="flex items-center gap-6 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-muted hover:text-accent transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:block relative w-72 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-3.5 h-3.5 group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            placeholder="Search your sanctuary..." 
            className="w-full bg-white/[0.03] border border-white/5 rounded-full py-2 pl-11 pr-4 text-xs focus:ring-1 focus:ring-accent/30 focus:bg-white/[0.05] transition-all placeholder:text-muted/50 outline-none text-ink"
          />
        </div>
        
        {dbStatus !== undefined && (
          <div className={`hidden sm:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 ml-4`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dbStatus ? 'bg-success shadow-[0_0_10px_rgba(95,122,107,0.4)]' : 'bg-alert shadow-[0_0_10px_rgba(180,106,92,0.4)]'}`} />
            <span className={`text-[9px] uppercase tracking-[0.15em] font-bold text-muted`}>
              {dbStatus ? 'System Online' : 'System Offline'}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4 md:gap-8">
        {onAddClick && (
          <button 
            onClick={onAddClick}
            className="bg-ink text-bg px-6 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-accent hover:text-bg active:scale-95 transition-all shadow-xl shadow-accent/5 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Entry</span>
          </button>
        )}
        <div className="flex gap-1 md:gap-3 text-muted">
          <button className="relative hover:text-accent transition-all p-2.5 hover:bg-white/5 rounded-full">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-bg" />
          </button>
          <button className="hover:text-accent transition-all p-2.5 hover:bg-white/5 rounded-full">
            <UserCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
