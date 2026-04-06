/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense, useMemo, Fragment } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';

// Lazy load pages for performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const Tasks = lazy(() => import('./components/Tasks'));
const Expenses = lazy(() => import('./components/Expenses'));
const Exercises = lazy(() => import('./components/Exercises'));
const TradeTracker = lazy(() => import('./components/TradeTracker'));
const TempApiKeyCheck = lazy(() => import('./components/TempApiKeyCheck'));
const Settings = lazy(() => import('./components/Settings'));
import LogExpenseModal from './components/LogExpenseModal';
import TaskModal from './components/TaskModal';
import LogExerciseModal from './components/LogExerciseModal';
import { Task, Transaction, Budget, Note } from './types';
import { Toaster, toast } from 'sonner';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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
  getDocs 
} from 'firebase/firestore';
import { 
  PersistedMetrics, 
  TradeSyncMetadata, 
  Position as BinancePosition 
} from './types/binance';
import { performGlobalTradeSync } from './services/tradeSyncService';

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
          {Array.from({ length: 4 }).map((_, i) => (
            <Fragment key={i}>
              <SectionSkeleton className="h-28 sm:h-32" />
            </Fragment>
          ))}
        </div>
        <SectionSkeleton className="h-48 sm:h-56" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
          <SectionSkeleton className="lg:col-span-7 h-[420px]" />
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
        <SectionSkeleton className="h-36 sm:h-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Fragment key={i}>
              <SectionSkeleton className="h-[360px]" />
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8">
        <SectionSkeleton className="h-40" />
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
        <SectionSkeleton className="h-36 sm:h-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Fragment key={i}>
              <SectionSkeleton className="h-44 sm:h-52" />
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'trade-tracker') {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8 lg:space-y-10 pb-20 sm:pb-24 lg:pb-32">
        <SectionSkeleton className="h-36 sm:h-44" />
        <SectionSkeleton className="h-[280px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <SectionSkeleton className="h-[260px]" />
          <SectionSkeleton className="h-[260px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
      <SectionSkeleton className="h-36 sm:h-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Fragment key={i}>
            <SectionSkeleton className="h-28 sm:h-32" />
          </Fragment>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <SectionSkeleton className="lg:col-span-2 h-[260px]" />
        <SectionSkeleton className="h-[260px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <SectionSkeleton className="h-[240px]" />
        <SectionSkeleton className="h-[240px]" />
      </div>
    </div>
  );
};

export default function App() {
  const defaultSourceOptions = [
    'Salary',
    'Bank Transfer',
    'Card',
    'Cash',
    'Investments',
  ];
  const legacySeededSources = [
    'Freelance',
    'Business',
    'GCash',
  ];

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'dashboard';
    }
    return 'dashboard';
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);

  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customSources, setCustomSources] = useState<string[]>(defaultSourceOptions);
  
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
  const [tradeBufferState, setTradeBufferState] = useState({
    openPositions: 0,
    closedPositions: 0,
    totalNetPnl: 0,
    lastSyncAt: null as number | null,
    hasError: false,
  });
  const [settingsDocId, setSettingsDocId] = useState<string | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);



  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("[Firebase Auth] User Status Change:", user ? `Logged in as ${user.uid}` : "Logged out (Guest Mode)");
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
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
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const currentUid = user.uid;

    // Tasks Listener
    const tasksQuery = query(collection(db, 'tasks'), where('uid', '==', currentUid));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      console.log(`[Firebase Sync] Received ${snapshot.docs.length} tasks for user ${currentUid}`);
      const tasksData: Task[] = [];
      snapshot.forEach((doc) => tasksData.push({ ...doc.data(), id: doc.id } as Task));
      setTasks(tasksData);
    }, (error) => {
      console.error("[Firebase Sync] Tasks listener error:", error);
    });

    // Transactions Listener
    const transQuery = query(collection(db, 'transactions'), where('uid', '==', currentUid));
    const unsubscribeTrans = onSnapshot(transQuery, (snapshot) => {
      const transData: Transaction[] = [];
      snapshot.forEach((doc) => transData.push({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(transData);
    }, (error) => console.error("Transactions listener error:", error));

    // Budgets Listener
    const budgetsQuery = query(collection(db, 'budgets'), where('uid', '==', currentUid));
    const unsubscribeBudgets = onSnapshot(budgetsQuery, (snapshot) => {
      const budgetsData: Budget[] = [];
      snapshot.forEach((doc) => budgetsData.push({ ...doc.data(), id: doc.id } as Budget));
      setBudgets(budgetsData);
    }, (error) => console.error("Budgets listener error:", error));

    // Exercises Listener
    const exercisesQuery = query(collection(db, 'exercises'), where('uid', '==', currentUid));
    const unsubscribeExercises = onSnapshot(exercisesQuery, (snapshot) => {
      const exercisesData: any[] = [];
      snapshot.forEach((doc) => exercisesData.push({ ...doc.data(), id: doc.id }));
      setExerciseSessions(exercisesData);
    }, (error) => console.error("Exercises listener error:", error));

    // Notes Listener
    const notesQuery = query(collection(db, 'notes'), where('uid', '==', currentUid));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => notesData.push({ ...doc.data(), id: doc.id } as Note));
      setNotes(notesData);
    }, (error) => console.error("Notes listener error:", error));

    // App Settings Listener (stores non-gamified settings such as monthly budget)
    const appSettingsQuery = query(collection(db, 'app_settings'), where('uid', '==', currentUid));
    const unsubscribeSettings = onSnapshot(appSettingsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setSettingsDocId(snapshot.docs[0].id);
        const settings = snapshot.docs[0].data();
        setMonthlyBudget(settings.monthlyBudget || 0);

        setMerchantToCategory(settings.merchantCategoryMap ?? {});
        setCustomCategories(settings.customExpenseCategories ?? []);

        const persistedSources = Array.isArray(settings.sourceOptions)
          ? settings.sourceOptions.map((s: unknown) => String(s).trim()).filter(Boolean)
          : [];
        const withoutLegacy = persistedSources.filter((s: string) => !legacySeededSources.includes(s));
        const normalizedSources = withoutLegacy.length > 0
          ? Array.from(new Set(withoutLegacy))
          : defaultSourceOptions;

        setCustomSources(normalizedSources);
      } else if (currentUid) {
        setSettingsDocId(null);
        const defaultSettings = {
          uid: currentUid,
          monthlyBudget: 0,
          merchantCategoryMap: {},
          customExpenseCategories: [],
          sourceOptions: defaultSourceOptions,
          updatedAt: new Date().toISOString(),
        };
        addDoc(collection(db, 'app_settings'), defaultSettings).catch(err => console.error(err));
      } else {
        setSettingsDocId(null);
        setMonthlyBudget(0);
        setMerchantToCategory({});
        setCustomCategories([]);
        setCustomSources(defaultSourceOptions);
      }
    }, (error) => console.error("App settings listener error:", error));

    setIsLoading(false);

    return () => {
      unsubscribeTasks();
      unsubscribeTrans();
      unsubscribeBudgets();
      unsubscribeExercises();
      unsubscribeNotes();
      unsubscribeSettings();
    };
  }, [user, isAuthReady]);

  // Trade tracker persisted-state listeners for dashboard buffer cards.
  useEffect(() => {
    if (!user?.uid) return;

    const metricsRef = doc(db, 'binance_metrics', user.uid);
    const syncRef = doc(db, 'user_trades_sync', user.uid);
    const positionsRef = collection(db, 'binance_positions', user.uid, 'items');

    const unsubscribeMetrics = onSnapshot(metricsRef, (snap) => {
      const data = snap.data() as PersistedMetrics | undefined;
      setTradeBufferState((prev) => ({
        ...prev,
        totalNetPnl: data?.totalNetPnl || 0,
        totalFees: data?.totalFees || 0,
        avgHoldDuration: {
          winner: data?.avgHoldTimeWinner || 0,
          loser: data?.avgHoldTimeLoser || 0
        },
        tagPerformance: data?.tagPerformance || {},
      }));
    });

    const unsubscribeSync = onSnapshot(syncRef, (snap) => {
      const data = snap.data() as TradeSyncMetadata | undefined;
      setTradeBufferState((prev) => ({
        ...prev,
        lastSyncAt: data?.lastSyncTime || null,
        hasError: !!data?.hasError,
        closedPositions: data?.positionsCount || 0
      }));
    });

    const unsubscribePositions = onSnapshot(positionsRef, (snap) => {
      let openCount = 0;
      snap.forEach((docSnap) => {
        if (docSnap.data().status === 'OPEN') openCount++;
      });
      setTradeBufferState((prev) => ({
        ...prev,
        openPositions: openCount,
      }));
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeSync();
      unsubscribePositions();
    };
  }, [user?.uid]);

  // Global background sync on app entry (sessions-based lock)
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const SESSION_SYNC_KEY = `synapse_session_sync_${user.uid}`;
    const isAlreadySynced = sessionStorage.getItem(SESSION_SYNC_KEY);

    if (isAlreadySynced) {
      console.log("[Sync Service] Active session sync detected. Skipping background trigger.");
      return;
    }

    const triggerSync = async () => {
      try {
        const idToken = await user.getIdToken();
        console.log("[Sync Service] Triggering automated background sync...");
        const result = await performGlobalTradeSync(idToken, user.uid);
        
        if (result.success) {
          sessionStorage.setItem(SESSION_SYNC_KEY, 'true');
          console.log(`[Sync Service] Background sync complete. Captured ${result.tradeCount} trades.`);
        } else {
          console.error("[Sync Service] Background sync failed:", result.error);
        }
      } catch (err) {
        console.error("[Sync Service] Error in automated trigger:", err);
      }
    };

    // Trigger the sync as soon as auth is ready, prioritizing latest data.
    const timer = setTimeout(triggerSync, 100);
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
    try {
      await deleteDoc(doc(db, 'transactions', id));
      toast.success('Transaction deleted.');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Could not delete transaction.');
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await updateDoc(doc(db, 'transactions', id), updates);
      toast.success('Transaction updated.');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Could not update transaction.');
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

  const handleSystemReset = async () => {
    const currentUid = user?.uid || null;
    try {
      const collections = ['tasks', 'transactions', 'budgets', 'notes', 'exercises', 'trade_journals', 'crypto_holdings'];
      
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

  useEffect(() => {
    if (tasks.length === 0) return;

    const resetKey = `synapse_last_recurrence_reset_${user?.uid || 'guest'}`;

    const checkDailyReset = () => {
      const italyToday = getItalyDateKey(new Date());
      if (!italyToday) return;
      if (localStorage.getItem(resetKey) === italyToday) return;

      let dailyTasksToReset: string[] = [];
      let dailyTasksToMarkMissed: string[] = [];

      const todayObj = new Date();

      (tasks || []).forEach(t => {
        if (t.taskCategory !== 'daily') return;

        if (t.status === 'done') {
          if (!t.lastCompletedAt) return;

          const italyCompletedDate = getItalyDateKey(t.lastCompletedAt);
          if (!italyCompletedDate || italyCompletedDate === italyToday) return;

          let shouldReset = false;
          if (!t.recurrence || t.recurrence.type === 'daily') {
            shouldReset = true;
          } else if (t.recurrence.type === 'weekly' && t.recurrence.daysOfWeek) {
            shouldReset = t.recurrence.daysOfWeek.includes(todayObj.getDay());
          } else if (t.recurrence.type === 'monthly' && t.recurrence.dateOfMonth) {
            shouldReset = t.recurrence.dateOfMonth === todayObj.getDate();
          } else if (t.recurrence.type === 'interval' && t.recurrence.intervalDays) {
            const lastCompletedObj = new Date(t.lastCompletedAt);
            const diffTime = Math.abs(todayObj.getTime() - lastCompletedObj.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            shouldReset = diffDays >= t.recurrence.intervalDays;
          }

          if (shouldReset) {
            dailyTasksToReset.push(t.id);
          }
          return;
        }

        if (t.status === 'todo' && !t.isMissedDaily) {
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
  }, [tasks, user?.uid]);

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

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const updates: Partial<Task> = { status };

      if (status === 'done' && task?.status !== 'done') {
        updates.lastCompletedAt = new Date().toISOString();
        updates.isMissedDaily = false;
      }

      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast.success('Task status updated.');
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Could not update task status.');
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
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      toast.success('Task deleted.');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Could not delete task.');
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transaction,
        uid: user?.uid || null,
        createdAt: new Date().toISOString()
      });
      toast.success('Transaction saved.');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Could not save transaction.');
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            tasks={tasks} 
            transactions={transactions} 
            budgets={budgets}
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
      case 'tasks':
        return (
          <Tasks 
            tasks={tasks} 
            notes={notes}
            onUpdateStatus={updateTaskStatus} 
            onAddTask={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }} 
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={deleteTask}
            onAddNote={addNote}
            onDeleteNote={deleteNote}
          />
        );
      case 'expenses':
        return (
          <Expenses 
            transactions={transactions} 
            budgets={budgets}
            onAddExpense={() => {
              setEditingTransaction(null);
              setIsExpenseModalOpen(true);
            }} 
            onEditExpense={(t) => {
              setEditingTransaction(t);
              setIsExpenseModalOpen(true);
            }}
            onDeleteExpense={deleteTransaction}
            onUpsertBudget={upsertBudget}
            globalMonthlyBudget={monthlyBudget}
            onSetGlobalBudget={setGlobalBudget}
          />
        );
      case 'exercises':
        return <Exercises sessions={exerciseSessions} onLogSession={() => setIsExerciseModalOpen(true)} />;
      case 'trade-tracker':
        return <TradeTracker />;
      case 'api-check':
        return <TempApiKeyCheck />;
      case 'settings':
        return (
          <Settings 
            user={user}
            onLogin={handleLogin}
            onSystemReset={handleSystemReset}
            onOpenApiCheck={() => setActiveTab('api-check')}
          />
        );
      default:
        return (
          <Dashboard 
            tasks={tasks} 
            transactions={transactions}
            budgets={budgets}
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

  return (
    <div className="min-h-screen bg-bg text-ink/90 selection:bg-accent/30 selection:text-white">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="lg:ml-64 min-h-screen relative p-2 sm:p-4 md:p-6 lg:p-10 pt-[env(safe-area-inset-top)] pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10">
        
        
        <div>
          {isLoading ? (
            <TabSkeleton activeTab={activeTab} />
          ) : (
            <Suspense fallback={<TabSkeleton activeTab={activeTab} />}>
              {renderContent()}
            </Suspense>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
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
            onSave={editingTask ? (updates) => updateTask(editingTask.id, updates) : addTask}
            task={editingTask || undefined}
          />

          <LogExerciseModal 
            isOpen={isExerciseModalOpen}
            onClose={() => setIsExerciseModalOpen(false)}
            onAdd={addExerciseSession}
          />
        </div>
      </div>

      <Toaster position="bottom-left" theme="light" />
    </div>
  );
}

