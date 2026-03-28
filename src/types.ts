export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'todo' | 'in-progress' | 'review' | 'done';
  linkedExpenseId?: string;
  subtasks?: SubTask[];
  dueDate?: string;
  totalTimeSpent?: number; // in seconds
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

