import React, { useMemo, useState } from 'react';
import { Calendar, Plus, Trash2, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { IconBadge, SELECTABLE_ICON_NAMES, ICON_REGISTRY } from '../components/IconBadge';
import type { Account, SavingsGoal } from '../types/finance';
import type { SaveGoalInput } from '../hooks/useFinanceStore';
import { formatCurrency, parseIsoDate } from '../utils/financeCalculations';

interface SavingsGoalsPageProps {
  goals: SavingsGoal[];
  accounts: Account[];
  onSaveGoal: (input: SaveGoalInput) => Promise<boolean> | boolean;
  onDeleteGoal: (goalId: string) => void;
  onTopUpGoal: (goalId: string) => void;
}

export const SavingsGoalsPage: React.FC<SavingsGoalsPageProps> = ({
  goals,
  accounts,
  onSaveGoal,
  onDeleteGoal,
  onTopUpGoal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState('2027-06-01');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [iconName, setIconName] = useState('PiggyBank');

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const totalSaved = useMemo(
    () => goals.reduce((sum, g) => sum + g.current_amount, 0),
    [goals],
  );
  const totalTarget = useMemo(
    () => goals.reduce((sum, g) => sum + g.target_amount, 0),
    [goals],
  );

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    [],
  );

  const openModal = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setAccountId(accounts.find((a) => a.type === 'Savings')?.id ?? accounts[0]?.id ?? '');
    setIconName('PiggyBank');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(targetAmount);
    const current = Number(currentAmount) || 0;
    if (!name.trim() || !Number.isFinite(target) || target <= 0 || !accountId) return;

    const ok = await onSaveGoal({
      name: name.trim(),
      account_id: accountId,
      target_amount: target,
      current_amount: current,
      deadline,
      icon_name: iconName,
    });
    if (ok) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#2D2226]">Savings Goals & Buckets</h2>
          <p className="text-xs text-[#7A656C] mt-0.5">
            Total allocated{' '}
            <span className="font-mono-num font-semibold text-[#2D2226]">
              {formatCurrency(totalSaved)}
            </span>{' '}
            of{' '}
            <span className="font-mono-num font-semibold text-[#2D2226]">
              {formatCurrency(totalTarget)}
            </span>{' '}
            across {goals.length} {goals.length === 1 ? 'bucket' : 'buckets'}.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="No savings goals yet"
          description="Create a goal bucket for an emergency cushion, upcoming travel, or home project and link it to a savings vault."
          actionLabel="Create First Goal"
          onAction={openModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const pct = Math.min(
              100,
              Math.round((goal.current_amount / Math.max(1, goal.target_amount)) * 100),
            );
            const remaining = Math.max(0, goal.target_amount - goal.current_amount);
            const linkedAccount = accountMap.get(goal.account_id);
            const parsedDeadline = parseIsoDate(goal.deadline);
            const deadlineLabel = parsedDeadline ? dateFmt.format(parsedDeadline) : goal.deadline;
            const isComplete = pct >= 100;

            return (
              <div
                key={goal.id}
                className="soft-card rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <IconBadge iconName={goal.icon_name} size="md" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#2D2226] truncate">{goal.name}</h3>
                      <p className="text-xs text-[#7A656C] truncate">
                        Linked: {linkedAccount?.name ?? 'Savings Vault'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteGoal(goal.id)}
                    aria-label={`Delete goal ${goal.name}`}
                    className="p-1.5 rounded-lg text-[#7A656C] hover:text-[#D9536F] hover:bg-[#FDECEF] transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-bold font-mono-num text-[#2D2226]">
                      {formatCurrency(goal.current_amount)}
                    </span>
                    <span className="text-xs font-mono-num text-[#7A656C]">
                      of {formatCurrency(goal.target_amount)} ({pct}%)
                    </span>
                  </div>

                  <div
                    className="w-full h-2.5 rounded-full bg-[#FCE7EC] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${goal.name} progress`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isComplete ? 'bg-[#3D8B74]' : 'bg-[#E87A90]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7A656C] pt-1">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#E87A90]" />
                      <span>Target {deadlineLabel}</span>
                    </span>
                    <span className="font-mono-num">
                      {isComplete ? 'Funded' : `${formatCurrency(remaining)} left`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onTopUpGoal(goal.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FCE7EC] hover:bg-[#F7D3DD] text-[#2D2226] text-xs font-semibold transition-colors"
                >
                  Top Up Goal
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2226]/30 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-modal-title"
        >
          <div className="soft-card w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F9E4EA]">
              <h2 id="goal-modal-title" className="text-base font-semibold text-[#2D2226]">
                New Savings Goal
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close goal modal"
                className="p-1.5 rounded-lg text-[#7A656C] hover:bg-[#FCE7EC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="goal-name" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                  Goal Title
                </label>
                <input
                  id="goal-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nursery & Home Study"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="goal-target" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                    Target Amount (MMK)
                  </label>
                  <input
                    id="goal-target"
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="5000000"
                    className="input-field font-mono-num"
                  />
                </div>
                <div>
                  <label htmlFor="goal-current" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                    Initial Saved (MMK)
                  </label>
                  <input
                    id="goal-current"
                    type="number"
                    step="any"
                    min="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="input-field font-mono-num"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="goal-account" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                    Linked Account
                  </label>
                  <select
                    id="goal-account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="select-field"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="goal-deadline" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                    Target Date
                  </label>
                  <input
                    id="goal-deadline"
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#7A656C] mb-1.5">Icon</span>
                <div className="grid grid-cols-6 gap-2">
                  {SELECTABLE_ICON_NAMES.slice(0, 12).map((ic) => {
                    const IconComp = ICON_REGISTRY[ic];
                    const selected = iconName === ic;
                    return (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIconName(ic)}
                        aria-label={`Select ${ic} icon`}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors ${
                          selected
                            ? 'border-[#E87A90] bg-[#FCE7EC] text-[#E87A90]'
                            : 'border-[#F9E4EA] bg-[#FFF9FA] text-[#7A656C] hover:text-[#2D2226]'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-4 rounded-xl border border-[#F9E4EA] text-xs font-semibold text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FFF9FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
