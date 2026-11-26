export type FamilyRole = 'Admin' | 'Member';

export type AccountType =
  | 'Checking'
  | 'Savings'
  | 'Cash'
  | 'Credit Card'
  | 'Investment';

export type CategoryType = 'expense' | 'income';

export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'goal_contribution';

export type ViewScope = 'personal' | 'family';

export type NavTab =
  | 'dashboard'
  | 'accounts'
  | 'goals'
  | 'reports'
  | 'settings';

export type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'ytd'
  | 'custom';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_initials: string;
  created_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  group_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
  profile?: Profile;
}

export interface FamilyInvite {
  id: string;
  group_id: string;
  email: string;
  role: FamilyRole;
  sent_at: string;
  status: 'Pending' | 'Accepted';
}

export interface Account {
  id: string;
  owner_id: string;
  family_group_id: string | null;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  is_shared: boolean;
  icon_name: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  family_group_id: string | null;
  name: string;
  type: CategoryType;
  icon_name: string;
  color_hex: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  goal_id: string | null;
  created_by: string;
  type: TransactionType;
  amount: number;
  note: string;
  transaction_date: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  account_id: string;
  family_group_id: string | null;
  created_by: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon_name: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
}

export interface FinanceDemoState {
  currentUser: Profile;
  profiles: Profile[];
  familyGroups: FamilyGroup[];
  familyMembers: FamilyMember[];
  familyInvites: FamilyInvite[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
}
