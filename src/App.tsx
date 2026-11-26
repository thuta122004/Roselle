import { useState } from 'react';
import { AuthAndSetupModal } from './components/AuthAndSetupModal';
import { SidebarLayout } from './components/SidebarLayout';
import { DashboardSkeleton } from './components/SkeletonLoaders';
import { ToastContainer } from './components/ToastContainer';
import { TransactionModal } from './components/TransactionModal';
import { useFinanceStore } from './hooks/useFinanceStore';
import { AccountsFamilyPage } from './pages/AccountsFamilyPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { SavingsGoalsPage } from './pages/SavingsGoalsPage';
import { SettingsCategoriesPage } from './pages/SettingsCategoriesPage';
import type { NavTab, TransactionType } from './types/finance';

export default function App() {
  const store = useFinanceStore();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('expense');
  const [txInitialGoalId, setTxInitialGoalId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const openAddTransaction = (
    type: TransactionType = 'expense',
    goalId: string | null = null,
  ) => {
    setTxInitialType(type);
    setTxInitialGoalId(goalId);
    setTxModalOpen(true);
  };

  if (store.isSupabaseConfigured && !store.isAuthenticated && !store.isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF9FA] flex items-center justify-center p-4">
        <AuthAndSetupModal
          isOpen={true}
          isSupabaseConfigured={true}
          onSignIn={store.signInWithEmail}
          onSignUp={store.signUpWithEmail}
        />
        <ToastContainer toasts={store.toasts} onDismiss={store.dismissToast} />
      </div>
    );
  }

  return (
    <>
      <SidebarLayout
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        scope={store.scope}
        onChangeScope={store.setScope}
        currentUser={store.state.currentUser}
        familyName={store.activeFamilyGroup?.name ?? null}
        isSupabaseConfigured={store.isSupabaseConfigured}
        onOpenAddTx={() => openAddTransaction('expense')}
        onOpenSetupModal={() => setAuthModalOpen(true)}
      >
        {store.isLoading ? (
          <DashboardSkeleton />
        ) : activeTab === 'dashboard' ? (
          <DashboardPage
            accounts={store.visibleAccounts}
            transactions={store.visibleTransactions}
            categories={store.state.categories}
            goals={store.visibleGoals}
            profiles={store.state.profiles}
            scope={store.scope}
            onOpenAddTx={() => openAddTransaction('expense')}
            onDeleteTx={store.deleteTransaction}
            onNavigate={setActiveTab}
          />
        ) : activeTab === 'accounts' ? (
          <AccountsFamilyPage
            accounts={store.visibleAccounts}
            currentUser={store.state.currentUser}
            profiles={store.state.profiles}
            activeFamilyGroup={store.activeFamilyGroup}
            familyMembers={store.familyMembersWithProfiles}
            familyInvites={store.state.familyInvites}
            currentUserRole={store.currentUserRole}
            onSaveAccount={store.saveAccount}
            onToggleSharing={store.toggleAccountSharing}
            onDeleteAccount={store.deleteAccount}
            onCreateFamilyGroup={store.createFamilyGroup}
            onRegenerateCode={store.regenerateInviteCode}
            onJoinFamilyByCode={store.joinFamilyByCode}
            onInviteByEmail={store.inviteFamilyMemberByEmail}
            onUpdateMemberRole={store.updateMemberRole}
            onOpenTransfer={() => openAddTransaction('transfer')}
          />
        ) : activeTab === 'goals' ? (
          <SavingsGoalsPage
            goals={store.visibleGoals}
            accounts={store.visibleAccounts}
            onSaveGoal={store.saveGoal}
            onDeleteGoal={store.deleteGoal}
            onTopUpGoal={(goalId) => openAddTransaction('goal_contribution', goalId)}
          />
        ) : activeTab === 'reports' ? (
          <ReportsPage
            transactions={store.visibleTransactions}
            accounts={store.visibleAccounts}
            categories={store.state.categories}
            profiles={store.state.profiles}
            scope={store.scope}
            onExportSuccess={(count) =>
              store.pushToast(
                'CSV Export Ready',
                `Downloaded ${count} filtered ${count === 1 ? 'entry' : 'entries'}.`,
              )
            }
          />
        ) : (
          <SettingsCategoriesPage
            categories={store.state.categories}
            currentUser={store.state.currentUser}
            isSupabaseConfigured={store.isSupabaseConfigured}
            onAddCategory={store.addCategory}
            onDeleteCategory={store.deleteCategory}
            onUpdateProfile={store.updateProfile}
            onOpenAuthSetup={() => setAuthModalOpen(true)}
            onResetDemoData={store.resetDemoData}
            onSignOut={store.signOut}
          />
        )}
      </SidebarLayout>

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        accounts={store.visibleAccounts}
        categories={store.state.categories}
        goals={store.visibleGoals}
        initialType={txInitialType}
        initialGoalId={txInitialGoalId}
        onSubmit={store.addTransaction}
      />

      <AuthAndSetupModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        isSupabaseConfigured={store.isSupabaseConfigured}
        onSignIn={store.signInWithEmail}
        onSignUp={store.signUpWithEmail}
      />

      <ToastContainer toasts={store.toasts} onDismiss={store.dismissToast} />
    </>
  );
}
