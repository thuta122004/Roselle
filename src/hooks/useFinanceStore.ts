import { useCallback, useEffect, useMemo, useState } from 'react';
import { createInitialDemoState } from '../data/seedData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  Account,
  AccountType,
  Category,
  CategoryType,
  FamilyGroup,
  FamilyInvite,
  FamilyMember,
  FamilyRole,
  FinanceDemoState,
  Profile,
  SavingsGoal,
  ToastMessage,
  Transaction,
  TransactionType,
  ViewScope,
} from '../types/finance';
import {
  applyTransactionToState,
  filterAccountsByScope,
  filterGoalsByScope,
  filterTransactionsByScope,
  getInitials,
  roundMoney,
} from '../utils/financeCalculations';

const DEMO_STORAGE_KEY = 'roselle_demo_state_v2';

function loadDemoState(): FinanceDemoState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceDemoState;
      if (parsed && parsed.currentUser && Array.isArray(parsed.accounts)) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted localStorage and re-seed cleanly
  }
  return createInitialDemoState();
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeInviteCode(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'HOME';
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${letters}-${digits}`;
}

export interface AddTransactionInput {
  type: TransactionType;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  goal_id: string | null;
  note: string;
  transaction_date: string;
}

export interface SaveAccountInput {
  id?: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  is_shared: boolean;
  icon_name: string;
}

export interface SaveGoalInput {
  id?: string;
  name: string;
  account_id: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon_name: string;
  is_shared?: boolean;
}

export interface AddCategoryInput {
  name: string;
  type: CategoryType;
  icon_name: string;
  color_hex: string;
}

export function useFinanceStore() {
  const [state, setState] = useState<FinanceDemoState>(() => loadDemoState());
  const [scope, setScope] = useState<ViewScope>('family');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!isSupabaseConfigured);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (title: string, description?: string, variant: ToastMessage['variant'] = 'success') => {
      const id = makeId('toast');
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist demo mode state
  useEffect(() => {
    if (!isSupabaseConfigured) {
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [state]);

  // Initial load (brief smooth skeleton or real Supabase hydration)
  const hydrateFromSupabase = useCallback(async (userId: string, email: string, fullNameHint?: string) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      let { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profileRow) {
        const fallbackName = fullNameHint || email.split('@')[0] || 'Member';
        const initials = getInitials(fallbackName);
        const { data: inserted } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email,
            full_name: fallbackName,
            avatar_initials: initials,
          })
          .select('*')
          .single();
        profileRow = inserted;
      }

      const [
        { data: groupsData },
        { data: membersData },
        { data: accountsData },
        { data: categoriesData },
        { data: goalsData },
        { data: txData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from('family_groups').select('*'),
        supabase.from('family_members').select('*'),
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('savings_goals').select('*').order('deadline', { ascending: true }),
        supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);

      const resolvedProfile: Profile = profileRow ?? {
        id: userId,
        email,
        full_name: fullNameHint || email.split('@')[0],
        avatar_initials: getInitials(fullNameHint || email),
        created_at: new Date().toISOString(),
      };

      setState({
        currentUser: resolvedProfile,
        profiles: (profilesData as Profile[] | null) ?? [resolvedProfile],
        familyGroups: (groupsData as FamilyGroup[] | null) ?? [],
        familyMembers: (membersData as FamilyMember[] | null) ?? [],
        familyInvites: [],
        accounts: ((accountsData as Account[] | null) ?? []).map((a) => ({
          ...a,
          balance: Number(a.balance),
        })),
        categories: (categoriesData as Category[] | null) ?? [],
        savingsGoals: ((goalsData as SavingsGoal[] | null) ?? []).map((g) => ({
          ...g,
          target_amount: Number(g.target_amount),
          current_amount: Number(g.current_amount),
        })),
        transactions: ((txData as Transaction[] | null) ?? []).map((t) => ({
          ...t,
          amount: Number(t.amount),
        })),
      });
      setIsAuthenticated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load workspace data';
      pushToast('Sync Error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const timer = window.setTimeout(() => setIsLoading(false), 180);
      return () => window.clearTimeout(timer);
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        const u = data.session.user;
        hydrateFromSupabase(u.id, u.email ?? '', u.user_metadata?.full_name);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        hydrateFromSupabase(u.id, u.email ?? '', u.user_metadata?.full_name);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [hydrateFromSupabase]);

  const activeFamilyGroup = useMemo<FamilyGroup | null>(() => {
    const member = state.familyMembers.find((m) => m.user_id === state.currentUser.id);
    if (!member) return state.familyGroups[0] ?? null;
    return state.familyGroups.find((g) => g.id === member.group_id) ?? null;
  }, [state.familyGroups, state.familyMembers, state.currentUser.id]);

  const memberGroupIds = useMemo(() => {
    return state.familyMembers
      .filter((m) => m.user_id === state.currentUser.id)
      .map((m) => m.group_id);
  }, [state.familyMembers, state.currentUser.id]);

  const currentUserRole = useMemo<FamilyRole>(() => {
    const m = state.familyMembers.find(
      (fm) => fm.user_id === state.currentUser.id && fm.group_id === activeFamilyGroup?.id,
    );
    return m?.role ?? 'Admin';
  }, [state.familyMembers, state.currentUser.id, activeFamilyGroup]);

  const visibleAccounts = useMemo(
    () => filterAccountsByScope(state.accounts, scope, state.currentUser.id, memberGroupIds),
    [state.accounts, scope, state.currentUser.id, memberGroupIds],
  );

  const visibleAccountIds = useMemo(
    () => new Set(visibleAccounts.map((a) => a.id)),
    [visibleAccounts],
  );

  const visibleTransactions = useMemo(
    () => filterTransactionsByScope(state.transactions, visibleAccounts),
    [state.transactions, visibleAccounts],
  );

  const visibleGoals = useMemo(
    () =>
      filterGoalsByScope(
        state.savingsGoals,
        scope,
        state.currentUser.id,
        memberGroupIds,
        visibleAccountIds,
      ),
    [state.savingsGoals, scope, state.currentUser.id, memberGroupIds, visibleAccountIds],
  );

  const familyMembersWithProfiles = useMemo(() => {
    const profileMap = new Map(state.profiles.map((p) => [p.id, p]));
    return state.familyMembers
      .filter((fm) => !activeFamilyGroup || fm.group_id === activeFamilyGroup.id)
      .map((fm) => ({
        ...fm,
        profile: profileMap.get(fm.user_id),
      }));
  }, [state.familyMembers, state.profiles, activeFamilyGroup]);

  // Auth Actions
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: 'Supabase not configured' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        pushToast('Sign In Failed', error.message, 'error');
        return { error: error.message };
      }
      pushToast('Signed In', 'Welcome back to your workspace.');
      return { error: null };
    },
    [pushToast],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!supabase) return { error: 'Supabase not configured' };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            avatar_initials: getInitials(fullName),
          },
        },
      });
      if (error) {
        pushToast('Sign Up Failed', error.message, 'error');
        return { error: error.message };
      }
      pushToast('Account Created', 'Check your inbox or continue into your workspace.');
      return { error: null };
    },
    [pushToast],
  );

  const signOut = useCallback(async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
      pushToast('Signed Out', 'You have signed out cleanly.', 'info');
    }
  }, [pushToast]);

  const updateProfile = useCallback(
    async (fullName: string) => {
      const trimmed = fullName.trim();
      if (!trimmed) return;
      const initials = getInitials(trimmed);

      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: trimmed, avatar_initials: initials })
          .eq('id', state.currentUser.id);
        if (error) {
          pushToast('Update Failed', error.message, 'error');
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        currentUser: { ...prev.currentUser, full_name: trimmed, avatar_initials: initials },
        profiles: prev.profiles.map((p) =>
          p.id === prev.currentUser.id ? { ...p, full_name: trimmed, avatar_initials: initials } : p,
        ),
      }));
      pushToast('Profile Updated', `Display name set to ${trimmed}.`);
    },
    [state.currentUser.id, pushToast],
  );

  // Transaction CRUD
  const addTransaction = useCallback(
    async (input: AddTransactionInput) => {
      const amount = roundMoney(Number(input.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        pushToast('Invalid Amount', 'Please enter an amount greater than zero.', 'error');
        return false;
      }

      const newTx: Transaction = {
        id: makeId('tx'),
        account_id: input.account_id,
        to_account_id: input.type === 'transfer' ? input.to_account_id : null,
        category_id:
          input.type === 'expense' || input.type === 'income' ? input.category_id : null,
        goal_id: input.type === 'goal_contribution' ? input.goal_id : null,
        created_by: state.currentUser.id,
        type: input.type,
        amount,
        note: input.note.trim() || 'Untitled entry',
        transaction_date: input.transaction_date,
        created_at: new Date().toISOString(),
      };

      const nextStateParts = applyTransactionToState(
        state.accounts,
        state.savingsGoals,
        newTx,
        'apply',
      );

      if (supabase && isSupabaseConfigured) {
        const { data: inserted, error } = await supabase
          .from('transactions')
          .insert({
            account_id: newTx.account_id,
            to_account_id: newTx.to_account_id,
            category_id: newTx.category_id,
            goal_id: newTx.goal_id,
            created_by: newTx.created_by,
            type: newTx.type,
            amount: newTx.amount,
            note: newTx.note,
            transaction_date: newTx.transaction_date,
          })
          .select('*')
          .single();

        if (error) {
          pushToast('Could Not Save Transaction', error.message, 'error');
          return false;
        }
        newTx.id = inserted.id;

        // Sync updated account balances & goal amount
        for (const acc of nextStateParts.accounts) {
          const orig = state.accounts.find((a) => a.id === acc.id);
          if (orig && orig.balance !== acc.balance) {
            await supabase.from('accounts').update({ balance: acc.balance }).eq('id', acc.id);
          }
        }
        if (newTx.type === 'goal_contribution' && newTx.goal_id) {
          const updatedGoal = nextStateParts.savingsGoals.find((g) => g.id === newTx.goal_id);
          if (updatedGoal) {
            await supabase
              .from('savings_goals')
              .update({ current_amount: updatedGoal.current_amount })
              .eq('id', updatedGoal.id);
          }
        }
      }

      setState((prev) => {
        const applied = applyTransactionToState(prev.accounts, prev.savingsGoals, newTx, 'apply');
        return {
          ...prev,
          accounts: applied.accounts,
          savingsGoals: applied.savingsGoals,
          transactions: [newTx, ...prev.transactions],
        };
      });

      const labelMap: Record<TransactionType, string> = {
        expense: 'Expense Logged',
        income: 'Income Recorded',
        transfer: 'Transfer Completed',
        goal_contribution: 'Goal Topped Up',
      };
      pushToast(labelMap[input.type], `${newTx.note} has been saved.`);
      return true;
    },
    [state.currentUser.id, state.accounts, state.savingsGoals, pushToast],
  );

  const deleteTransaction = useCallback(
    async (txId: string) => {
      const target = state.transactions.find((t) => t.id === txId);
      if (!target) return;

      const reverted = applyTransactionToState(
        state.accounts,
        state.savingsGoals,
        target,
        'revert',
      );

      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.from('transactions').delete().eq('id', txId);
        if (error) {
          pushToast('Delete Failed', error.message, 'error');
          return;
        }
        for (const acc of reverted.accounts) {
          const orig = state.accounts.find((a) => a.id === acc.id);
          if (orig && orig.balance !== acc.balance) {
            await supabase.from('accounts').update({ balance: acc.balance }).eq('id', acc.id);
          }
        }
        if (target.type === 'goal_contribution' && target.goal_id) {
          const updatedGoal = reverted.savingsGoals.find((g) => g.id === target.goal_id);
          if (updatedGoal) {
            await supabase
              .from('savings_goals')
              .update({ current_amount: updatedGoal.current_amount })
              .eq('id', updatedGoal.id);
          }
        }
      }

      setState((prev) => {
        const tx = prev.transactions.find((t) => t.id === txId);
        if (!tx) return prev;
        const rev = applyTransactionToState(prev.accounts, prev.savingsGoals, tx, 'revert');
        return {
          ...prev,
          accounts: rev.accounts,
          savingsGoals: rev.savingsGoals,
          transactions: prev.transactions.filter((t) => t.id !== txId),
        };
      });
      pushToast('Transaction Removed', 'Balances have been adjusted accordingly.', 'info');
    },
    [state.transactions, state.accounts, state.savingsGoals, pushToast],
  );

  // Account CRUD & Visibility Toggle
  const saveAccount = useCallback(
    async (input: SaveAccountInput) => {
      const name = input.name.trim();
      if (!name) return false;
      const balance = roundMoney(Number(input.balance) || 0);
      const groupId = input.is_shared ? activeFamilyGroup?.id ?? null : null;

      if (input.id) {
        if (supabase && isSupabaseConfigured) {
          const { error } = await supabase
            .from('accounts')
            .update({
              name,
              type: input.type,
              balance,
              currency: input.currency,
              is_shared: input.is_shared && Boolean(groupId),
              family_group_id: groupId,
              icon_name: input.icon_name,
            })
            .eq('id', input.id);
          if (error) {
            pushToast('Update Failed', error.message, 'error');
            return false;
          }
        }
        setState((prev) => ({
          ...prev,
          accounts: prev.accounts.map((a) =>
            a.id === input.id
              ? {
                  ...a,
                  name,
                  type: input.type,
                  balance,
                  currency: input.currency,
                  is_shared: input.is_shared && Boolean(groupId),
                  family_group_id: groupId,
                  icon_name: input.icon_name,
                }
              : a,
          ),
        }));
        pushToast('Account Updated', `${name} details saved.`);
        return true;
      }

      const newAccount: Account = {
        id: makeId('acc'),
        owner_id: state.currentUser.id,
        family_group_id: groupId,
        name,
        type: input.type,
        balance,
        currency: input.currency || 'MMK',
        is_shared: input.is_shared && Boolean(groupId),
        icon_name: input.icon_name || 'Landmark',
        created_at: new Date().toISOString(),
      };

      if (supabase && isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('accounts')
          .insert({
            owner_id: newAccount.owner_id,
            family_group_id: newAccount.family_group_id,
            name: newAccount.name,
            type: newAccount.type,
            balance: newAccount.balance,
            currency: newAccount.currency,
            is_shared: newAccount.is_shared,
            icon_name: newAccount.icon_name,
          })
          .select('*')
          .single();
        if (error) {
          pushToast('Creation Failed', error.message, 'error');
          return false;
        }
        newAccount.id = data.id;
      }

      setState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, newAccount],
      }));
      pushToast('Account Added', `${name} is ready for tracking.`);
      return true;
    },
    [state.currentUser.id, activeFamilyGroup, pushToast],
  );

  const toggleAccountSharing = useCallback(
    async (accountId: string) => {
      const target = state.accounts.find((a) => a.id === accountId);
      if (!target) return;
      if (!target.is_shared && !activeFamilyGroup) {
        pushToast(
          'Family Space Required',
          'Create or join a Family Space first to share an account.',
          'info',
        );
        return;
      }
      const nextShared = !target.is_shared;
      const nextGroupId = nextShared ? activeFamilyGroup?.id ?? null : null;

      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase
          .from('accounts')
          .update({ is_shared: nextShared, family_group_id: nextGroupId })
          .eq('id', accountId);
        if (error) {
          pushToast('Visibility Update Failed', error.message, 'error');
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === accountId
            ? { ...a, is_shared: nextShared, family_group_id: nextGroupId }
            : a,
        ),
      }));
      pushToast(
        nextShared ? 'Shared with Family Space' : 'Set to Personal Only',
        `${target.name} visibility updated.`,
      );
    },
    [state.accounts, activeFamilyGroup, pushToast],
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.from('accounts').delete().eq('id', accountId);
        if (error) {
          pushToast('Delete Failed', error.message, 'error');
          return;
        }
      }
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.filter((a) => a.id !== accountId),
        transactions: prev.transactions.filter(
          (t) => t.account_id !== accountId && t.to_account_id !== accountId,
        ),
      }));
      pushToast('Account Deleted', 'Account removed from your ledger.', 'info');
    },
    [pushToast],
  );

  // Family Space Actions
  const createFamilyGroup = useCallback(
    async (groupName: string) => {
      const trimmed = groupName.trim();
      if (!trimmed) return false;
      const inviteCode = makeInviteCode(trimmed);
      const group: FamilyGroup = {
        id: makeId('fam'),
        name: trimmed,
        invite_code: inviteCode,
        created_by: state.currentUser.id,
        created_at: new Date().toISOString(),
      };
      const member: FamilyMember = {
        id: makeId('fm'),
        group_id: group.id,
        user_id: state.currentUser.id,
        role: 'Admin',
        joined_at: new Date().toISOString(),
      };

      if (supabase && isSupabaseConfigured) {
        const { data: gData, error: gErr } = await supabase
          .from('family_groups')
          .insert({
            name: group.name,
            invite_code: group.invite_code,
            created_by: group.created_by,
          })
          .select('*')
          .single();
        if (gErr) {
          pushToast('Could Not Create Family Space', gErr.message, 'error');
          return false;
        }
        group.id = gData.id;
        member.group_id = gData.id;

        const { data: mData } = await supabase
          .from('family_members')
          .insert({
            group_id: group.id,
            user_id: state.currentUser.id,
            role: 'Admin',
          })
          .select('*')
          .single();
        if (mData) member.id = mData.id;
      }

      setState((prev) => ({
        ...prev,
        familyGroups: [...prev.familyGroups, group],
        familyMembers: [...prev.familyMembers, member],
      }));
      pushToast('Family Space Created', `Invite code ${inviteCode} is active.`);
      return true;
    },
    [state.currentUser.id, pushToast],
  );

  const regenerateInviteCode = useCallback(async () => {
    if (!activeFamilyGroup) return;
    const nextCode = makeInviteCode(activeFamilyGroup.name);
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase
        .from('family_groups')
        .update({ invite_code: nextCode })
        .eq('id', activeFamilyGroup.id);
      if (error) {
        pushToast('Failed to Rotate Code', error.message, 'error');
        return;
      }
    }
    setState((prev) => ({
      ...prev,
      familyGroups: prev.familyGroups.map((g) =>
        g.id === activeFamilyGroup.id ? { ...g, invite_code: nextCode } : g,
      ),
    }));
    pushToast('New Invite Code Generated', `Share code ${nextCode} with family members.`);
  }, [activeFamilyGroup, pushToast]);

  const joinFamilyByCode = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) return false;

      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.rpc('join_family_by_code', {
          p_invite_code: normalized,
        });
        if (error) {
          pushToast('Invalid Invite Code', error.message, 'error');
          return false;
        }
        await hydrateFromSupabase(state.currentUser.id, state.currentUser.email);
        pushToast('Joined Family Space', 'Shared accounts and goals are now visible.');
        return true;
      }

      const found = state.familyGroups.find((g) => g.invite_code.toUpperCase() === normalized);
      if (!found) {
        pushToast(
          'Code Not Found',
          'In Demo Mode, try code ROSE-8421 or create a new Family Space.',
          'error',
        );
        return false;
      }
      const alreadyMember = state.familyMembers.some(
        (m) => m.group_id === found.id && m.user_id === state.currentUser.id,
      );
      if (!alreadyMember) {
        setState((prev) => ({
          ...prev,
          familyMembers: [
            ...prev.familyMembers,
            {
              id: makeId('fm'),
              group_id: found.id,
              user_id: state.currentUser.id,
              role: 'Member',
              joined_at: new Date().toISOString(),
            },
          ],
        }));
      }
      pushToast('Joined Family Space', `Connected to ${found.name}.`);
      return true;
    },
    [state.familyGroups, state.familyMembers, state.currentUser, hydrateFromSupabase, pushToast],
  );

  const inviteFamilyMemberByEmail = useCallback(
    (email: string, role: FamilyRole = 'Member') => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !activeFamilyGroup) {
        pushToast('Invalid Email', 'Enter a valid email address.', 'error');
        return false;
      }
      const invite: FamilyInvite = {
        id: makeId('inv'),
        group_id: activeFamilyGroup.id,
        email: cleanEmail,
        role,
        sent_at: new Date().toISOString().split('T')[0],
        status: 'Pending',
      };
      setState((prev) => ({
        ...prev,
        familyInvites: [invite, ...prev.familyInvites],
      }));
      pushToast(
        'Invitation Logged',
        `Share invite code ${activeFamilyGroup.invite_code} with ${cleanEmail}.`,
      );
      return true;
    },
    [activeFamilyGroup, pushToast],
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: FamilyRole) => {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase
          .from('family_members')
          .update({ role })
          .eq('id', memberId);
        if (error) {
          pushToast('Role Update Failed', error.message, 'error');
          return;
        }
      }
      setState((prev) => ({
        ...prev,
        familyMembers: prev.familyMembers.map((m) =>
          m.id === memberId ? { ...m, role } : m,
        ),
      }));
      pushToast('Member Role Updated', `Permissions changed to ${role}.`);
    },
    [pushToast],
  );

  // Savings Goals CRUD
  const saveGoal = useCallback(
    async (input: SaveGoalInput) => {
      const name = input.name.trim();
      if (!name || input.target_amount <= 0) return false;
      const groupId = input.is_shared !== false ? activeFamilyGroup?.id ?? null : null;

      const goal: SavingsGoal = {
        id: input.id ?? makeId('goal'),
        account_id: input.account_id,
        family_group_id: groupId,
        created_by: state.currentUser.id,
        name,
        target_amount: roundMoney(input.target_amount),
        current_amount: roundMoney(input.current_amount),
        deadline: input.deadline,
        icon_name: input.icon_name || 'PiggyBank',
      };

      if (input.id) {
        if (supabase && isSupabaseConfigured) {
          const { error } = await supabase
            .from('savings_goals')
            .update({
              name: goal.name,
              account_id: goal.account_id,
              target_amount: goal.target_amount,
              current_amount: goal.current_amount,
              deadline: goal.deadline,
              icon_name: goal.icon_name,
            })
            .eq('id', input.id);
          if (error) {
            pushToast('Goal Update Failed', error.message, 'error');
            return false;
          }
        }
        setState((prev) => ({
          ...prev,
          savingsGoals: prev.savingsGoals.map((g) => (g.id === input.id ? goal : g)),
        }));
        pushToast('Savings Goal Updated', `${goal.name} saved.`);
        return true;
      }

      if (supabase && isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('savings_goals')
          .insert({
            account_id: goal.account_id,
            family_group_id: goal.family_group_id,
            created_by: goal.created_by,
            name: goal.name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            deadline: goal.deadline,
            icon_name: goal.icon_name,
          })
          .select('*')
          .single();
        if (error) {
          pushToast('Could Not Create Goal', error.message, 'error');
          return false;
        }
        goal.id = data.id;
      }

      setState((prev) => ({
        ...prev,
        savingsGoals: [...prev.savingsGoals, goal],
      }));
      pushToast('Savings Goal Created', `${goal.name} added to your buckets.`);
      return true;
    },
    [state.currentUser.id, activeFamilyGroup, pushToast],
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.from('savings_goals').delete().eq('id', goalId);
        if (error) {
          pushToast('Delete Failed', error.message, 'error');
          return;
        }
      }
      setState((prev) => ({
        ...prev,
        savingsGoals: prev.savingsGoals.filter((g) => g.id !== goalId),
      }));
      pushToast('Goal Removed', 'Savings goal bucket deleted.', 'info');
    },
    [pushToast],
  );

  // Categories CRUD
  const addCategory = useCallback(
    async (input: AddCategoryInput) => {
      const name = input.name.trim();
      if (!name) return false;
      const newCategory: Category = {
        id: makeId('cat'),
        user_id: state.currentUser.id,
        family_group_id: activeFamilyGroup?.id ?? null,
        name,
        type: input.type,
        icon_name: input.icon_name,
        color_hex: input.color_hex,
      };

      if (supabase && isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            user_id: newCategory.user_id,
            family_group_id: newCategory.family_group_id,
            name: newCategory.name,
            type: newCategory.type,
            icon_name: newCategory.icon_name,
            color_hex: newCategory.color_hex,
          })
          .select('*')
          .single();
        if (error) {
          pushToast('Could Not Create Category', error.message, 'error');
          return false;
        }
        newCategory.id = data.id;
      }

      setState((prev) => ({
        ...prev,
        categories: [...prev.categories, newCategory],
      }));
      pushToast('Category Created', `${name} is ready to use.`);
      return true;
    },
    [state.currentUser.id, activeFamilyGroup, pushToast],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.from('categories').delete().eq('id', categoryId);
        if (error) {
          pushToast('Delete Failed', error.message, 'error');
          return;
        }
      }
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== categoryId),
      }));
      pushToast('Category Deleted', 'Category removed from your list.', 'info');
    },
    [pushToast],
  );

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDemoState();
    setState(fresh);
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    pushToast('Demo Data Reset', 'Sample household accounts and entries restored.');
  }, [pushToast]);

  return {
    state,
    scope,
    setScope,
    isLoading,
    isAuthenticated,
    isSupabaseConfigured,
    activeFamilyGroup,
    currentUserRole,
    visibleAccounts,
    visibleTransactions,
    visibleGoals,
    familyMembersWithProfiles,
    toasts,
    pushToast,
    dismissToast,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
    addTransaction,
    deleteTransaction,
    saveAccount,
    toggleAccountSharing,
    deleteAccount,
    createFamilyGroup,
    regenerateInviteCode,
    joinFamilyByCode,
    inviteFamilyMemberByEmail,
    updateMemberRole,
    saveGoal,
    deleteGoal,
    addCategory,
    deleteCategory,
    resetDemoData,
  };
}
