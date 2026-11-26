import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { IconBadge } from '../components/IconBadge';
import type {
  Account,
  Category,
  DateRangePreset,
  Profile,
  Transaction,
  ViewScope,
} from '../types/finance';
import {
  buildCategoryBreakdown,
  buildDailyCashflowData,
  buildMemberSpendingData,
  buildMonthlyTrendData,
  filterTransactionsByCriteria,
  formatCompactCurrency,
  formatCurrency,
  generateTransactionsCsv,
  roundMoney,
  toIsoDateString,
} from '../utils/financeCalculations';

interface ReportsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  profiles: Profile[];
  scope: ViewScope;
  onExportSuccess: (count: number) => void;
}

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export const ReportsPage: React.FC<ReportsPageProps> = ({
  transactions,
  accounts,
  categories,
  profiles,
  scope,
  onExportSuccess,
}) => {
  const [preset, setPreset] = useState<DateRangePreset>('last_3_months');
  const [customStart, setCustomStart] = useState<string>(() => {
    const now = new Date();
    return toIsoDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  });
  const [customEnd, setCustomEnd] = useState<string>(() => toIsoDateString(new Date()));
  const [accountId, setAccountId] = useState<string>('all');
  const [memberId, setMemberId] = useState<string>('all');

  const filteredTransactions = useMemo(
    () =>
      filterTransactionsByCriteria(transactions, {
        preset,
        customStart,
        customEnd,
        accountId,
        memberId,
      }),
    [transactions, preset, customStart, customEnd, accountId, memberId],
  );

  const summary = useMemo(() => {
    const income = roundMoney(
      filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    );
    const expenses = roundMoney(
      filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    );
    return {
      income,
      expenses,
      net: roundMoney(income - expenses),
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const monthlyTrend = useMemo(
    () =>
      buildMonthlyTrendData(
        transactions,
        preset === 'ytd' ? 6 : preset === 'last_3_months' ? 4 : 3,
      ),
    [transactions, preset],
  );

  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(filteredTransactions, categories),
    [filteredTransactions, categories],
  );

  const memberSpending = useMemo(
    () => buildMemberSpendingData(filteredTransactions, profiles),
    [filteredTransactions, profiles],
  );

  const dailyCashflow = useMemo(
    () => buildDailyCashflowData(filteredTransactions),
    [filteredTransactions],
  );

  const handleExportCsv = () => {
    const csv = generateTransactionsCsv(filteredTransactions, accounts, categories, profiles);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `roselle-report-${preset}-${toIsoDateString(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onExportSuccess(filteredTransactions.length);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#2D2226]">Reports & Analytics</h2>
          <p className="text-xs text-[#7A656C] mt-0.5">
            Track cashflow trends, spending distribution, and household contributions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="soft-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#FFF9FA] border border-[#F9E4EA]">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  preset === p.value
                    ? 'bg-[#FCE7EC] text-[#2D2226]'
                    : 'text-[#7A656C] hover:text-[#2D2226]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter report by account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="toolbar-select"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter report by member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="toolbar-select"
            >
              <option value="all">All Members</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F9E4EA]">
            <div className="flex items-center gap-2">
              <label htmlFor="report-start" className="text-xs font-medium text-[#7A656C]">
                From
              </label>
              <input
                id="report-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="toolbar-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="report-end" className="text-xs font-medium text-[#7A656C]">
                To
              </label>
              <input
                id="report-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="toolbar-input"
              />
            </div>
          </div>
        )}

        {/* Filtered Period Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#F9E4EA]">
          <div>
            <span className="text-xs text-[#7A656C] block">Period Income</span>
            <span className="text-base font-bold font-mono-num text-[#3D8B74]">
              {formatCurrency(summary.income)}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#7A656C] block">Period Expenses</span>
            <span className="text-base font-bold font-mono-num text-[#D9536F]">
              {formatCurrency(summary.expenses)}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#7A656C] block">Net Savings</span>
            <span
              className={`text-base font-bold font-mono-num ${
                summary.net >= 0 ? 'text-[#2D2226]' : 'text-[#D9536F]'
              }`}
            >
              {formatCurrency(summary.net)}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#7A656C] block">Entries</span>
            <span className="text-base font-bold font-mono-num text-[#2D2226]">
              {summary.count}
            </span>
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <EmptyState
          title="No transactions in this reporting window"
          description="Try selecting a wider date range such as Last 3 Months or Year to Date."
          actionLabel="Switch to Last 3 Months"
          onAction={() => setPreset('last_3_months')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart 1: Income vs Expenses vs Net Savings Trend */}
          <div className="lg:col-span-7 soft-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#2D2226]">
                  Income vs. Expenses & Net Savings
                </h3>
                <p className="text-xs text-[#7A656C]">
                  Monthly comparison with net savings trajectory
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#7A656C]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#3D8B74]" />
                  Income
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#E87A90]" />
                  Expenses
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9D6B84]" />
                  Net
                </span>
              </div>
            </div>

            <div className="h-[272px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F9E4EA" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fill: '#7A656C', fontSize: 12 }}
                    axisLine={{ stroke: '#F9E4EA' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={68}
                    tickFormatter={(val: number) => formatCompactCurrency(val)}
                    tick={{ fill: '#7A656C', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#F9E4EA',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#2D2226',
                    }}
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#3D8B74"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#E87A90"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="netSavings"
                    name="Net Savings"
                    stroke="#9D6B84"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#9D6B84' }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Spending Breakdown by Category (Donut) */}
          <div className="lg:col-span-5 soft-card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#2D2226]">
                Spending by Category
              </h3>
              <p className="text-xs text-[#7A656C]">
                Share of expenses across your filtered period
              </p>
            </div>

            {categoryBreakdown.length === 0 ? (
              <div className="h-[272px] flex items-center justify-center text-xs text-[#7A656C]">
                No expense entries in this filtered selection.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[176px_1fr] gap-4 items-center">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={3}
                        isAnimationActive={false}
                      >
                        {categoryBreakdown.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown) => formatCurrency(Number(value))}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#F9E4EA',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="space-y-2.5 max-h-[248px] overflow-y-auto pr-1">
                  {categoryBreakdown.map((item) => (
                    <li
                      key={item.categoryId}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconBadge iconName={item.iconName} colorHex={item.color} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-[#2D2226] truncate">{item.name}</p>
                          <p className="text-[#7A656C] font-mono-num">{item.percentage}%</p>
                        </div>
                      </div>
                      <span className="font-semibold font-mono-num text-[#2D2226] shrink-0">
                        {formatCurrency(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Chart 3: Daily Cashflow & Savings Growth */}
          <div className="lg:col-span-7 soft-card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#2D2226]">
                Daily Cashflow & Cumulative Savings Growth
              </h3>
              <p className="text-xs text-[#7A656C]">
                Running net savings accumulation across the selected dates
              </p>
            </div>

            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyCashflow} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="roselleGrowthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E87A90" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#E87A90" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F9E4EA" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: '#7A656C', fontSize: 11 }}
                    axisLine={{ stroke: '#F9E4EA' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={68}
                    tickFormatter={(val: number) => formatCompactCurrency(val)}
                    tick={{ fill: '#7A656C', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#F9E4EA',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeSavings"
                    name="Cumulative Net"
                    stroke="#E87A90"
                    strokeWidth={2.25}
                    fill="url(#roselleGrowthFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Family Member Spending Comparison */}
          <div className="lg:col-span-5 soft-card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#2D2226]">
                Family Member Comparison
              </h3>
              <p className="text-xs text-[#7A656C]">
                {scope === 'family'
                  ? 'Income and spending logged per household member'
                  : 'Switch to Family Combined View to compare household members'}
              </p>
            </div>

            {scope === 'personal' ? (
              <div className="h-[260px] rounded-xl bg-[#FFF9FA] border border-[#F9E4EA] flex flex-col items-center justify-center p-6 text-center">
                <p className="text-sm font-semibold text-[#2D2226]">Personal View Active</p>
                <p className="text-xs text-[#7A656C] mt-1 max-w-xs">
                  Toggle to Family Combined View in the top bar to see side-by-side household spending.
                </p>
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberSpending} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F9E4EA" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#7A656C', fontSize: 12 }}
                      axisLine={{ stroke: '#F9E4EA' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={68}
                      tickFormatter={(val: number) => formatCompactCurrency(val)}
                      tick={{ fill: '#7A656C', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: unknown) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#F9E4EA',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#3D8B74"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill="#E87A90"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
