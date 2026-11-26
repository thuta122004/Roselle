import type {
  Account,
  Category,
  DateRangePreset,
  Profile,
  SavingsGoal,
  Transaction,
  ViewScope,
} from '../types/finance';

export function getInitials(fullName: string): string {
  const cleaned = fullName.trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function formatCurrency(amount: number, currency = 'MMK'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const zeroDecimal = currency === 'MMK';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(safeAmount);
}

export function formatCompactCurrency(amount: number, currency = 'MMK'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const useCompact = Math.abs(safeAmount) >= 100000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: useCompact ? 'compact' : 'standard',
    maximumFractionDigits: useCompact ? 1 : 0,
  }).format(safeAmount);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function filterAccountsByScope(
  accounts: Account[],
  scope: ViewScope,
  currentUserId: string,
  memberGroupIds: string[],
): Account[] {
  if (scope === 'personal') {
    return accounts.filter((acc) => acc.owner_id === currentUserId);
  }
  const groupSet = new Set(memberGroupIds);
  return accounts.filter(
    (acc) =>
      acc.owner_id === currentUserId ||
      (acc.is_shared && acc.family_group_id !== null && groupSet.has(acc.family_group_id)),
  );
}

export function filterGoalsByScope(
  goals: SavingsGoal[],
  scope: ViewScope,
  currentUserId: string,
  memberGroupIds: string[],
  visibleAccountIds: Set<string>,
): SavingsGoal[] {
  if (scope === 'personal') {
    return goals.filter(
      (goal) => goal.created_by === currentUserId || visibleAccountIds.has(goal.account_id),
    );
  }
  const groupSet = new Set(memberGroupIds);
  return goals.filter(
    (goal) =>
      goal.created_by === currentUserId ||
      (goal.family_group_id !== null && groupSet.has(goal.family_group_id)) ||
      visibleAccountIds.has(goal.account_id),
  );
}

export function filterTransactionsByScope(
  transactions: Transaction[],
  visibleAccounts: Account[],
): Transaction[] {
  const visibleIds = new Set(visibleAccounts.map((a) => a.id));
  return transactions.filter(
    (tx) =>
      visibleIds.has(tx.account_id) ||
      (tx.to_account_id !== null && visibleIds.has(tx.to_account_id)),
  );
}

export interface KpiMetrics {
  totalNetBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  monthlyNetSavings: number;
}

export function calculateKpis(
  accounts: Account[],
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): KpiMetrics {
  const totalNetBalance = roundMoney(
    accounts.reduce((sum, acc) => sum + acc.balance, 0),
  );

  const targetYear = referenceDate.getFullYear();
  const targetMonth = referenceDate.getMonth();

  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  for (const tx of transactions) {
    const parsed = parseIsoDate(tx.transaction_date);
    if (!parsed) continue;
    if (parsed.getFullYear() === targetYear && parsed.getMonth() === targetMonth) {
      if (tx.type === 'income') {
        monthlyIncome += tx.amount;
      } else if (tx.type === 'expense') {
        monthlyExpenses += tx.amount;
      }
      // 'transfer' and 'goal_contribution' intentionally excluded so internal moves never double-count
    }
  }

  monthlyIncome = roundMoney(monthlyIncome);
  monthlyExpenses = roundMoney(monthlyExpenses);
  const monthlyNetSavings = roundMoney(monthlyIncome - monthlyExpenses);
  const savingsRate =
    monthlyIncome > 0
      ? Math.max(0, Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 1000) / 10)
      : 0;

  return {
    totalNetBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    monthlyNetSavings,
  };
}

export function parseIsoDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month, day);
}

export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateBoundsForPreset(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date(),
): { start: Date; end: Date } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (preset === 'this_month') {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }
  if (preset === 'last_month') {
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }
  if (preset === 'last_3_months') {
    return {
      start: new Date(year, month - 2, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }
  if (preset === 'ytd') {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  const parsedStart = customStart ? parseIsoDate(customStart) : null;
  const parsedEnd = customEnd ? parseIsoDate(customEnd) : null;
  const start = parsedStart ?? new Date(year, month, 1);
  const endBase = parsedEnd ?? referenceDate;
  const end = new Date(
    endBase.getFullYear(),
    endBase.getMonth(),
    endBase.getDate(),
    23,
    59,
    59,
    999,
  );
  return start <= end ? { start, end } : { start: end, end: start };
}

export function filterTransactionsByCriteria(
  transactions: Transaction[],
  options: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    accountId?: string;
    memberId?: string;
    search?: string;
    referenceDate?: Date;
  },
): Transaction[] {
  const { start, end } = getDateBoundsForPreset(
    options.preset,
    options.customStart,
    options.customEnd,
    options.referenceDate,
  );
  const query = options.search?.trim().toLowerCase() ?? '';

  return transactions.filter((tx) => {
    const dt = parseIsoDate(tx.transaction_date);
    if (!dt || dt < start || dt > end) return false;
    if (
      options.accountId &&
      options.accountId !== 'all' &&
      tx.account_id !== options.accountId &&
      tx.to_account_id !== options.accountId
    ) {
      return false;
    }
    if (options.memberId && options.memberId !== 'all' && tx.created_by !== options.memberId) {
      return false;
    }
    if (query && !tx.note.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}

export function applyTransactionToState(
  accounts: Account[],
  goals: SavingsGoal[],
  tx: Pick<Transaction, 'type' | 'amount' | 'account_id' | 'to_account_id' | 'goal_id'>,
  direction: 'apply' | 'revert' = 'apply',
): { accounts: Account[]; savingsGoals: SavingsGoal[] } {
  const factor = direction === 'apply' ? 1 : -1;

  const updatedAccounts = accounts.map((acc) => {
    let delta = 0;
    if (tx.type === 'expense') {
      if (acc.id === tx.account_id) delta -= tx.amount * factor;
    } else if (tx.type === 'income') {
      if (acc.id === tx.account_id) delta += tx.amount * factor;
    } else if (tx.type === 'transfer') {
      if (acc.id === tx.account_id) delta -= tx.amount * factor;
      if (tx.to_account_id && acc.id === tx.to_account_id) delta += tx.amount * factor;
    } else if (tx.type === 'goal_contribution') {
      const linkedGoal = goals.find((g) => g.id === tx.goal_id);
      if (acc.id === tx.account_id) {
        if (!linkedGoal || linkedGoal.account_id !== tx.account_id) {
          delta -= tx.amount * factor;
        }
      }
      if (linkedGoal && acc.id === linkedGoal.account_id && linkedGoal.account_id !== tx.account_id) {
        delta += tx.amount * factor;
      }
    }

    if (delta === 0) return acc;
    return {
      ...acc,
      balance: roundMoney(acc.balance + delta),
    };
  });

  const updatedGoals = goals.map((goal) => {
    if (tx.type !== 'goal_contribution' || tx.goal_id !== goal.id) return goal;
    return {
      ...goal,
      current_amount: Math.max(0, roundMoney(goal.current_amount + tx.amount * factor)),
    };
  });

  return {
    accounts: updatedAccounts,
    savingsGoals: updatedGoals,
  };
}

export interface MonthlyTrendPoint {
  monthKey: string;
  monthLabel: string;
  income: number;
  expenses: number;
  netSavings: number;
}

export function buildMonthlyTrendData(
  transactions: Transaction[],
  monthsCount = 6,
  referenceDate: Date = new Date(),
): MonthlyTrendPoint[] {
  const buckets = new Map<string, MonthlyTrendPoint>();
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, {
      monthKey: key,
      monthLabel: formatter.format(d),
      income: 0,
      expenses: 0,
      netSavings: 0,
    });
  }

  for (const tx of transactions) {
    const dt = parseIsoDate(tx.transaction_date);
    if (!dt) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (tx.type === 'income') {
      bucket.income = roundMoney(bucket.income + tx.amount);
    } else if (tx.type === 'expense') {
      bucket.expenses = roundMoney(bucket.expenses + tx.amount);
    }
  }

  return Array.from(buckets.values()).map((b) => ({
    ...b,
    netSavings: roundMoney(b.income - b.expenses),
  }));
}

export interface CategoryBreakdownPoint {
  categoryId: string;
  name: string;
  color: string;
  iconName: string;
  amount: number;
  percentage: number;
}

export function buildCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
): CategoryBreakdownPoint[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const catId = tx.category_id ?? 'uncategorized';
    totals.set(catId, roundMoney((totals.get(catId) ?? 0) + tx.amount));
    totalExpense = roundMoney(totalExpense + tx.amount);
  }

  const rows: CategoryBreakdownPoint[] = [];
  for (const [catId, amount] of totals.entries()) {
    const cat = catMap.get(catId);
    rows.push({
      categoryId: catId,
      name: cat?.name ?? 'General',
      color: cat?.color_hex ?? '#E87A90',
      iconName: cat?.icon_name ?? 'Tag',
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 1000) / 10 : 0,
    });
  }

  return rows.sort((a, b) => b.amount - a.amount);
}

export interface MemberSpendingPoint {
  memberId: string;
  name: string;
  initials: string;
  expenses: number;
  income: number;
}

export function buildMemberSpendingData(
  transactions: Transaction[],
  profiles: Profile[],
): MemberSpendingPoint[] {
  const map = new Map<string, MemberSpendingPoint>();

  for (const profile of profiles) {
    map.set(profile.id, {
      memberId: profile.id,
      name: profile.full_name.split(' ')[0] || profile.full_name,
      initials: profile.avatar_initials,
      expenses: 0,
      income: 0,
    });
  }

  for (const tx of transactions) {
    if (tx.type !== 'expense' && tx.type !== 'income') continue;
    let entry = map.get(tx.created_by);
    if (!entry) {
      entry = {
        memberId: tx.created_by,
        name: 'Member',
        initials: 'M',
        expenses: 0,
        income: 0,
      };
      map.set(tx.created_by, entry);
    }
    if (tx.type === 'expense') {
      entry.expenses = roundMoney(entry.expenses + tx.amount);
    } else if (tx.type === 'income') {
      entry.income = roundMoney(entry.income + tx.amount);
    }
  }

  return Array.from(map.values()).filter((m) => m.expenses > 0 || m.income > 0);
}

export interface DailyCashflowPoint {
  isoDate: string;
  dateLabel: string;
  netCashflow: number;
  cumulativeSavings: number;
}

export function buildDailyCashflowData(transactions: Transaction[]): DailyCashflowPoint[] {
  const dailyMap = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== 'income' && tx.type !== 'expense') continue;
    const key = tx.transaction_date.split('T')[0];
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    dailyMap.set(key, roundMoney((dailyMap.get(key) ?? 0) + delta));
  }

  const sortedDates = Array.from(dailyMap.keys()).sort();
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  let running = 0;

  return sortedDates.map((iso) => {
    const net = dailyMap.get(iso) ?? 0;
    running = roundMoney(running + net);
    const dt = parseIsoDate(iso);
    return {
      isoDate: iso,
      dateLabel: dt ? fmt.format(dt) : iso,
      netCashflow: net,
      cumulativeSavings: running,
    };
  });
}

function escapeCsvCell(raw: string): string {
  const str = String(raw ?? '');
  const formulaSafe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function generateTransactionsCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  profiles: Profile[],
): string {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const profMap = new Map(profiles.map((p) => [p.id, p.full_name]));

  const totalIncome = roundMoney(
    transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
  );
  const totalExpenses = roundMoney(
    transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  );
  const netSavings = roundMoney(totalIncome - totalExpenses);

  const lines: string[] = [
    'Summary Metric,Value',
    `Total Income,${totalIncome.toFixed(2)}`,
    `Total Expenses,${totalExpenses.toFixed(2)}`,
    `Net Savings,${netSavings.toFixed(2)}`,
    '',
    'Date,Type,Account,Destination Account,Category,Logged By,Amount,Note',
  ];

  const sorted = [...transactions].sort((a, b) =>
    b.transaction_date.localeCompare(a.transaction_date),
  );

  for (const tx of sorted) {
    lines.push(
      [
        escapeCsvCell(tx.transaction_date),
        escapeCsvCell(tx.type),
        escapeCsvCell(accMap.get(tx.account_id) ?? 'Account'),
        escapeCsvCell(tx.to_account_id ? accMap.get(tx.to_account_id) ?? '' : ''),
        escapeCsvCell(tx.category_id ? catMap.get(tx.category_id) ?? 'General' : 'Transfer / Goal'),
        escapeCsvCell(profMap.get(tx.created_by) ?? 'Member'),
        tx.amount.toFixed(2),
        escapeCsvCell(tx.note),
      ].join(','),
    );
  }

  return lines.join('\n');
}
