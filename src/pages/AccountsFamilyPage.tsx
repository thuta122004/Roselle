import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { IconBadge } from '../components/IconBadge';
import type {
  Account,
  AccountType,
  FamilyGroup,
  FamilyInvite,
  FamilyMember,
  FamilyRole,
  Profile,
} from '../types/finance';
import type { SaveAccountInput } from '../hooks/useFinanceStore';
import { formatCurrency } from '../utils/financeCalculations';

interface AccountsFamilyPageProps {
  accounts: Account[];
  currentUser: Profile;
  profiles: Profile[];
  activeFamilyGroup: FamilyGroup | null;
  familyMembers: FamilyMember[];
  familyInvites: FamilyInvite[];
  currentUserRole: FamilyRole;
  onSaveAccount: (input: SaveAccountInput) => Promise<boolean> | boolean;
  onToggleSharing: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onCreateFamilyGroup: (name: string) => Promise<boolean> | boolean;
  onRegenerateCode: () => void;
  onJoinFamilyByCode: (code: string) => Promise<boolean> | boolean;
  onInviteByEmail: (email: string, role: FamilyRole) => boolean;
  onUpdateMemberRole: (memberId: string, role: FamilyRole) => void;
  onOpenTransfer: () => void;
}

const ACCOUNT_TYPES: AccountType[] = [
  'Checking',
  'Savings',
  'Cash',
  'Credit Card',
  'Investment',
];

const ACCOUNT_ICONS: Record<AccountType, string> = {
  Checking: 'Landmark',
  Savings: 'Shield',
  Cash: 'Wallet',
  'Credit Card': 'CreditCard',
  Investment: 'TrendingUp',
};

export const AccountsFamilyPage: React.FC<AccountsFamilyPageProps> = ({
  accounts,
  currentUser,
  profiles,
  activeFamilyGroup,
  familyMembers,
  familyInvites,
  currentUserRole,
  onSaveAccount,
  onToggleSharing,
  onDeleteAccount,
  onCreateFamilyGroup,
  onRegenerateCode,
  onJoinFamilyByCode,
  onInviteByEmail,
  onUpdateMemberRole,
  onOpenTransfer,
}) => {
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'shared' | 'personal'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Account Form Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('Checking');
  const [accBalance, setAccBalance] = useState('0');
  const [accIsShared, setAccIsShared] = useState(true);

  // Family Linking State
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('Member');
  const [copiedCode, setCopiedCode] = useState(false);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (visibilityFilter === 'shared' && !acc.is_shared) return false;
      if (visibilityFilter === 'personal' && acc.is_shared) return false;
      if (typeFilter !== 'all' && acc.type !== typeFilter) return false;
      return true;
    });
  }, [accounts, visibilityFilter, typeFilter]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('Checking');
    setAccBalance('0');
    setAccIsShared(Boolean(activeFamilyGroup));
    setIsAccountModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setAccName(account.name);
    setAccType(account.type);
    setAccBalance(String(account.balance));
    setAccIsShared(account.is_shared);
    setIsAccountModalOpen(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const ok = await onSaveAccount({
      id: editingAccount?.id,
      name: accName,
      type: accType,
      balance: Number(accBalance) || 0,
      currency: 'MMK',
      is_shared: accIsShared,
      icon_name: ACCOUNT_ICONS[accType] ?? 'Landmark',
    });
    if (ok) {
      setIsAccountModalOpen(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!activeFamilyGroup) return;
    try {
      await navigator.clipboard.writeText(activeFamilyGroup.invite_code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard errors in restricted frames
    }
  };

  return (
    <div className="space-y-6">
      {/* Multi-Account Header & Filters */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#2D2226]">Accounts & Visibility</h2>
            <p className="text-xs text-[#7A656C] mt-0.5">
              Control which accounts remain private to you and which are shared with your Family Space.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenTransfer}
              className="px-3.5 py-2.5 rounded-xl border border-[#F9E4EA] bg-white hover:bg-[#FFF9FA] text-xs font-semibold text-[#2D2226] transition-colors whitespace-nowrap shrink-0"
            >
              Transfer Between Accounts
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-[#F9E4EA]">
            {(['all', 'shared', 'personal'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setVisibilityFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  visibilityFilter === tab
                    ? 'bg-[#FCE7EC] text-[#2D2226]'
                    : 'text-[#7A656C] hover:text-[#2D2226]'
                }`}
              >
                {tab === 'all' ? 'All Accounts' : tab === 'shared' ? 'Shared' : 'Personal'}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by account type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="toolbar-select !bg-white"
          >
            <option value="all">All Account Types</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {filteredAccounts.length === 0 ? (
          <EmptyState
            title="No accounts match this filter"
            description="Create a new account or adjust your visibility filter to view your balances."
            actionLabel="Add Account"
            onAction={openCreateModal}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAccounts.map((account) => {
              const owner = profileMap.get(account.owner_id);
              const isOwner = account.owner_id === currentUser.id;
              return (
                <div
                  key={account.id}
                  className="soft-card rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <IconBadge iconName={account.icon_name} size="md" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#2D2226] truncate">
                          {account.name}
                        </h3>
                        <p className="text-xs text-[#7A656C] truncate">
                          {account.type} · Owner: {owner?.full_name.split(' ')[0] ?? 'Member'}
                        </p>
                      </div>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(account)}
                          aria-label={`Edit ${account.name}`}
                          className="p-1.5 rounded-lg text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FCE7EC] transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAccount(account.id)}
                          aria-label={`Delete ${account.name}`}
                          className="p-1.5 rounded-lg text-[#7A656C] hover:text-[#D9536F] hover:bg-[#FDECEF] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-3 pt-2 border-t border-[#F9E4EA]">
                    <div>
                      <span className="text-xs text-[#7A656C] block">Current Balance</span>
                      <span
                        className={`text-xl font-bold font-mono-num ${
                          account.balance < 0 ? 'text-[#D9536F]' : 'text-[#2D2226]'
                        }`}
                      >
                        {formatCurrency(account.balance, account.currency)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => onToggleSharing(account.id)}
                      aria-label={`Toggle sharing for ${account.name}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        account.is_shared
                          ? 'bg-[#FCE7EC] text-[#2D2226] hover:bg-[#F8D4DD]'
                          : 'bg-[#FFF9FA] border border-[#F9E4EA] text-[#7A656C] hover:text-[#2D2226]'
                      } disabled:opacity-60`}
                    >
                      {account.is_shared ? (
                        <>
                          <Users className="w-3.5 h-3.5 text-[#E87A90]" />
                          <span>Shared</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#7A656C]" />
                          <span>Personal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Family / Household Linking Space */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <div className="lg:col-span-7 soft-card rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconBadge iconName="Users" size="md" />
              <div>
                <h2 className="text-base font-semibold text-[#2D2226]">
                  {activeFamilyGroup ? activeFamilyGroup.name : 'Create a Family Space'}
                </h2>
                <p className="text-xs text-[#7A656C]">
                  {activeFamilyGroup
                    ? 'Linked members can view shared accounts, shared goals, and combined reports.'
                    : 'Link partners or household members to collaborate on shared budgets.'}
                </p>
              </div>
            </div>
            {activeFamilyGroup && (
              <span className="text-xs font-semibold text-[#E87A90] whitespace-nowrap shrink-0">
                Your role: {currentUserRole}
              </span>
            )}
          </div>

          {activeFamilyGroup ? (
            <>
              {/* Invite Code Box */}
              <div className="rounded-xl border border-[#F9E4EA] bg-[#FFF9FA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-[#7A656C] block">Household Invite Code</span>
                  <span className="text-lg font-bold font-mono-num text-[#2D2226] tracking-wider">
                    {activeFamilyGroup.invite_code}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyInviteCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#F9E4EA] hover:bg-[#FCE7EC]/50 text-xs font-semibold text-[#2D2226] transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#3D8B74]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#E87A90]" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                  {currentUserRole === 'Admin' && (
                    <button
                      type="button"
                      onClick={onRegenerateCode}
                      aria-label="Generate new invite code"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#F9E4EA] hover:bg-[#FCE7EC]/50 text-xs font-semibold text-[#7A656C] hover:text-[#2D2226] transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Rotate</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-[#7A656C]">
                  Household Members ({familyMembers.length})
                </h3>
                <ul className="divide-y divide-[#F9E4EA] border border-[#F9E4EA] rounded-xl overflow-hidden bg-white">
                  {familyMembers.map((member) => {
                    const prof = member.profile;
                    const isSelf = member.user_id === currentUser.id;
                    return (
                      <li
                        key={member.id}
                        className="px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-xl bg-[#FCE7EC] text-[#E87A90] text-xs font-bold inline-flex items-center justify-center shrink-0">
                            {prof?.avatar_initials ?? 'M'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#2D2226] truncate">
                              {prof?.full_name ?? 'Family Member'}
                              {isSelf ? ' (You)' : ''}
                            </p>
                            <p className="text-xs text-[#7A656C] truncate">
                              {prof?.email ?? 'Member account'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {currentUserRole === 'Admin' && !isSelf ? (
                            <select
                              aria-label={`Role for ${prof?.full_name ?? 'member'}`}
                              value={member.role}
                              onChange={(e) =>
                                onUpdateMemberRole(member.id, e.target.value as FamilyRole)
                              }
                              className="toolbar-select !h-8"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Member">Member</option>
                            </select>
                          ) : (
                            <span className="text-xs font-semibold text-[#7A656C]">
                              {member.role}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newGroupName.trim()) return;
                const ok = await onCreateFamilyGroup(newGroupName);
                if (ok) setNewGroupName('');
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Vance Household"
                aria-label="Family Space Name"
                className="input-field flex-1"
              />
              <button
                type="submit"
                className="h-11 px-4 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Create Family Space
              </button>
            </form>
          )}
        </div>

        {/* Invite by Email or Join with Code */}
        <div className="lg:col-span-5 soft-card rounded-2xl p-6 space-y-5">
          {activeFamilyGroup && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#E87A90]" />
                <h3 className="text-sm font-semibold text-[#2D2226]">Invite Family Member</h3>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const ok = onInviteByEmail(inviteEmail, inviteRole);
                  if (ok) setInviteEmail('');
                }}
                className="space-y-2.5"
              >
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A656C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="partner@example.com"
                    aria-label="Invite member email"
                    className="input-field !pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Invited member role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
                    className="select-field !w-32 shrink-0"
                  >
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="flex-1 h-11 px-4 rounded-xl bg-[#FCE7EC] hover:bg-[#F7D3DD] text-[#2D2226] text-xs font-semibold transition-colors"
                  >
                    Send Invite
                  </button>
                </div>
              </form>

              {familyInvites.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-xs font-medium text-[#7A656C]">Recent Invites</span>
                  <ul className="space-y-1.5">
                    {familyInvites.slice(0, 3).map((inv) => (
                      <li
                        key={inv.id}
                        className="text-xs text-[#7A656C] flex items-center justify-between py-1.5 border-b border-[#F9E4EA] last:border-b-0"
                      >
                        <span className="truncate text-[#2D2226]">{inv.email}</span>
                        <span className="shrink-0">
                          {inv.role} · {inv.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className={activeFamilyGroup ? 'pt-4 border-t border-[#F9E4EA] space-y-3' : 'space-y-3'}>
            <h3 className="text-sm font-semibold text-[#2D2226]">Join with Invite Code</h3>
            <p className="text-xs text-[#7A656C]">
              Have a household invite code? Enter it below to link your profile.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!joinCodeInput.trim()) return;
                const ok = await onJoinFamilyByCode(joinCodeInput);
                if (ok) setJoinCodeInput('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="ROSE-8421"
                aria-label="Join family invite code"
                className="input-field flex-1 font-mono-num uppercase"
              />
              <button
                type="submit"
                className="h-11 px-4 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Account Create / Edit Modal */}
      {isAccountModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2226]/30 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="acc-modal-title"
        >
          <div className="soft-card w-full max-w-md rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F9E4EA]">
              <h2 id="acc-modal-title" className="text-base font-semibold text-[#2D2226]">
                {editingAccount ? 'Edit Account' : 'Create Account'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                aria-label="Close account modal"
                className="p-1.5 rounded-lg text-[#7A656C] hover:bg-[#FCE7EC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="acc-name" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                  Account Name
                </label>
                <input
                  id="acc-name"
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Holiday Cash"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="acc-type" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                    Type
                  </label>
                  <select
                    id="acc-type"
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                    className="select-field"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="acc-balance" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                    Balance (MMK)
                  </label>
                  <input
                    id="acc-balance"
                    type="number"
                    step="any"
                    required
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    className="input-field font-mono-num"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#F9E4EA] bg-[#FFF9FA] cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[#2D2226] block">
                    Share with Family Space
                  </span>
                  <span className="text-xs text-[#7A656C]">
                    {activeFamilyGroup
                      ? `Visible to ${activeFamilyGroup.name} members`
                      : 'Create or join a Family Space to enable sharing'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={accIsShared}
                  disabled={!activeFamilyGroup}
                  onChange={(e) => setAccIsShared(e.target.checked)}
                  className="w-4 h-4 accent-[#E87A90]"
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="h-11 px-4 rounded-xl border border-[#F9E4EA] text-xs font-semibold text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FFF9FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors"
                >
                  {editingAccount ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
