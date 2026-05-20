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
  isMissedDaily?: boolean;
  uid?: string | null;
  createdAt?: string;
  dueDate?: string;
  position?: number;
  subtasks?: Subtask[];
  recurrence?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'interval';
    daysOfWeek?: number[]; // [0-6] where 0 is Sunday
    dateOfMonth?: number; // 1-31
    intervalDays?: number; // e.g., every 3 days
  } | null;
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
  createdAt?: string;
  uid?: string | null;
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
  uid?: string | null;
  monthlyBudget: number;
  deepWork: boolean;
  notifications: boolean;
  merchantCategoryMap: Record<string, string>;
  updatedAt?: string;
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

export interface Loan {
  id: string;
  uid: string;
  personName: string;
  amount: number;
  type: 'borrowed' | 'lent'; // 'lent' = gave to people, 'borrowed' = I owe people
  status: 'pending' | 'settled';
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

