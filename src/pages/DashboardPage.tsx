import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  PiggyBank,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { IconBadge } from '../components/IconBadge';
import type {
  Account,
  Category,
  NavTab,
  Profile,
  SavingsGoal,
  Transaction,
  ViewScope,
} from '../types/finance';
import { calculateKpis, formatCurrency, parseIsoDate } from '../utils/financeCalculations';

interface DashboardPageProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  goals: SavingsGoal[];
  profiles: Profile[];
  scope: ViewScope;
  onOpenAddTx: () => void;
  onDeleteTx: (txId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  accounts,
  transactions,
  categories,
  goals,
  profiles,
  scope,
  onOpenAddTx,
  onDeleteTx,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const kpis = useMemo(() => calculateKpis(accounts, transactions), [accounts, transactions]);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const goalMap = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);

  const recentTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...transactions]
      .sort((a, b) => {
        const dateCmp = b.transaction_date.localeCompare(a.transaction_date);
        if (dateCmp !== 0) return dateCmp;
        return b.created_at.localeCompare(a.created_at);
      })
      .filter((tx) => {
        if (!query) return true;
        const cat = tx.category_id ? categoryMap.get(tx.category_id)?.name ?? '' : '';
        const acc = accountMap.get(tx.account_id)?.name ?? '';
        const member = profileMap.get(tx.created_by)?.full_name ?? '';
        return (
          tx.note.toLowerCase().includes(query) ||
          cat.toLowerCase().includes(query) ||
          acc.toLowerCase().includes(query) ||
          member.toLowerCase().includes(query)
        );
      })
      .slice(0, 12);
  }, [transactions, searchQuery, categoryMap, accountMap, profileMap]);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    [],
  );

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <section aria-label="Financial overview metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="soft-card rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#7A656C]">Total Net Balance</span>
            <IconBadge iconName="Wallet" size="sm" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#2D2226] font-mono-num tracking-tight">
              {formatCurrency(kpis.totalNetBalance)}
            </p>
            <p className="text-xs text-[#7A656C] mt-1">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} ·{' '}
              {scope === 'family' ? 'Family combined' : 'Personal only'}
            </p>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#7A656C]">Monthly Income</span>
            <span className="w-8 h-8 rounded-lg bg-[#EAF5F1] text-[#3D8B74] inline-flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#3D8B74] font-mono-num tracking-tight">
              {formatCurrency(kpis.monthlyIncome)}
            </p>
            <p className="text-xs text-[#7A656C] mt-1">Current calendar month</p>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#7A656C]">Monthly Expenses</span>
            <span className="w-8 h-8 rounded-lg bg-[#FDECEF] text-[#D9536F] inline-flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#D9536F] font-mono-num tracking-tight">
              {formatCurrency(kpis.monthlyExpenses)}
            </p>
            <p className="text-xs text-[#7A656C] mt-1">Excludes internal transfers</p>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#7A656C]">Savings Rate</span>
            <IconBadge iconName="TrendingUp" size="sm" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#2D2226] font-mono-num tracking-tight">
              {kpis.savingsRate.toFixed(1)}%
            </p>
            <p className="text-xs text-[#7A656C] mt-1">
              Net saved {formatCurrency(kpis.monthlyNetSavings)} this month
            </p>
          </div>
        </div>
      </section>

      {/* Multi-Account Carousel / Grid */}
      <section aria-label="Accounts overview" className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#2D2226]">Accounts</h2>
            <p className="text-xs text-[#7A656C]">
              Balances across checking, vaults, cash, cards, and investments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E87A90] hover:text-[#D6657C] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Manage accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            title="No visible accounts in this view"
            description="Add a personal or shared household account to start tracking balances and cashflow."
            actionLabel="Go to Accounts"
            onAction={() => onNavigate('accounts')}
          />
        ) : (
          <div className="flex gap-3.5 overflow-x-auto pb-2 snap-x">
            {accounts.map((account) => {
              const owner = profileMap.get(account.owner_id);
              const isNegative = account.balance < 0;
              return (
                <div
                  key={account.id}
                  className="soft-card rounded-2xl p-4 min-w-[232px] max-w-[260px] shrink-0 snap-start flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <IconBadge iconName={account.icon_name} size="md" />
                    <span className="text-xs font-medium text-[#7A656C]">
                      {account.is_shared ? 'Shared' : 'Personal'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2D2226] truncate">{account.name}</p>
                    <p className="text-xs text-[#7A656C] mt-0.5 truncate">
                      {account.type} · {owner?.full_name.split(' ')[0] ?? 'Member'}
                    </p>
                  </div>
                  <p
                    className={`text-lg font-bold font-mono-num ${
                      isNegative ? 'text-[#D9536F]' : 'text-[#2D2226]'
                    }`}
                  >
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Transactions Feed */}
      <section aria-label="Recent transactions" className="soft-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F9E4EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#2D2226]">Recent Transactions</h2>
            <p className="text-xs text-[#7A656C]">
              Latest activity with account tags and family member attribution.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#7A656C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search note, category, member..."
                aria-label="Search recent transactions"
                className="toolbar-input w-full !pl-9"
              />
            </div>
            <button
              type="button"
              onClick={onOpenAddTx}
              className="h-[38px] inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-[#FCE7EC] hover:bg-[#F9D6DF] text-[#2D2226] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#E87A90]" />
              <span>Quick Add</span>
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex w-11 h-11 rounded-2xl bg-[#FCE7EC] text-[#E87A90] items-center justify-center mb-3">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#2D2226]">No matching transactions</p>
            <p className="text-xs text-[#7A656C] mt-1">
              {searchQuery
                ? 'Try clearing your search filter or check another scope.'
                : 'Log your first expense, income, or savings transfer to see it here.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F9E4EA]" data-testid="recent-transactions-list">
            {recentTransactions.map((tx) => {
              const cat = tx.category_id ? categoryMap.get(tx.category_id) : null;
              const acc = accountMap.get(tx.account_id);
              const toAcc = tx.to_account_id ? accountMap.get(tx.to_account_id) : null;
              const goal = tx.goal_id ? goalMap.get(tx.goal_id) : null;
              const member = profileMap.get(tx.created_by);
              const parsedDate = parseIsoDate(tx.transaction_date);
              const dateLabel = parsedDate ? dateFmt.format(parsedDate) : tx.transaction_date;

              const iconName =
                tx.type === 'transfer'
                  ? 'Landmark'
                  : tx.type === 'goal_contribution'
                    ? 'PiggyBank'
                    : cat?.icon_name ?? 'Tag';

              const amountColor =
                tx.type === 'income'
                  ? 'text-[#3D8B74]'
                  : tx.type === 'expense'
                    ? 'text-[#D9536F]'
                    : 'text-[#2D2226]';

              const prefix =
                tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

              const contextLabel =
                tx.type === 'transfer'
                  ? `Transfer · ${acc?.name ?? 'Account'} to ${toAcc?.name ?? 'Account'}`
                  : tx.type === 'goal_contribution'
                    ? `Goal Top-Up · ${goal?.name ?? 'Savings Goal'} · ${acc?.name ?? 'Account'}`
                    : `${cat?.name ?? 'General'} · ${acc?.name ?? 'Account'}`;

              return (
                <li
                  key={tx.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#FFF9FA] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {tx.type === 'transfer' ? (
                      <span className="w-10 h-10 rounded-xl bg-[#FCE7EC] text-[#E87A90] inline-flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-[18px] h-[18px]" />
                      </span>
                    ) : tx.type === 'goal_contribution' ? (
                      <span className="w-10 h-10 rounded-xl bg-[#EAF5F1] text-[#3D8B74] inline-flex items-center justify-center shrink-0">
                        <PiggyBank className="w-[18px] h-[18px]" />
                      </span>
                    ) : tx.type === 'income' && !cat ? (
                      <span className="w-10 h-10 rounded-xl bg-[#EAF5F1] text-[#3D8B74] inline-flex items-center justify-center shrink-0">
                        <TrendingUp className="w-[18px] h-[18px]" />
                      </span>
                    ) : (
                      <IconBadge iconName={iconName} colorHex={cat?.color_hex} size="md" />
                    )}

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2D2226] truncate">{tx.note}</p>
                      <p className="text-xs text-[#7A656C] mt-0.5 truncate">
                        {contextLabel} · {dateLabel} · Logged by{' '}
                        {member?.full_name.split(' ')[0] ?? 'Member'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-semibold font-mono-num ${amountColor}`}>
                      {prefix}
                      {formatCurrency(tx.amount, acc?.currency ?? 'MMK')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteTx(tx.id)}
                      aria-label={`Delete ${tx.note}`}
                      className="p-1.5 rounded-lg text-[#7A656C] hover:text-[#D9536F] hover:bg-[#FDECEF] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
