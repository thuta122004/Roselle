import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, PiggyBank, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { Account, Category, SavingsGoal, TransactionType } from '../types/finance';
import type { AddTransactionInput } from '../hooks/useFinanceStore';
import { formatCurrency, toIsoDateString } from '../utils/financeCalculations';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  goals: SavingsGoal[];
  initialType?: TransactionType;
  initialGoalId?: string | null;
  onSubmit: (input: AddTransactionInput) => Promise<boolean> | boolean;
}

const TX_TABS: { value: TransactionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'expense', label: 'Expense', icon: TrendingDown },
  { value: 'income', label: 'Income', icon: TrendingUp },
  { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  { value: 'goal_contribution', label: 'Goal Top-Up', icon: PiggyBank },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  goals,
  initialType = 'expense',
  initialGoalId = null,
  onSubmit,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(() => toIsoDateString(new Date()));
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')),
    [categories, type],
  );

  useEffect(() => {
    if (!isOpen) return;
    setType(initialType);
    setAmount('');
    setNote('');
    setErrorMsg('');
    setDate(toIsoDateString(new Date()));
    const firstAcc = accounts[0]?.id ?? '';
    const secondAcc = accounts[1]?.id ?? '';
    setAccountId(firstAcc);
    setToAccountId(secondAcc);
    setGoalId(initialGoalId ?? goals[0]?.id ?? '');
  }, [isOpen, initialType, initialGoalId, accounts, goals]);

  useEffect(() => {
    if (!isOpen) return;
    if (filteredCategories.length > 0 && !filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [isOpen, filteredCategories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }
    if (!accountId) {
      setErrorMsg('Please select a source account.');
      return;
    }
    if (type === 'transfer') {
      if (!toAccountId) {
        setErrorMsg('Please select a destination account.');
        return;
      }
      if (toAccountId === accountId) {
        setErrorMsg('Source and destination accounts must be different.');
        return;
      }
    }
    if (type === 'goal_contribution' && !goalId) {
      setErrorMsg('Please select a savings goal.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onSubmit({
        type,
        amount: parsedAmount,
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        category_id: type === 'expense' || type === 'income' ? categoryId || null : null,
        goal_id: type === 'goal_contribution' ? goalId : null,
        note: note.trim() || (type === 'transfer' ? 'Account transfer' : 'Entry'),
        transaction_date: date,
      });
      if (ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D2226]/30 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="soft-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#F9E4EA]">
          <div>
            <h2 id="tx-modal-title" className="text-lg font-semibold text-[#2D2226]">
              Add Transaction
            </h2>
            <p className="text-xs text-[#7A656C] mt-0.5">
              Log spending, income, internal transfers, or goal top-ups.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction modal"
            className="p-2 rounded-xl text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FCE7EC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#FFF9FA] border border-[#F9E4EA] rounded-xl">
            {TX_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = type === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setType(tab.value)}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FCE7EC] text-[#2D2226]'
                      : 'text-[#7A656C] hover:text-[#2D2226]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#E87A90]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Amount (MMK)
              </label>
              <input
                id="tx-amount"
                type="number"
                step="any"
                min="1"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tx-account" className="block text-xs font-medium text-[#7A656C] mb-1.5">
              {type === 'transfer'
                ? 'From Account'
                : type === 'goal_contribution'
                  ? 'Funding Account'
                  : 'Account'}
            </label>
            <select
              id="tx-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="select-field"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label htmlFor="tx-to-account" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Destination Account
              </label>
              <select
                id="tx-to-account"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="select-field"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(type === 'expense' || type === 'income') && (
            <div>
              <label htmlFor="tx-category" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Category
              </label>
              <select
                id="tx-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="select-field"
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'goal_contribution' && (
            <div>
              <label htmlFor="tx-goal" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Savings Goal Bucket
              </label>
              <select
                id="tx-goal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="select-field"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="tx-note" className="block text-xs font-medium text-[#7A656C] mb-1.5">
              Note or Merchant
            </label>
            <input
              id="tx-note"
              type="text"
              placeholder={
                type === 'transfer'
                  ? 'Monthly savings allocation'
                  : type === 'goal_contribution'
                    ? 'Weekend trip top-up'
                    : 'Artisan bakery, groceries, or payroll'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field"
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-[#D9536F] bg-[#FDECEF] px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl border border-[#F9E4EA] text-sm font-medium text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FFF9FA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-5 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
