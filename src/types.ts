export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'todo' | 'done';
  taskCategory?: 'daily' | 'long-term';
  lastCompletedAt?: string; // ISO string used for daily resets
  uid?: string | null;
  createdAt?: string;
  dueDate?: string;
  isStacked?: boolean;
  position?: number;
  subtasks?: Subtask[];
  recurrence?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'interval';
    daysOfWeek?: number[]; // [0-6] where 0 is Sunday
    dateOfMonth?: number; // 1-31
    intervalDays?: number; // e.g., every 3 days
  } | null;
}

export interface UserStats {
  id: string; // usually maps to uid
  uid: string;
  level: number;
  exp: number;
  currentStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export interface Note {
  id: string;
  uid: string;
  content: string;
  color?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  category: string;
  merchant: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'Completed' | 'Pending' | 'Flagged';
  description?: string;
}

export interface Exercise {
  id: string;
  title: string;
  category: string;
  date: string;
  description?: string;
  duration: string;
  intensity: string;
  icon: string;
  img?: string;
}

export interface ExerciseStat {
  label: string;
  value: string;
  trend: string;
  trendIcon: any;
  color: string;
}

export interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  updated_at?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
  biometric: boolean;
}

export interface CryptoHolding {
  id: string;
  asset: string;
  amount: number;
  avg_buy_price: number;
  last_updated: string;
}

export interface CryptoTrade {
  id: string;
  date: string;
  asset: string;
  type: 'Buy' | 'Sell';
  amount: number;
  price: number;
  profit_loss?: number;
  notes_right?: string;
  notes_wrong?: string;
  created_at?: string;
}

