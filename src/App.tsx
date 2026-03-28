/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
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
import FloatingTimer from './components/FloatingTimer';
import { Task, Transaction, Budget, CryptoHolding, CryptoTrade } from './types';
import { Toaster, toast } from 'sonner';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // Global Timer State
  const [activeTimerTask, setActiveTimerTask] = useState<Task | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const startTimer = (task: Task) => {
    if (activeTimerTask?.id === task.id) {
      if (isTimerActive) {
        // Pausing: save the accumulated time
        updateTask(task.id, { 
          totalTimeSpent: (task.totalTimeSpent || 0) + timerSeconds 
        });
        setTimerSeconds(0);
      }
      setIsTimerActive(!isTimerActive);
    } else {
      // If there was an active task, save its time before switching
      if (activeTimerTask && isTimerActive) {
        updateTask(activeTimerTask.id, { 
          totalTimeSpent: (activeTimerTask.totalTimeSpent || 0) + timerSeconds 
        });
      }
      setActiveTimerTask(task);
      setTimerSeconds(0);
      setIsTimerActive(true);
    }
  };

  const resetTimer = () => {
    if (activeTimerTask) {
      updateTask(activeTimerTask.id, { totalTimeSpent: 0 });
    }
    setIsTimerActive(false);
    setTimerSeconds(0);
    setActiveTimerTask(null);
  };

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
  const [cryptoHoldings, setCryptoHoldings] = useState<CryptoHolding[]>([]);
  const [cryptoTrades, setCryptoTrades] = useState<CryptoTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Data from Firestore
  useEffect(() => {
    if (!user) {
      if (isAuthReady) setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Tasks Listener
    const tasksQuery = query(collection(db, 'tasks'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData: Task[] = [];
      snapshot.forEach((doc) => tasksData.push({ ...doc.data(), id: doc.id } as Task));
      setTasks(tasksData);
    });

    // Transactions Listener
    const transQuery = query(collection(db, 'transactions'));
    const unsubscribeTrans = onSnapshot(transQuery, (snapshot) => {
      const transData: Transaction[] = [];
      snapshot.forEach((doc) => transData.push({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(transData);
    });

    // Budgets Listener
    const budgetsQuery = query(collection(db, 'budgets'));
    const unsubscribeBudgets = onSnapshot(budgetsQuery, (snapshot) => {
      const budgetsData: Budget[] = [];
      snapshot.forEach((doc) => budgetsData.push({ ...doc.data(), id: doc.id } as Budget));
      setBudgets(budgetsData);
    });

    // Exercises Listener
    const exercisesQuery = query(collection(db, 'exercises'));
    const unsubscribeExercises = onSnapshot(exercisesQuery, (snapshot) => {
      const exercisesData: any[] = [];
      snapshot.forEach((doc) => exercisesData.push({ ...doc.data(), id: doc.id }));
      setExerciseSessions(exercisesData);
    });

    // Crypto Holdings Listener
    const holdingsQuery = query(collection(db, 'crypto_holdings'));
    const unsubscribeHoldings = onSnapshot(holdingsQuery, (snapshot) => {
      const holdingsData: CryptoHolding[] = [];
      snapshot.forEach((doc) => holdingsData.push({ ...doc.data(), id: doc.id } as CryptoHolding));
      setCryptoHoldings(holdingsData);
    });

    // Crypto Trades Listener
    const tradesQuery = query(collection(db, 'crypto_trades'));
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const tradesData: CryptoTrade[] = [];
      snapshot.forEach((doc) => tradesData.push({ ...doc.data(), id: doc.id } as CryptoTrade));
      setCryptoTrades(tradesData);
    });

    setIsLoading(false);

    return () => {
      unsubscribeTasks();
      unsubscribeTrans();
      unsubscribeBudgets();
      unsubscribeExercises();
      unsubscribeHoldings();
      unsubscribeTrades();
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
      const budgetId = budgets.find(b => b.category === category)?.id || `budget_${category}`;
      await setDoc(doc(db, 'budgets', budgetId), {
        category,
        monthly_limit: monthlyLimit,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Budget updated');
    } catch (error) {
      console.error('Error upserting budget:', error);
      toast.error('Failed to update budget');
    }
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    try {
      await addDoc(collection(db, 'tasks'), {
        ...task,
        createdAt: new Date().toISOString()
      });
      toast.success('Pursuit created successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to create pursuit');
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status });
      toast.success(`Pursuit moved to ${status}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast.success('Pursuit updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update pursuit');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      toast.success('Pursuit removed');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to remove pursuit');
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transaction,
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
      const holdingId = cryptoHoldings.find(h => h.asset === holding.asset)?.id || `holding_${holding.asset}`;
      await setDoc(doc(db, 'crypto_holdings', holdingId), {
        ...holding,
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
            onViewTasks={() => setActiveTab('tasks')}
            onViewExpenses={() => setActiveTab('expenses')}
            onAddClick={handleAddClick}
          />
        );
      case 'tasks':
        return (
          <Tasks 
            tasks={tasks} 
            transactions={transactions}
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
            activeTimerTaskId={activeTimerTask?.id}
            isTimerActive={isTimerActive}
            timerSeconds={timerSeconds}
            onToggleTimer={startTimer}
            onResetTimer={resetTimer}
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
            onViewTasks={() => setActiveTab('tasks')}
            onViewExpenses={() => setActiveTab('expenses')}
            onAddClick={handleAddClick}
          />
        );
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Sanctuary Overview';
      case 'tasks': return 'Focus Protocol';
      case 'expenses': return 'Financial Flow';
      case 'exercises': return 'Physical Sanctuary';
      case 'trade-tracker': return 'Trade Analysis';
      case 'settings': return 'System Preferences';
      default: return 'TaskFlow';
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
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully');
    } catch (error) {
      console.error('Error signing in:', error);
      toast.error('Failed to sign in');
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
    <div className="min-h-screen bg-surface">
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
      
      <main className="lg:ml-64 min-h-screen relative">
        <TopBar 
          title={getTitle()} 
          onAddClick={handleAddClick} 
          onMenuClick={() => setIsSidebarOpen(true)}
          dbStatus={!!user}
        />
        
        <div className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : renderContent()}
        </div>
      </main>

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
            transactions={transactions}
          />

          <LogExerciseModal 
            isOpen={isExerciseModalOpen}
            onClose={() => setIsExerciseModalOpen(false)}
            onAdd={addExerciseSession}
          />
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
      
      <FloatingTimer 
        activeTask={activeTimerTask}
        seconds={timerSeconds}
        isActive={isTimerActive}
        onToggle={() => setIsTimerActive(!isTimerActive)}
        onReset={resetTimer}
        onClose={() => setActiveTimerTask(null)}
      />
      <Toaster position="bottom-left" theme="dark" />
    </div>
  );
}

