/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Expenses from './components/Expenses';
import Exercises from './components/Exercises';
import TradeTracker from './components/TradeTracker';
import Settings from './components/Settings';
import LogExpenseModal from './components/LogExpenseModal';
import TaskModal from './components/TaskModal';
import LogExerciseModal from './components/LogExerciseModal';
import Toast, { ToastMessage } from './components/Toast';
import { Task, Transaction, Budget, CryptoHolding, CryptoTrade, Note, UserStats } from './types';
import { Toaster, toast } from 'sonner';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc, where } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'dashboard';
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);

  // Toasts state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<string[]>(['Technology', 'Dining', 'Lifestyle', 'Housing', 'Travel', 'Income', 'Health', 'Education']);
  const [merchantToCategory, setMerchantToCategory] = useState<Record<string, string>>({});
  const [exerciseSessions, setExerciseSessions] = useState<any[]>([]);
  const [cryptoTrades, setCryptoTrades] = useState<CryptoTrade[]>([]);
  const [cryptoHoldings, setCryptoHoldings] = useState<CryptoHolding[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
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
    // We always want to fetch data. If guest, we fetch where uid == null.
    setIsLoading(true);
    const currentUid = user?.uid || null;

    // Tasks Listener
    const tasksQuery = query(collection(db, 'tasks'), where('uid', '==', currentUid));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      console.log(`[Firebase Sync] Received ${snapshot.docs.length} tasks for user ${user?.uid || 'Guest'}`);
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

    // Crypto Holdings Listener
    const holdingsQuery = query(collection(db, 'crypto_holdings'), where('uid', '==', currentUid));
    const unsubscribeHoldings = onSnapshot(holdingsQuery, (snapshot) => {
      const holdingsData: CryptoHolding[] = [];
      snapshot.forEach((doc) => holdingsData.push({ ...doc.data(), id: doc.id } as CryptoHolding));
      setCryptoHoldings(holdingsData);
    }, (error) => console.error("Holdings listener error:", error));

    // Crypto Trades Listener
    const tradesQuery = query(collection(db, 'crypto_trades'), where('uid', '==', currentUid));
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const tradesData: CryptoTrade[] = [];
      snapshot.forEach((doc) => tradesData.push({ ...doc.data(), id: doc.id } as CryptoTrade));
      setCryptoTrades(tradesData);
    }, (error) => console.error("Trades listener error:", error));

    // Notes Listener
    const notesQuery = query(collection(db, 'notes'), where('uid', '==', currentUid));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => notesData.push({ ...doc.data(), id: doc.id } as Note));
      setNotes(notesData);
    }, (error) => console.error("Notes listener error:", error));

    // User Stats Listener
    const userStatsQuery = query(collection(db, 'user_stats'), where('uid', '==', currentUid));
    const unsubscribeUserStats = onSnapshot(userStatsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setUserStats({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as UserStats);
      } else if (currentUid) {
        // Initialize user stats if they don't exist
        const defaultStats: Omit<UserStats, 'id'> = {
          uid: currentUid,
          level: 1,
          exp: 0,
          currentStreak: 0,
          lastActiveDate: new Date().toISOString().split('T')[0]
        };
        addDoc(collection(db, 'user_stats'), defaultStats).catch(err => console.error(err));
      }
    }, (error) => console.error("User stats listener error:", error));

    setIsLoading(false);

    return () => {
      unsubscribeTasks();
      unsubscribeTrans();
      unsubscribeBudgets();
      unsubscribeExercises();
      unsubscribeHoldings();
      unsubscribeTrades();
      unsubscribeNotes();
      unsubscribeUserStats();
    };
  }, [user, isAuthReady]);

  const deleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      toast.success('Transaction removed');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await updateDoc(doc(db, 'transactions', id), updates);
      toast.success('Transaction updated');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const upsertBudget = async (category: string, monthlyLimit: number) => {
    try {
      const budgetId = budgets.find(b => b.category === category)?.id || `budget_${category}_${user?.uid}`;
      await setDoc(doc(db, 'budgets', budgetId), {
        category,
        monthly_limit: monthlyLimit,
        uid: user?.uid || null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Budget updated');
    } catch (error) {
      console.error('Error upserting budget:', error);
      toast.error('Failed to update budget');
    }
  };

  // Gamification & Daily Routines
  const awardEXP = async (amount: number) => {
    if (!userStats || !user?.uid) return;
    
    let newExp = userStats.exp + amount;
    let newLevel = userStats.level;
    const expNeeded = newLevel * 100;

    // Safety Floor: Ensure XP never drops below zero unless leveling down
    if (newExp < 0) {
      if (newLevel > 1) {
        newLevel -= 1;
        newExp = (newLevel * 100) + newExp;
      } else {
        newExp = 0;
      }
    }

    let leveledUp = false;
    if (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel += 1;
      leveledUp = true;
    }

    try {
      await updateDoc(doc(db, 'user_stats', userStats.id), {
        exp: newExp,
        level: newLevel,
      });

      if (leveledUp) {
        toast.success(`SYSTEM OVERRIDE: Operator Tier reached Level ${newLevel}!`, {
          style: { background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none' }
        });
      }
    } catch (e) {
      console.error('Error awarding EXP:', e);
    }
  };

  useEffect(() => {
    if (!userStats || !user?.uid || tasks.length === 0) return;

    const checkDailyReset = () => {
      const today = new Date().toISOString().split('T')[0];
      if (userStats.lastActiveDate !== today) {
        const lastActive = new Date(userStats.lastActiveDate);
        const current = new Date(today);
        const diffTime = Math.abs(current.getTime() - lastActive.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let newStreak = userStats.currentStreak;
        if (diffDays === 1) {
          newStreak += 1;
          toast.success(`Daily Login: Streak increased to ${newStreak} days!`);
        } else if (diffDays > 1) {
          newStreak = 0;
          toast.error('Streak broken. Operator system reset.', {
            style: { background: 'var(--color-alert)', color: 'var(--color-bg)', border: 'none' }
          });
        }

        // Reset daily tasks and apply XP penalty for stacked queue
        let xpPenalty = 0;
        let tasksToStack: string[] = [];
        let dailyTasksToReset: string[] = [];

        const todayObj = new Date();

        tasks.forEach(t => {
          if (t.status === 'todo' && t.taskCategory !== 'long-term') {
            if (!t.isStacked) {
              xpPenalty += 10;
              tasksToStack.push(t.id);
            }
          }
          
          if (t.taskCategory === 'daily' && t.status === 'done') {
            if (t.lastCompletedAt && t.lastCompletedAt.split('T')[0] !== today) {
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
            }
          }
        });

        let updatedExp = userStats.exp;
        let updatedLevel = userStats.level;
        if (xpPenalty > 0) {
          updatedExp -= xpPenalty;
          while (updatedExp < 0 && updatedLevel > 1) {
            updatedLevel -= 1;
            updatedExp += (updatedLevel * 100);
          }
          if (updatedExp < 0) updatedExp = 0;
        }

        updateDoc(doc(db, 'user_stats', userStats.id), {
          lastActiveDate: today,
          currentStreak: newStreak,
          exp: updatedExp,
          level: updatedLevel
        }).catch(console.error);

        dailyTasksToReset.forEach(id => {
           updateDoc(doc(db, 'tasks', id), { status: 'todo', isStacked: false }).catch(console.error);
        });
        tasksToStack.forEach(id => {
           updateDoc(doc(db, 'tasks', id), { isStacked: true }).catch(console.error);
        });
      }
    };

    // Trigger on mount/change
    checkDailyReset();

    // Heartbeat: Check for midnight transition every 60 seconds
    const interval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(interval);
  }, [userStats?.lastActiveDate, tasks.length]);

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

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      await updateDoc(doc(db, 'notes', id), { ...updates, updatedAt: new Date().toISOString() });
    } catch (e) { console.error('Error updating note:', e); }
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
      toast.success('Task created successfully');
    } catch (error: any) {
      console.error('[Firebase Write] Error adding task:', error);
      if (error.code === 'permission-denied') {
        toast.error('Access Denied: You must be signed in to save tasks to the cloud.');
      } else {
        toast.error('Failed to create task: ' + error.message);
      }
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const updates: Partial<Task> = { status };

      if (status === 'done' && task?.status !== 'done') {
        updates.lastCompletedAt = new Date().toISOString();
        let xpReward = 10;
        if (task.taskCategory === 'daily') xpReward = 15;
        if (task.taskCategory === 'long-term') xpReward = 50;
        
        // Catch-up bonus for stacked tasks
        if (task.isStacked) {
          xpReward += 5;
          updates.isStacked = false;
        }

        await awardEXP(xpReward);
      }

      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast.success(`Task status updated`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (updates.status === 'done' && task?.status !== 'done') {
        updates.lastCompletedAt = new Date().toISOString();
        let xpReward = 10;
        if (task?.taskCategory === 'daily') xpReward = 15;
        if (task?.taskCategory === 'long-term') xpReward = 50;
        await awardEXP(xpReward);
      }

      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast.success('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      toast.success('Task removed');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to remove task');
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transaction,
        uid: user?.uid || null,
        createdAt: new Date().toISOString()
      });
      toast.success('Transaction logged');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to log transaction');
    }
  };

  const addExerciseSession = async (session: any) => {
    try {
      await addDoc(collection(db, 'exercises'), {
        ...session,
        uid: user?.uid || null,
        createdAt: new Date().toISOString()
      });
      toast.success('Exercise session logged');
    } catch (error) {
      console.error('Error adding exercise session:', error);
      toast.error('Failed to log exercise');
    }
  };

  const addCryptoHolding = async (holding: Omit<CryptoHolding, 'id' | 'last_updated'>) => {
    try {
      const holdingId = cryptoHoldings.find(h => h.asset === holding.asset)?.id || `holding_${holding.asset}_${user?.uid}`;
      await setDoc(doc(db, 'crypto_holdings', holdingId), {
        ...holding,
        uid: user?.uid || null,
        last_updated: new Date().toISOString()
      }, { merge: true });
      toast.success('Holding updated');
    } catch (error) {
      console.error('Error adding crypto holding:', error);
      toast.error('Failed to update holding');
    }
  };

  const addCryptoTrade = async (trade: Omit<CryptoTrade, 'id'>) => {
    try {
      await addDoc(collection(db, 'crypto_trades'), {
        ...trade,
        uid: user?.uid || null,
        createdAt: new Date().toISOString()
      });
      toast.success('Trade logged');
    } catch (error) {
      console.error('Error adding crypto trade:', error);
      toast.error('Failed to log trade');
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
            userStats={userStats}
            onViewTasks={() => setActiveTab('tasks')}
            onViewExpenses={() => setActiveTab('expenses')}
            onAddClick={handleAddClick}
            userName={user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || undefined}
            onUpdateTaskStatus={updateTaskStatus}
          />
        );
      case 'tasks':
        return (
          <Tasks 
            tasks={tasks} 
            notes={notes}
            userStats={userStats}
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
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onUpdateTask={updateTask}
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
          />
        );
      case 'exercises':
        return <Exercises sessions={exerciseSessions} onLogSession={() => setIsExerciseModalOpen(true)} />;
      case 'trade-tracker':
        return <TradeTracker />;
      case 'settings':
        return (
          <Settings 
            user={user}
            onLogin={handleLogin}
          />
        );
      default:
        return (
          <Dashboard 
            tasks={tasks} 
            transactions={transactions}
            budgets={budgets}
            userStats={userStats}
            onViewTasks={() => setActiveTab('tasks')}
            onViewExpenses={() => setActiveTab('expenses')}
            onAddClick={handleAddClick}
            userName={user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || undefined}
            onUpdateTaskStatus={updateTaskStatus}
          />
        );
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'System Overview';
      case 'tasks': return 'Mission Control';
      case 'expenses': return 'Financial Ledger';
      case 'exercises': return 'Physical Audit';
      case 'trade-tracker': return 'Market Intelligence';
      case 'settings': return 'System Preferences';
      default: return 'TaskOS';
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
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      // Add custom parameters to handle common issues
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully');
    } catch (error: any) {
      console.error('Error signing in:', error);
      
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Localhost not authorized. Please add "localhost" to your Firebase Console Authorized Domains.', {
          duration: 10000,
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else {
        toast.error('Failed to sign in: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink/90 selection:bg-accent/30 selection:text-white">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="lg:ml-64 min-h-screen relative p-4 lg:p-10">
        
        
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center h-[70vh]">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-2 border-accent/20 rounded-2xl" />
                <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-2xl animate-spin shadow-[0_0_20px_rgba(99,102,241,0.2)]" />
              </div>
            </div>
          ) : renderContent()}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
        onMenuClick={() => setIsSidebarOpen(true)}
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

      <Toast toasts={toasts} onRemove={removeToast} />
      <Toaster position="bottom-left" theme="dark" />
    </div>
  );
}

