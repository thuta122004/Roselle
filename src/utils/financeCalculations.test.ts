import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTransactionToState,
  buildCategoryBreakdown,
  buildMemberSpendingData,
  calculateKpis,
  filterAccountsByScope,
  filterTransactionsByCriteria,
  formatCompactCurrency,
  formatCurrency,
  generateTransactionsCsv,
  getInitials,
} from './financeCalculations';
import type { Account, Category, Profile, SavingsGoal, Transaction } from '../types/finance';

const sampleAccounts: Account[] = [
  {
    id: 'acc-1',
    owner_id: 'user-1',
    family_group_id: 'fam-1',
    name: 'Main Checking',
    type: 'Checking',
    balance: 3000,
    currency: 'MMK',
    is_shared: true,
    icon_name: 'Landmark',
    created_at: '2026-01-01',
  },
  {
    id: 'acc-2',
    owner_id: 'user-1',
    family_group_id: null,
    name: 'Clara Private',
    type: 'Savings',
    balance: 1500,
    currency: 'MMK',
    is_shared: false,
    icon_name: 'PiggyBank',
    created_at: '2026-01-01',
  },
  {
    id: 'acc-3',
    owner_id: 'user-2',
    family_group_id: 'fam-1',
    name: 'Partner Shared Travel',
    type: 'Savings',
    balance: 2000,
    currency: 'MMK',
    is_shared: true,
    icon_name: 'Plane',
    created_at: '2026-01-01',
  },
  {
    id: 'acc-4',
    owner_id: 'user-2',
    family_group_id: null,
    name: 'Partner Private',
    type: 'Cash',
    balance: 500,
    currency: 'MMK',
    is_shared: false,
    icon_name: 'Wallet',
    created_at: '2026-01-01',
  },
];

const sampleGoals: SavingsGoal[] = [
  {
    id: 'goal-1',
    account_id: 'acc-3',
    family_group_id: 'fam-1',
    created_by: 'user-1',
    name: 'Kyoto Trip',
    target_amount: 5000,
    current_amount: 2000,
    deadline: '2027-04-01',
    icon_name: 'Plane',
  },
];

const sampleCategories: Category[] = [
  {
    id: 'cat-food',
    user_id: 'user-1',
    family_group_id: 'fam-1',
    name: 'Dining & Groceries',
    type: 'expense',
    icon_name: 'Utensils',
    color_hex: '#E87A90',
  },
  {
    id: 'cat-home',
    user_id: 'user-1',
    family_group_id: 'fam-1',
    name: 'Housing',
    type: 'expense',
    icon_name: 'Home',
    color_hex: '#D98A3C',
  },
];

const sampleProfiles: Profile[] = [
  {
    id: 'user-1',
    email: 'clara@vancehome.org',
    full_name: 'Clara Vance',
    avatar_initials: 'CV',
    created_at: '2026-01-01',
  },
  {
    id: 'user-2',
    email: 'julian@vancehome.org',
    full_name: 'Julian Vance',
    avatar_initials: 'JV',
    created_at: '2026-01-01',
  },
];

test('getInitials extracts clean two-letter initials', () => {
  assert.equal(getInitials('Clara Vance'), 'CV');
  assert.equal(getInitials('Julian'), 'JU');
  assert.equal(getInitials('   '), 'U');
});

test('formatCurrency formats MMK cleanly with zero decimals', () => {
  assert.equal(formatCurrency(4850000), 'MMK\u00a04,850,000');
  assert.equal(formatCompactCurrency(4850000), 'MMK\u00a04.9M');
});

test('filterAccountsByScope respects personal vs family visibility', () => {
  const personal = filterAccountsByScope(sampleAccounts, 'personal', 'user-1', ['fam-1']);
  assert.deepEqual(
    personal.map((a) => a.id),
    ['acc-1', 'acc-2'],
  );

  const family = filterAccountsByScope(sampleAccounts, 'family', 'user-1', ['fam-1']);
  assert.deepEqual(
    family.map((a) => a.id),
    ['acc-1', 'acc-2', 'acc-3'],
  );
});

test('calculateKpis excludes internal transfers and goal contributions from income/expense', () => {
  const refDate = new Date(2026, 10, 20);
  const txs: Transaction[] = [
    {
      id: 't1',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: null,
      goal_id: null,
      created_by: 'user-1',
      type: 'income',
      amount: 5000,
      note: 'Salary',
      transaction_date: '2026-11-05',
      created_at: '2026-11-05',
    },
    {
      id: 't2',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: 'cat-food',
      goal_id: null,
      created_by: 'user-1',
      type: 'expense',
      amount: 1000,
      note: 'Groceries',
      transaction_date: '2026-11-10',
      created_at: '2026-11-10',
    },
    {
      id: 't3',
      account_id: 'acc-1',
      to_account_id: 'acc-2',
      category_id: null,
      goal_id: null,
      created_by: 'user-1',
      type: 'transfer',
      amount: 800,
      note: 'Move to savings',
      transaction_date: '2026-11-12',
      created_at: '2026-11-12',
    },
    {
      id: 't4',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: null,
      goal_id: 'goal-1',
      created_by: 'user-1',
      type: 'goal_contribution',
      amount: 500,
      note: 'Kyoto top up',
      transaction_date: '2026-11-15',
      created_at: '2026-11-15',
    },
  ];

  const kpis = calculateKpis(sampleAccounts.slice(0, 3), txs, refDate);
  assert.equal(kpis.totalNetBalance, 6500);
  assert.equal(kpis.monthlyIncome, 5000);
  assert.equal(kpis.monthlyExpenses, 1000);
  assert.equal(kpis.monthlyNetSavings, 4000);
  assert.equal(kpis.savingsRate, 80);
});

test('applyTransactionToState updates balances and goal amounts cleanly on transfer and top-up', () => {
  const afterTransfer = applyTransactionToState(
    sampleAccounts,
    sampleGoals,
    {
      type: 'transfer',
      amount: 250,
      account_id: 'acc-1',
      to_account_id: 'acc-2',
      goal_id: null,
    },
    'apply',
  );
  assert.equal(afterTransfer.accounts.find((a) => a.id === 'acc-1')?.balance, 2750);
  assert.equal(afterTransfer.accounts.find((a) => a.id === 'acc-2')?.balance, 1750);

  const afterGoal = applyTransactionToState(
    afterTransfer.accounts,
    afterTransfer.savingsGoals,
    {
      type: 'goal_contribution',
      amount: 300,
      account_id: 'acc-1',
      to_account_id: null,
      goal_id: 'goal-1',
    },
    'apply',
  );
  assert.equal(afterGoal.accounts.find((a) => a.id === 'acc-1')?.balance, 2450);
  assert.equal(afterGoal.accounts.find((a) => a.id === 'acc-3')?.balance, 2300);
  assert.equal(afterGoal.savingsGoals[0].current_amount, 2300);

  const reverted = applyTransactionToState(
    afterGoal.accounts,
    afterGoal.savingsGoals,
    {
      type: 'goal_contribution',
      amount: 300,
      account_id: 'acc-1',
      to_account_id: null,
      goal_id: 'goal-1',
    },
    'revert',
  );
  assert.equal(reverted.accounts.find((a) => a.id === 'acc-1')?.balance, 2750);
  assert.equal(reverted.savingsGoals[0].current_amount, 2000);
});

test('buildCategoryBreakdown and buildMemberSpendingData compute accurate totals', () => {
  const txs: Transaction[] = [
    {
      id: 't1',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: 'cat-food',
      goal_id: null,
      created_by: 'user-1',
      type: 'expense',
      amount: 300,
      note: 'Dinner',
      transaction_date: '2026-11-05',
      created_at: '2026-11-05',
    },
    {
      id: 't2',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: 'cat-home',
      goal_id: null,
      created_by: 'user-2',
      type: 'expense',
      amount: 700,
      note: 'Utilities',
      transaction_date: '2026-11-08',
      created_at: '2026-11-08',
    },
  ];

  const breakdown = buildCategoryBreakdown(txs, sampleCategories);
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].name, 'Housing');
  assert.equal(breakdown[0].percentage, 70);
  assert.equal(breakdown[1].percentage, 30);

  const memberSpend = buildMemberSpendingData(txs, sampleProfiles);
  assert.equal(memberSpend.find((m) => m.memberId === 'user-1')?.expenses, 300);
  assert.equal(memberSpend.find((m) => m.memberId === 'user-2')?.expenses, 700);
});

test('filterTransactionsByCriteria and generateTransactionsCsv produce safe CSV output', () => {
  const refDate = new Date(2026, 10, 25);
  const txs: Transaction[] = [
    {
      id: 't1',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: 'cat-food',
      goal_id: null,
      created_by: 'user-1',
      type: 'expense',
      amount: 42.5,
      note: '=CMD(), Market',
      transaction_date: '2026-11-18',
      created_at: '2026-11-18',
    },
    {
      id: 't2',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: 'cat-home',
      goal_id: null,
      created_by: 'user-1',
      type: 'expense',
      amount: 120,
      note: 'Last month bill',
      transaction_date: '2026-10-12',
      created_at: '2026-10-12',
    },
  ];

  const thisMonth = filterTransactionsByCriteria(txs, {
    preset: 'this_month',
    referenceDate: refDate,
  });
  assert.equal(thisMonth.length, 1);

  const csv = generateTransactionsCsv(thisMonth, sampleAccounts, sampleCategories, sampleProfiles);
  assert.match(csv, /Total Expenses,42\.50/);
  assert.match(csv, /"'=CMD\(\), Market"/);
});
