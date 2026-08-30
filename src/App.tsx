/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense, useMemo, Fragment, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy load pages for performance with automatic reload retry on failure
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const Tasks = lazyWithRetry(() => import('./components/Tasks'));
const Expenses = lazyWithRetry(() => import('./components/Expenses'));
const Exercises = lazyWithRetry(() => import('./components/Exercises'));
const TradeTracker = lazyWithRetry(() => import('./components/TradeTracker'));
const TempApiKeyCheck = lazyWithRetry(() => import('./components/TempApiKeyCheck'));
const Settings = lazyWithRetry(() => import('./components/Settings'));
const Loans = lazyWithRetry(() => import('./components/Loans'));
import LogExpenseModal from './components/LogExpenseModal';
import TaskModal from './components/TaskModal';
import LogExerciseModal from './components/LogExerciseModal';
import { Sparkles, X } from 'lucide-react';
import { Task, Transaction, Budget, Note, Loan } from './types';
import { Toaster, toast } from 'sonner';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  DashboardSkeleton,
  MetricCardSkeleton,
  TaskCardSkeleton,
  ExpenseRowSkeleton,
  ChartSkeleton,
  Skeleton
} from './components/SkeletonLoader';
import PullToRefresh from './components/PullToRefresh';
import { haptics } from './utils/haptics';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  where, 
  getDocs,
  getDoc,
  orderBy,
  limit,
  writeBatch,
  increment
} from 'firebase/firestore';
import { 
  PersistedMetrics, 
  TradeSyncMetadata, 
  Position as BinancePosition 
} from './types/binance';
import { performGlobalTradeSync } from './services/tradeSyncService';
import { prunePersistedTrades, prunePersistedPositions } from './services/tradePersistenceService';

const ITALY_TIME_ZONE = 'Europe/Rome';

const getItalyDateKey = (dateInput: Date | string): string => {
  const value = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(value.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ITALY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
};

const SectionSkeleton = ({ className }: { className?: string }) => (
  <div className={`soothing-card bg-surface border-border overflow-hidden ${className || ''}`}>
    <div className="h-full w-full skeleton-shimmer" />
  </div>
);

const TabSkeleton = ({ activeTab }: { activeTab: string }) => {
  if (activeTab === 'expenses') {
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
            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
              <ExpenseRowSkeleton />
              <ExpenseRowSkeleton />
              <ExpenseRowSkeleton />
              <ExpenseRowSkeleton />
            </div>
          </div>
          <div className="lg:col-span-5 space-y-5 sm:space-y-8">
            <SectionSkeleton className="h-[260px]" />
            <SectionSkeleton className="h-[380px]" />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'tasks') {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8 lg:space-y-12">
        <div className="flex gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8">
        <div className="soothing-card bg-surface border-border p-6 space-y-4 h-40">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <SectionSkeleton className="h-72" />
          <SectionSkeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (activeTab === 'exercises') {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8 lg:space-y-10 pb-20 sm:pb-24 lg:pb-32">
        <div className="grid grid-cols-3 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      </div>
    );
  }

  if (activeTab === 'trade-tracker') {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8 lg:space-y-10 pb-20 sm:pb-24 lg:pb-32">
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <SectionSkeleton className="h-[260px]" />
          <SectionSkeleton className="h-[260px]" />
        </div>
      </div>
    );
  }

  return <DashboardSkeleton />;
};

const DEFAULT_SOURCE_OPTIONS = [
  'Salary',
  'Bank Transfer',
  'Card',
  'Cash',
  'Investments',
];

export default function App() {
  useEffect(() => {
    try {
      sessionStorage.removeItem('page_has_reloaded_for_chunk_error');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'dashboard';
    }
    return 'dashboard';
  });
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isSyncingFinancials, setIsSyncingFinancials] = useState(false);
  const [isSyncingTrades, setIsSyncingTrades] = useState(false);

  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customSources, setCustomSources] = useState<string[]>(DEFAULT_SOURCE_OPTIONS);
  
  // Dynamic Merchant & Category Logic
  const categories = useMemo(() => {
    const defaultCats = ['Technology', 'Dining', 'Lifestyle', 'Housing', 'Travel', 'Income', 'Health', 'Education'];
    const activeCats = new Set([...defaultCats, ...(customCategories || []), ...(transactions || []).map(t => t.category), ...(budgets || []).map(b => b.category)]);
    return Array.from(activeCats).sort();
  }, [transactions, budgets, customCategories]);

  const uniqueMerchants = useMemo(() => {
    const merchants = (transactions || [])
      .map(t => t.merchant)
      .filter((m): m is string => !!m);
    
    // Count frequency
    const counts: Record<string, number> = {};
    merchants.forEach(m => counts[m] = (counts[m] || 0) + 1);
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([m]) => m);
  }, [transactions]);

  const [merchantToCategory, setMerchantToCategory] = useState<Record<string, string>>({});
  const [exerciseSessions, setExerciseSessions] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [tradeBufferState, setTradeBufferState] = useState({
    openPositions: 0,
    closedPositions: 0,
    totalNetPnl: 0,
    totalUnrealizedPnl: 0,
    totalFees: 0,
    avgHoldDuration: { winner: 0, loser: 0 },
    tagPerformance: {} as Record<string, { pnl: number; count: number }>,
    lastSyncAt: null as number | null,
    hasError: false,
  });
  const [settingsDocId, setSettingsDocId] = useState<string | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [allTimeSavings, setAllTimeSavings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    const nextTab = activeTab === 'dashboard' ? null : activeTab;
    const currentTab = currentUrl.searchParams.get('tab');

    if (nextTab === currentTab) return;

    if (nextTab) currentUrl.searchParams.set('tab', nextTab);
    else currentUrl.searchParams.delete('tab');

    window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextTab = params.get('tab') || 'dashboard';
      setActiveTab(nextTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);



  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // PWA Install Event Handler
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Global Keyboard Navigation and Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (isTyping) {
        if (e.key === 'Escape') {
          setIsExpenseModalOpen(false);
          setEditingTransaction(null);
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setIsExerciseModalOpen(false);
        }
        return;
      }

      // Tab switching: Alt + 1/2/3/4/5
      if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const tabMap: Record<string, string> = {
          '1': 'dashboard',
          '2': 'tasks',
          '3': 'expenses',
          '4': 'loans',
          '5': 'settings'
        };
        if (tabMap[e.key]) {
          setActiveTab(tabMap[e.key]);
          haptics.light();
        }
        return;
      }

      // Add Item shortcut: N key
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        haptics.light();
        if (activeTabRef.current === 'tasks') {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        } else if (activeTabRef.current === 'expenses') {
          setEditingTransaction(null);
          setIsExpenseModalOpen(true);
        } else if (activeTabRef.current === 'exercises') {
          setIsExerciseModalOpen(true);
        }
      }

      // Escape key to close modals
      if (e.key === 'Escape') {
        setIsExpenseModalOpen(false);
        setEditingTransaction(null);
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setIsExerciseModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Data from Firestore
  useEffect(() => {
    // We only attach cloud listeners if a user is authenticated.
    // Guest mode relies on local state (empty) or future local persistence.
    if (!user) {
      setTasks([]);
      setTransactions([]);
      setBudgets([]);
      setExerciseSessions([]);
      setNotes([]);
      setLoans([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const currentUid = user.uid;

    // Track initial snapshots for critical collections to ensure smooth skeleton-to-content transition
    const initialLoads = {
      tasks: false,
      transactions: false,
      budgets: false,
      loans: false,
      openPositions: false,
      settings: false,
    };

    const markLoaded = (key: keyof typeof initialLoads) => {
      initialLoads[key] = true;
      if (
        initialLoads.tasks &&
        initialLoads.transactions &&
        initialLoads.budgets &&
        initialLoads.loans &&
        initialLoads.openPositions &&
        initialLoads.settings
      ) {
        setIsLoading(false);
      }
    };

    // Safety fallback timeout: if Firestore takes too long or is offline, force show layout after 1.5s
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    // Tasks Listener — fetches all tasks for this user.
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('uid', '==', currentUid)
    );
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData: Task[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Task;
        if (data.status !== 'done' || data.taskCategory === 'daily') {
          tasksData.push({ ...data, id: doc.id } as Task);
        }
      });
      setTasks(tasksData);
      markLoaded('tasks');
    }, (error) => {
      console.error("[Firebase Sync] Tasks listener error:", error);
      markLoaded('tasks');
    });

    // Transactions Listener — load all user transactions.
    const transQuery = query(
      collection(db, 'transactions'),
      where('uid', '==', currentUid)
    );
    const unsubscribeTrans = onSnapshot(transQuery, (snapshot) => {
      const transData: Transaction[] = [];
      snapshot.forEach((doc) => transData.push({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(transData);
      markLoaded('transactions');
    }, (error) => {
      console.error("[Firebase Sync] Transactions listener error:", error);
      markLoaded('transactions');
    });

    // Budgets Listener
    const budgetsQuery = query(collection(db, 'budgets'), where('uid', '==', currentUid));
    const unsubscribeBudgets = onSnapshot(budgetsQuery, (snapshot) => {
      const budgetsData: Budget[] = [];
      snapshot.forEach((doc) => budgetsData.push({ ...doc.data(), id: doc.id } as Budget));
      setBudgets(budgetsData);
      markLoaded('budgets');
    }, (error) => {
      console.error("Budgets listener error:", error);
      markLoaded('budgets');
    });

    // Exercises Listener — limited to last 30 sessions.
    const exercisesQuery = query(
      collection(db, 'exercises'),
      where('uid', '==', currentUid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubscribeExercises = onSnapshot(exercisesQuery, (snapshot) => {
      const exercisesData: any[] = [];
      snapshot.forEach((doc) => exercisesData.push({ ...doc.data(), id: doc.id }));
      setExerciseSessions(exercisesData);
    }, (error) => console.error("[Firebase Sync] Exercises listener error:", error));

    const notesQuery = query(collection(db, 'notes'), where('uid', '==', currentUid));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => notesData.push({ ...doc.data(), id: doc.id } as Note));
      setNotes(notesData);
    }, (error) => console.error("Notes listener error:", error));

    // Loans Listener
    const loansQuery = query(collection(db, 'loans'), where('uid', '==', currentUid));
    const unsubscribeLoans = onSnapshot(loansQuery, (snapshot) => {
      const loansData: Loan[] = [];
      snapshot.forEach((doc) => loansData.push({ ...doc.data(), id: doc.id } as Loan));
      setLoans(loansData);
      markLoaded('loans');
    }, (error) => {
      console.error("[Firebase Sync] Loans listener error:", error);
      markLoaded('loans');
    });

    // Open Positions Listener
    const openPositionsQuery = query(
      collection(db, 'binance_positions', currentUid, 'items'),
      where('status', '==', 'OPEN')
    );
    const unsubscribeOpenPositions = onSnapshot(openPositionsQuery, (snapshot) => {
      const positionsData: any[] = [];
      snapshot.forEach((doc) => positionsData.push({ ...doc.data(), id: doc.id }));
      setOpenPositions(positionsData);
      markLoaded('openPositions');
    }, (error) => {
      console.error("[Firebase Sync] Open positions listener error:", error);
      markLoaded('openPositions');
    });

    // App Settings Listener — also carries allTimeSavings aggregate.
    const appSettingsQuery = query(collection(db, 'app_settings'), where('uid', '==', currentUid));
    const unsubscribeSettings = onSnapshot(appSettingsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setSettingsDocId(snapshot.docs[0].id);
        const settings = snapshot.docs[0].data();
        setMonthlyBudget(settings.monthlyBudget || 0);

        // Read the pre-computed all-time savings aggregate.
        if (typeof settings.allTimeSavings === 'number') {
          setAllTimeSavings(settings.allTimeSavings);
        } else {
          console.log('[BillingGuard] allTimeSavings missing — running one-time migration...');
          getDocs(query(collection(db, 'transactions'), where('uid', '==', currentUid)))
            .then((snap) => {
              let total = 0;
              snap.forEach((d) => {
                const t = d.data() as Transaction;
                total += t.type === 'income' ? t.amount : -t.amount;
              });
              setAllTimeSavings(total);
              updateDoc(doc(db, 'app_settings', snapshot.docs[0].id), {
                allTimeSavings: total,
              }).catch(console.error);
              console.log(`[BillingGuard] Migration complete. allTimeSavings = $${total.toFixed(2)}`);
            })
            .catch(console.error);
        }

        const cloudTradeEpoch = Number(settings.tradeTrackerEpoch || 0);
        if (Number.isFinite(cloudTradeEpoch) && cloudTradeEpoch > 0) {
          localStorage.setItem('binance_trade_epoch', String(cloudTradeEpoch));
          localStorage.setItem('binance_last_pruned_epoch', String(cloudTradeEpoch));
        }

        setMerchantToCategory(settings.merchantCategoryMap ?? {});
        setCustomCategories(settings.customExpenseCategories ?? []);

        const persistedSources = Array.isArray(settings.sourceOptions)
          ? settings.sourceOptions.map((s: unknown) => String(s).trim()).filter(Boolean)
          : [];
        const normalizedSources = persistedSources.length > 0
          ? Array.from(new Set(persistedSources))
          : DEFAULT_SOURCE_OPTIONS;

        setCustomSources(normalizedSources);
      } else if (currentUid) {
        setSettingsDocId(null);
        const defaultSettings = {
          uid: currentUid,
          monthlyBudget: 0,
          allTimeSavings: 0,
          tradeTrackerEpoch: 0,
          merchantCategoryMap: {},
          customExpenseCategories: [],
          sourceOptions: DEFAULT_SOURCE_OPTIONS,
          updatedAt: new Date().toISOString(),
        };
        addDoc(collection(db, 'app_settings'), defaultSettings).catch(err => console.error(err));
      } else {
        setSettingsDocId(null);
        setMonthlyBudget(0);
        setAllTimeSavings(0);
        setMerchantToCategory({});
        setCustomCategories([]);
        setCustomSources(DEFAULT_SOURCE_OPTIONS);
      }
      markLoaded('settings');
    }, (error) => {
      console.error("[Firebase Sync] App settings listener error:", error);
      markLoaded('settings');
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribeTasks();
      unsubscribeTrans();
      unsubscribeBudgets();
      unsubscribeExercises();
      unsubscribeNotes();
      unsubscribeLoans();
      unsubscribeOpenPositions();
      unsubscribeSettings();
    };
  }, [user?.uid, isAuthReady]);

  // Trade tracker persisted-state listeners for dashboard buffer cards.
  // NOTE: The binance_positions sub-collection listener has been REMOVED from here.
  // openPositions count is now read from user_trades_sync metadata (1 doc instead of N docs).
  useEffect(() => {
    if (!user?.uid) return;

    const metricsRef = doc(db, 'binance_metrics', user.uid);
    const syncRef = doc(db, 'user_trades_sync', user.uid);

    const unsubscribeMetrics = onSnapshot(metricsRef, (snap) => {
      const data = snap.data() as PersistedMetrics | undefined;
      setTradeBufferState((prev) => ({
        ...prev,
        totalNetPnl: data?.totalNetPnl || 0,
        totalUnrealizedPnl: data?.totalUnrealizedPnl || 0,
        totalFees: data?.totalFees || 0,
        avgHoldDuration: {
          winner: data?.avgHoldTimeWinner || 0,
          loser: data?.avgHoldTimeLoser || 0,
        },
        tagPerformance: data?.tagPerformance || {},
      }));
    });

    // openPositions is now sourced from sync metadata (saved by the sync service)
    // instead of reading every position document individually.
    const unsubscribeSync = onSnapshot(syncRef, (snap) => {
      const data = snap.data() as TradeSyncMetadata | undefined;
      setTradeBufferState((prev) => ({
        ...prev,
        lastSyncAt: data?.lastSyncTime || null,
        hasError: !!data?.hasError,
        closedPositions: data?.positionsCount || 0,
        // openPositionsCount is not in TradeSyncMetadata yet; keep previous value.
        openPositions: prev.openPositions,
      }));
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeSync();
    };
  }, [user?.uid]);

  // Global background sync on app entry (sessions-based lock)
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const SYNC_KEY = `synapse_last_auto_sync_${user.uid}`;
    const lastSyncStr = localStorage.getItem(SYNC_KEY);
    const lastSyncAt = lastSyncStr ? parseInt(lastSyncStr) : 0;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (Date.now() - lastSyncAt < TWENTY_FOUR_HOURS) {
      console.log("[Sync Service] Daily quota met. Skipping automated background sync.");
      return;
    }

    const triggerSync = async () => {
      if (isSyncingTrades) return;
      try {
        const idToken = await user.getIdToken();
        console.log("[Sync Service] Triggering daily automated background sync...");
        setIsSyncingTrades(true);
        const result = await performGlobalTradeSync(idToken, user.uid);
        setIsSyncingTrades(false);
        
        if (result.success) {
          localStorage.setItem(SYNC_KEY, Date.now().toString());
          console.log(`[Sync Service] Daily background sync complete. Captured ${result.tradeCount} trades.`);
        } else {
          console.error("[Sync Service] Daily background sync failed:", result.error);
        }
      } catch (err) {
        console.error("[Sync Service] Error in daily automated trigger:", err);
      }
    };

    const timer = setTimeout(triggerSync, 500); // Slight delay for main UI to settle
    return () => clearTimeout(timer);
  }, [user, isAuthReady]);

  // Navigation Scroll-to-Top Protocol
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const upsertAppSettings = async (updates: Record<string, unknown>) => {
    if (!user?.uid) return false;

    const payload = {
      ...updates,
      uid: user.uid,
      updatedAt: new Date().toISOString(),
    };

    if (settingsDocId) {
      await updateDoc(doc(db, 'app_settings', settingsDocId), payload);
    } else {
      const docRef = await addDoc(collection(db, 'app_settings'), payload);
      setSettingsDocId(docRef.id);
    }

    return true;
  };

  const deleteTransaction = async (id: string) => {
    if (isSyncingFinancials) {
      toast.error('Financial sync in progress. Please wait.');
      return;
    }
    if (!settingsDocId) {
      await deleteDoc(doc(db, 'transactions', id)).catch(console.error);
      toast.success('Transaction deleted.');
      return;
    }
    try {
      // Find the transaction in local state first.
      // If not found (e.g. it's older than our limit(50) window), fetch it from Firestore.
      let tx = transactions.find(t => t.id === id);
      if (!tx) {
        const snap = await getDoc(doc(db, 'transactions', id));
        if (snap.exists()) {
          tx = { ...snap.data(), id: snap.id } as Transaction;
        }
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, 'transactions', id));
      if (tx) {
        const delta = tx.type === 'income' ? -tx.amount : tx.amount;
        batch.update(doc(db, 'app_settings', settingsDocId), {
          allTimeSavings: increment(delta),
        });
      }
      await batch.commit();
      toast.success('Transaction deleted.');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Could not delete transaction.');
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (isSyncingFinancials) {
      toast.error('Financial sync in progress. Please wait.');
      return;
    }
    if (!settingsDocId) {
      await updateDoc(doc(db, 'transactions', id), updates).catch(console.error);
      toast.success('Transaction updated.');
      return;
    }
    try {
      // Find locally first; fall back to Firestore if outside the limit(50) window.
      let tx = transactions.find(t => t.id === id);
      if (!tx && (updates.amount !== undefined || updates.type !== undefined)) {
        const snap = await getDoc(doc(db, 'transactions', id));
        if (snap.exists()) {
          tx = { ...snap.data(), id: snap.id } as Transaction;
        }
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'transactions', id), updates);

      // Recalculate the aggregate delta if amount or type changed.
      if (tx && (updates.amount !== undefined || updates.type !== undefined)) {
        const oldContribution = tx.type === 'income' ? tx.amount : -tx.amount;
        const newType = updates.type ?? tx.type;
        const newAmount = updates.amount ?? tx.amount;
        const newContribution = newType === 'income' ? newAmount : -newAmount;
        const delta = newContribution - oldContribution;
        if (delta !== 0) {
          batch.update(doc(db, 'app_settings', settingsDocId), {
            allTimeSavings: increment(delta),
          });
        }
      }

      await batch.commit();
      toast.success('Transaction updated.');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Could not update transaction.');
    }
  };

  const handleRecalculateFinancials = async () => {
    if (!user?.uid || !settingsDocId || isSyncingFinancials) return;
    setIsSyncingFinancials(true);
    try {
      toast.info('Recalculating all-time savings…');
      const snap = await getDocs(query(collection(db, 'transactions'), where('uid', '==', user.uid)));
      let total = 0;
      snap.forEach((d) => {
        const t = d.data() as Transaction;
        total += t.type === 'income' ? t.amount : -t.amount;
      });
      await updateDoc(doc(db, 'app_settings', settingsDocId), { allTimeSavings: total });
      setAllTimeSavings(total);
      toast.success(`Financials synchronized. Total savings: $${total.toFixed(2)}`);
    } catch (error) {
      console.error('Recalculation error:', error);
      toast.error('Failed to recalculate financials.');
    } finally {
      setIsSyncingFinancials(false);
    }
  };

  const lastRefreshRef = useRef(0);
  const handleRefresh = async () => {
    if (!user?.uid) return;
    const now = Date.now();
    if (now - lastRefreshRef.current < 30000) {
      toast.info('Data is up to date.');
      return;
    }
    lastRefreshRef.current = now;
    await handleRecalculateFinancials();
  };

  const loadTransactionsByRange = async (start: string, end: string) => {
    if (!user?.uid) return [];
    try {
      const snap = await getDocs(
        query(
          collection(db, 'transactions'),
          where('uid', '==', user.uid),
          where('date', '>=', start),
          where('date', '<=', end + 'T23:59:59')
        )
      );
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
    } catch (error) {
      console.error('Error loading historical range:', error);
      toast.error('Could not load historical transactions.');
      return [];
    }
  };

  const upsertBudget = async (category: string, monthlyLimit: number) => {
    try {
      const budgetId = budgets.find(b => b.category === category)?.id || `budget_${category}_${user?.uid || 'guest'}`;
      const payload = {
        category,
        monthly_limit: monthlyLimit,
        uid: user?.uid || null,
        updatedAt: new Date().toISOString()
      };
      console.log(`[Firebase Write] Upserting Budget for ${category}:`, payload);
      await setDoc(doc(db, 'budgets', budgetId), payload, { merge: true });
      toast.success(`${category} budget set to $${monthlyLimit}.`);
    } catch (error: any) {
      console.error('Error upserting budget:', error);
      toast.error('Could not update budget.');
    }
  };

  const setGlobalBudget = async (limit: number) => {
    if (!user?.uid) return;
    try {
      await upsertAppSettings({ monthlyBudget: limit });
      setMonthlyBudget(limit);
      toast.success(`Monthly spending limit set to $${limit}.`);
    } catch (error: any) {
      console.error('Error setting global budget:', error);
      toast.error('Could not update monthly limit.');
    }
  };

  const learnMerchantCategory = async (merchant: string, category: string) => {
    const normalizedMerchant = merchant.trim().toLowerCase();
    if (!normalizedMerchant || !category) return;
    if (merchantToCategory[normalizedMerchant] === category) return;

    const nextMap = {
      ...merchantToCategory,
      [normalizedMerchant]: category,
    };

    setMerchantToCategory(nextMap);

    if (!user?.uid) return;

    try {
      await upsertAppSettings({ merchantCategoryMap: nextMap });
    } catch (error) {
      console.error('Error persisting merchant category mapping:', error);
    }
  };

  const addCustomCategory = async (categoryName: string) => {
    const normalized = categoryName.trim();
    if (!normalized) return;

    const exists = categories.some((c) => c.toLowerCase() === normalized.toLowerCase());
    if (exists) return;

    const nextCategories = [...customCategories, normalized];
    setCustomCategories(nextCategories);

    if (!user?.uid) return;
    try {
      await upsertAppSettings({ customExpenseCategories: nextCategories });
    } catch (error) {
      console.error('Error persisting custom categories:', error);
    }
  };

  const addCustomSource = async (sourceName: string) => {
    const normalized = sourceName.trim();
    if (!normalized) return;

    const exists = customSources.some((s) => s.toLowerCase() === normalized.toLowerCase());
    if (exists) return;

    const nextSources = [...customSources, normalized];
    setCustomSources(nextSources);

    if (!user?.uid) return;
    try {
      await upsertAppSettings({ sourceOptions: nextSources });
    } catch (error) {
      console.error('Error persisting source options:', error);
    }
  };

  const handleUpdateTradeEpoch = async (timestamp: number) => {
    if (!user?.uid || isSyncingTrades) {
      if (isSyncingTrades) toast.error('Sync in progress. Cannot change settings.');
      return;
    }
    
    try {
      const resetEpoch = timestamp.toString();
      localStorage.setItem('binance_trade_epoch', resetEpoch);
      localStorage.setItem('binance_last_pruned_epoch', resetEpoch);
      localStorage.removeItem('binance_price_snapshot');
      localStorage.removeItem('binance_baseline_trades');
      
      await upsertAppSettings({ tradeTrackerEpoch: timestamp });
      toast.success('Tracking start date updated.');
    } catch (error) {
      console.error('Epoch Update Error:', error);
      toast.error('Could not update tracking start date.');
    }
  };

  const handleTradeTrackerHardReset = async () => {
    if (!user?.uid || isSyncingTrades) {
      if (isSyncingTrades) toast.error('Sync in progress. Cannot reset now.');
      return;
    }
    
    try {
      const resetEpoch = Date.now().toString();
      const resetEpochNumber = Number(resetEpoch);
      localStorage.setItem('binance_trade_epoch', resetEpoch);
      localStorage.setItem('binance_last_pruned_epoch', resetEpoch);
      localStorage.removeItem('binance_price_snapshot');
      localStorage.removeItem('binance_baseline_trades');
      
      toast.promise(
        Promise.all([
          upsertAppSettings({ tradeTrackerEpoch: resetEpochNumber }),
          prunePersistedTrades(user.uid),
          prunePersistedPositions(user.uid),
          deleteDoc(doc(db, 'user_trades_sync', user.uid)),
          deleteDoc(doc(db, 'binance_metrics', user.uid))
        ]),
        {
          loading: 'Executing Trade Tracker Hard Reset…',
          success: 'Trade Tracker wiped clean. System at Time Zero.',
          error: 'Hard reset failed. Please try again.'
        }
      );
    } catch (error) {
      console.error('Manual Reset Error:', error);
      toast.error('Could not complete hard reset.');
    }
  };

  const handleSystemReset = async () => {
    const currentUid = user?.uid || null;
    try {
      const collections = ['tasks', 'transactions', 'budgets', 'notes', 'exercises', 'trade_journals', 'crypto_holdings', 'loans'];
      
      // 1. Purge standard collections
      for (const collName of collections) {
        const q = query(collection(db, collName), where('uid', '==', currentUid));
        const snapshot = await getDocs(q);
        console.log(`[System Reset] Purging ${snapshot.size} documents from ${collName}`);
        
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, collName, d.id)));
        await Promise.all(deletePromises);
      }

      // 2. Target specific trade-related documents and sub-collections
      if (currentUid) {
        // Delete metrics and sync status
        try {
          await deleteDoc(doc(db, 'binance_metrics', currentUid));
          await deleteDoc(doc(db, 'user_trades_sync', currentUid));
          
          // Delete positions items sub-collection
          const posRef = collection(db, 'binance_positions', currentUid, 'items');
          const posSnap = await getDocs(posRef);
          await Promise.all(posSnap.docs.map(d => deleteDoc(doc(db, 'binance_positions', currentUid, 'items', d.id))));
        } catch (e) {
          console.warn("[System Reset] Partial failure during trade document purge (might not exist yet):", e);
        }

        await upsertAppSettings({
          monthlyBudget: 0,
          allTimeSavings: 0,
          deepWork: true,
          notifications: false,
          merchantCategoryMap: {},
        });
      }

      setMonthlyBudget(0);
      setMerchantToCategory({});

      toast.success('All your data has been reset.');
    } catch (error: any) {
      console.error('System Reset Error:', error);
      toast.error('Reset failed. Please try again.');
    }
  };

  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    const resetKey = `synapse_last_recurrence_reset_${user?.uid || 'guest'}`;

    const checkDailyReset = () => {
      const italyToday = getItalyDateKey(new Date());
      if (!italyToday) return;
      if (localStorage.getItem(resetKey) === italyToday) return;

      // Persist the reset marker even on empty task lists so newly created tasks
      // later in the day are not immediately marked as missed.
      if (tasks.length === 0) {
        localStorage.setItem(resetKey, italyToday);
        return;
      }

      let dailyTasksToReset: string[] = [];
      let dailyTasksToMarkMissed: string[] = [];

      const todayObj = new Date();

      const isScheduledToday = (task: Task) => {
        if (!task.recurrence || task.recurrence.type === 'daily') return true;
        if (task.recurrence.type === 'none') return false;
        if (task.recurrence.type === 'weekly') {
          return !!task.recurrence.daysOfWeek?.includes(todayObj.getDay());
        }
        if (task.recurrence.type === 'monthly') {
          return !!task.recurrence.dateOfMonth && task.recurrence.dateOfMonth === todayObj.getDate();
        }
        if (task.recurrence.type === 'interval') {
          if (!task.recurrence.intervalDays) return false;
          if (!task.lastCompletedAt) return true;
          const lastCompletedObj = new Date(task.lastCompletedAt);
          if (Number.isNaN(lastCompletedObj.getTime())) return true;
          const diffTime = Math.abs(todayObj.getTime() - lastCompletedObj.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= task.recurrence.intervalDays;
        }
        return false;
      };

      (tasksRef.current || []).forEach(t => {
        if (t.taskCategory !== 'daily') return;

        if (t.status === 'done') {
          if (!t.lastCompletedAt) return;

          const italyCompletedDate = getItalyDateKey(t.lastCompletedAt);
          if (!italyCompletedDate || italyCompletedDate === italyToday) return;

          if (isScheduledToday(t)) {
            dailyTasksToReset.push(t.id);
          }
          return;
        }

        if (t.status === 'todo' && !t.isMissedDaily) {
          if (!isScheduledToday(t)) return;

          const createdItalyDate = t.createdAt ? getItalyDateKey(t.createdAt) : '';
          if (createdItalyDate && createdItalyDate === italyToday) return;

          dailyTasksToMarkMissed.push(t.id);
        }
      });

      dailyTasksToReset.forEach(id => {
        updateDoc(doc(db, 'tasks', id), { status: 'todo', isMissedDaily: false }).catch(console.error);
      });

      dailyTasksToMarkMissed.forEach(id => {
        updateDoc(doc(db, 'tasks', id), { isMissedDaily: true }).catch(console.error);
      });

      localStorage.setItem(resetKey, italyToday);
    };

    // Trigger on mount/change
    checkDailyReset();

    // Heartbeat: Check for midnight transition every 60 seconds
    const interval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Global Keyboard Shortcuts (Cockpit Nav/Log)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.tagName === 'SELECT' || 
         activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return; // Ignore shortcuts when typing in inputs/forms
      }
      
      const key = e.key.toLowerCase();
      
      if (e.altKey) {
        switch (key) {
          case 'd':
            e.preventDefault();
            setActiveTab('dashboard');
            break;
          case 't':
            e.preventDefault();
            setActiveTab('tasks');
            break;
          case 'e':
            e.preventDefault();
            setActiveTab('expenses');
            break;
          case 'l':
            e.preventDefault();
            setActiveTab('loans');
            break;
          case 'r':
            e.preventDefault();
            setActiveTab('trades');
            break;
          case 'x':
            e.preventDefault();
            setActiveTab('exercises');
            break;
          case 's':
            e.preventDefault();
            setActiveTab('settings');
            break;
          case 'n':
            e.preventDefault();
            setIsTaskModalOpen(true);
            break;
          case 'a':
            e.preventDefault();
            setIsExpenseModalOpen(true);
            break;
          case 'g':
            e.preventDefault();
            setIsExerciseModalOpen(true);
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persistent Memory (Notes)
  const addNote = async (content: string) => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, 'notes'), {
        uid: user.uid,
        content,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (e) { console.error('Error adding note:', e); }
  };

  const deleteNote = async (id: string) => {
    try { await deleteDoc(doc(db, 'notes', id)); } catch (e) { console.error('Error deleting note:', e); }
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    try {
      const payload = {
        ...task,
        uid: user?.uid || null,
        createdAt: new Date().toISOString()
      };
      console.log("[Firebase Write] Attempting to add task:", payload);
      const docRef = await addDoc(collection(db, 'tasks'), payload);
      console.log("[Firebase Write] Task added successfully with ID:", docRef.id);
      toast.success('Task created.');
    } catch (error: any) {
      console.error('[Firebase Write] Error adding task:', error);
      if (error.code === 'permission-denied') {
        toast.error('Please sign in to save tasks to the cloud.');
      } else {
        toast.error('Could not create task.');
      }
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'todo' | 'done') => {
    // Capture the original task for highly precise rollback in functional state updates
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    const updates: Partial<Task> = { status };

    if (status === 'done' && originalTask.status !== 'done') {
      if (originalTask.taskCategory === 'daily' && originalTask.isMissedDaily) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        updates.lastCompletedAt = yesterday.toISOString();
      } else {
        updates.lastCompletedAt = new Date().toISOString();
      }
      updates.isMissedDaily = false;
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    haptics.light();

    try {
      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast.success('Task status updated.');
    } catch (error) {
      // Precise targeted rollback on failure to avoid stale list rollback
      setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
      console.error('Error updating task status:', error);
      toast.error('Could not update task status.');
      haptics.error();
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (updates.status === 'done' && task?.status !== 'done') {
        updates.lastCompletedAt = new Date().toISOString();
        updates.isMissedDaily = false;
      }

      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast.success('Task updated.');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Could not update task.');
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    // 1. Optimistic Update
    setTasks(prev => prev.filter(t => t.id !== taskId));
    haptics.heavy();

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      toast.success('Task deleted.');
    } catch (error) {
      // 2. Rollback
      setTasks(prev => prev.some(t => t.id === taskId) ? prev : [...prev, taskToDelete]);
      console.error('Error deleting task:', error);
      toast.error('Could not delete task.');
      haptics.error();
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (isSyncingFinancials) {
      toast.error('Financial sync in progress. Please wait.');
      return;
    }

    // 1. Optimistic Update
    const optimisticTransaction: Transaction = {
      ...transaction,
      id: 'temp-' + Date.now(),
      uid: user?.uid || null,
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => [optimisticTransaction, ...prev]);
    haptics.light();

    try {
      // Use a batch to atomically add the transaction AND update the aggregate.
      const batch = writeBatch(db);
      const newTransRef = doc(collection(db, 'transactions'));
      batch.set(newTransRef, {
        ...transaction,
        uid: user?.uid || null,
        createdAt: new Date().toISOString(),
      });
      // Update the running aggregate in app_settings.
      if (settingsDocId) {
        const delta = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        batch.update(doc(db, 'app_settings', settingsDocId), {
          allTimeSavings: increment(delta),
        });
      }
      await batch.commit();
      toast.success('Transaction saved.');
    } catch (error) {
      // 2. Rollback
      setTransactions(prev => prev.filter(t => t.id !== optimisticTransaction.id));
      console.error('Error adding transaction:', error);
      toast.error('Could not save transaction.');
      haptics.error();
    }
  };

  const addExerciseSession = async (session: any) => {
    try {
      await addDoc(collection(db, 'exercises'), {
        ...session,
        uid: user?.uid || null,
        createdAt: new Date().toISOString()
      });
      toast.success('Exercise session saved.');
    } catch (error) {
      console.error('Error adding exercise session:', error);
      toast.error('Could not save exercise session.');
    }
  };

  const addLoan = async (loan: Omit<Loan, 'id' | 'uid'>) => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, 'loans'), {
        ...loan,
        uid: user.uid,
        createdAt: loan.createdAt || new Date().toISOString()
      });
      toast.success('Loan record added.');
    } catch (error) {
      console.error('Error adding loan:', error);
      toast.error('Could not save loan record.');
    }
  };

  const updateLoan = async (id: string, updates: Partial<Loan>) => {
    try {
      await updateDoc(doc(db, 'loans', id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      toast.success('Loan record updated.');
    } catch (error) {
      console.error('Error updating loan:', error);
      toast.error('Could not update loan record.');
    }
  };

  const deleteLoan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'loans', id));
      toast.success('Loan record deleted.');
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast.error('Could not delete loan record.');
    }
  };

  const toggleLoanStatus = async (id: string, currentStatus: 'pending' | 'settled') => {
    const nextStatus = currentStatus === 'pending' ? 'settled' : 'pending';
    try {
      await updateDoc(doc(db, 'loans', id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(nextStatus === 'settled' ? 'Loan marked as settled.' : 'Loan marked as active.');
    } catch (error) {
      console.error('Error toggling loan status:', error);
      toast.error('Could not update loan status.');
    }
  };

  const handleAddClick = () => {
    if (activeTab === 'tasks') {
      setEditingTask(null);
      setIsTaskModalOpen(true);
    }
    else if (activeTab === 'expenses') setIsExpenseModalOpen(true);
    else if (activeTab === 'exercises') setIsExerciseModalOpen(true);
    else {
      setEditingTask(null);
      setIsTaskModalOpen(true);
    }
  };

  const handleAddTask = useCallback(() => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleAddExpense = useCallback(() => {
    setEditingTransaction(null);
    setIsExpenseModalOpen(true);
  }, []);

  const handleEditExpense = useCallback((t: Transaction) => {
    setEditingTransaction(t);
    setIsExpenseModalOpen(true);
  }, []);

  const handleSetGlobalBudget = useCallback((limit: number) => {
    if (!settingsDocId) return;
    updateDoc(doc(db, 'app_settings', settingsDocId), { monthlyBudget: limit });
  }, [settingsDocId]);

  const handleViewTasks = useCallback(() => setActiveTab('tasks'), []);
  const handleViewExpenses = useCallback(() => setActiveTab('expenses'), []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('Signed in successfully.');
    } catch (error: any) {
      console.error('Error signing in:', error);
      
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized. Add it in Firebase Console > Authentication > Authorized domains.', {
          duration: 10000,
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('The sign-in popup was blocked. Please allow popups and try again.');
      } else {
        toast.error('Could not sign in. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully.');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Could not sign out.');
    }
  };

  const contentView = useMemo(() => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            tasks={tasks} 
            transactions={transactions} 
            budgets={budgets}
            loans={loans}
            openPositions={openPositions}
            allTimeSavings={allTimeSavings}
            onViewTasks={handleViewTasks}
            onViewExpenses={handleViewExpenses}
            onAddTask={handleAddTask}
            onAddExpense={handleAddExpense}
            onAddClick={handleAddClick}
            tradeSnapshot={tradeBufferState}
          />
        );
      case 'tasks':
        return (
          <div className="theme-tasks">
            <Tasks 
              tasks={tasks} 
              notes={notes}
              onUpdateStatus={updateTaskStatus} 
              onAddTask={handleAddTask} 
              onEditTask={handleEditTask}
              onDeleteTask={deleteTask}
              onAddNote={addNote}
              onDeleteNote={deleteNote}
              onLoadHistory={async () => {
                if (!user?.uid) return [];
                const snap = await getDocs(
                  query(
                    collection(db, 'tasks'),
                    where('uid', '==', user.uid),
                    where('status', '==', 'done'),
                    where('taskCategory', '==', 'long-term'),
                    orderBy('lastCompletedAt', 'desc'),
                    limit(100)
                  )
                );
                return snap.docs.map(d => ({ ...d.data(), id: d.id } as Task));
              }}
            />
          </div>
        );
      case 'expenses':
        return (
          <div className="theme-expenses">
            <Expenses 
              transactions={transactions}
              budgets={budgets}
              onAddExpense={handleAddExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={deleteTransaction}
              onUpsertBudget={upsertBudget}
              globalMonthlyBudget={monthlyBudget}
              onSetGlobalBudget={handleSetGlobalBudget}
              allTimeSavings={allTimeSavings}
              onLoadRange={loadTransactionsByRange}
              isSyncing={isSyncingFinancials}
            />
          </div>
        );
      case 'loans':
        return (
          <Loans
            loans={loans}
            onAddLoan={addLoan}
            onEditLoan={updateLoan}
            onDeleteLoan={deleteLoan}
            onToggleStatus={toggleLoanStatus}
          />
        );
      case 'trade-tracker':
        return (
          <div className="theme-trades">
            <TradeTracker 
              onSyncTrades={async () => {
                if (isSyncingTrades) return;
                const idToken = await user?.getIdToken();
                if (idToken && user?.uid) {
                  toast.info('Starting manual sync…');
                  setIsSyncingTrades(true);
                  try {
                    const result = await performGlobalTradeSync(idToken, user.uid);
                    if (result.success) {
                      toast.success(result.tradeCount > 0 ? `Synced ${result.tradeCount} trades.` : 'No new trades found.');
                    } else {
                      toast.error(result.error || 'Sync failed.');
                    }
                  } catch {
                    toast.error('Sync failed unexpectedly.');
                  } finally {
                    setIsSyncingTrades(false);
                  }
                }
              }}
              isSyncing={isSyncingTrades}
            />
          </div>
        );
      case 'exercises':
        return <Exercises sessions={exerciseSessions} onLogSession={() => setIsExerciseModalOpen(true)} />;
      case 'api-check':
        return <TempApiKeyCheck />;
      case 'settings':
        return (
          <Settings 
            user={user} 
            onLogin={handleLogin}
            onSystemReset={handleSystemReset}
            onTradeReset={handleTradeTrackerHardReset}
            onUpdateTradeEpoch={handleUpdateTradeEpoch}
            onOpenApiCheck={() => setActiveTab('api-check')}
            onRecalculateFinancials={handleRecalculateFinancials}
            isSyncingFinancials={isSyncingFinancials}
            isSyncingTrades={isSyncingTrades}
            tasksCount={tasks.length}
            transactionsCount={transactions.length}
            budgetsCount={budgets.length}
            notesCount={notes.length}
            loansCount={loans.length}
            openPositionsCount={openPositions.length}
          />
        );
      default:
        return (
          <Dashboard 
            tasks={tasks} 
            transactions={transactions}
            budgets={budgets}
            loans={loans}
            openPositions={openPositions}
            allTimeSavings={allTimeSavings}
            onViewTasks={() => setActiveTab('tasks')}
            onViewExpenses={() => setActiveTab('expenses')}
            onAddTask={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            onAddExpense={() => {
              setEditingTransaction(null);
              setIsExpenseModalOpen(true);
            }}
            onAddClick={handleAddClick}
            tradeSnapshot={tradeBufferState}
          />
        );
    }
  }, [
    activeTab,
    tasks,
    transactions,
    budgets,
    loans,
    openPositions,
    allTimeSavings,
    tradeBufferState,
    notes,
    user,
    monthlyBudget,
    settingsDocId,
    isSyncingFinancials,
    isSyncingTrades,
    exerciseSessions
  ]);

  const orbPosition = useMemo(() => {
    switch (activeTab) {
      case 'dashboard': return 'top-[-100px] right-[-100px]';
      case 'tasks': return 'bottom-[-100px] right-[-100px]';
      case 'expenses': return 'top-[-100px] left-[-100px]';
      case 'loans': return 'bottom-[10%] left-[-100px]';
      case 'exercises': return 'bottom-[-100px] left-[-100px]';
      case 'trade-tracker': return 'top-[20%] right-[10%]';
      default: return 'top-[-100px] right-[-100px]';
    }
  }, [activeTab]);

  return (
    <MotionConfig reducedMotion="user">
    <div className={`min-h-screen bg-bg text-ink/90 selection:bg-accent/30 selection:text-white theme-${activeTab}`}>
      {/* Skip link — first focusable element for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[300] focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-xl focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Premium Background Elements */}
      <div className={`premium-orb ${orbPosition} bg-accent`} />
      <div className="contextual-glow" />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />
      
      <main id="main-content" className="lg:ml-64 min-h-screen relative px-3 sm:px-3 md:px-5 lg:px-8 xl:px-10 pt-safe-top pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10">
        
        
        <PullToRefresh onRefresh={handleRefresh} disabled={isLoading || !user}>
          <div className="relative">
            {isLoading ? (
              <TabSkeleton activeTab={activeTab} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    mass: 0.5
                  }}
                >
                  <Suspense fallback={<TabSkeleton activeTab={activeTab} />}>
                    {contentView}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </PullToRefresh>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <div className="fixed inset-0 z-[200] pointer-events-none">
        <div className="pointer-events-auto">
          <LogExpenseModal 
            isOpen={isExpenseModalOpen} 
            onClose={() => {
              setIsExpenseModalOpen(false);
              setEditingTransaction(null);
            }} 
            onAdd={addTransaction}
            onUpdate={updateTransaction}
            editingTransaction={editingTransaction}
            categories={categories}
            merchantToCategory={merchantToCategory}
            onLearnMerchantCategory={learnMerchantCategory}
            uniqueMerchants={uniqueMerchants}
            sourceOptions={customSources}
            onAddCategory={addCustomCategory}
            onAddSource={addCustomSource}
          />

          <TaskModal 
            isOpen={isTaskModalOpen}
            onClose={() => {
              setIsTaskModalOpen(false);
              setEditingTask(null);
            }}
            onSave={(payload) => {
              if (editingTask) {
                return updateTask(editingTask.id, payload as Partial<Task>);
              }
              return addTask(payload as Omit<Task, 'id'>);
            }}
            task={editingTask || undefined}
          />

          <LogExerciseModal 
            isOpen={isExerciseModalOpen}
            onClose={() => setIsExerciseModalOpen(false)}
            onAdd={addExerciseSession}
          />
        </div>
      </div>

      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[200] glass-surface border border-accent/25 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-ink font-display">Install Synapse</h4>
                <p className="text-xs text-muted font-medium mt-0.5 leading-snug">Add to your home screen for immediate offline execution.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallPWA}
                className="px-3.5 py-1.5 bg-accent text-bg font-sans font-black text-xs uppercase tracking-wider rounded-lg hover:bg-accent-hover transition-colors shadow-md shadow-accent/10 cursor-pointer"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="p-1.5 rounded-lg bg-surface-subtle text-muted hover:text-ink transition-colors cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster 
        position="bottom-right" 
        theme="dark" 
        closeButton
        toastOptions={{ 
          style: { 
            background: 'rgba(12, 13, 16, 0.85)', 
            backdropFilter: 'blur(24px)', 
            color: 'var(--color-ink)', 
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          } 
        }} 
      />
    </div>
    </MotionConfig>
  );
}

