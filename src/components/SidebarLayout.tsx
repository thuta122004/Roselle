import React from 'react';
import {
  BarChart3,
  Database,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Settings,
  User,
  Users,
} from 'lucide-react';
import type { NavTab, Profile, ViewScope } from '../types/finance';

interface SidebarLayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  scope: ViewScope;
  onChangeScope: (scope: ViewScope) => void;
  currentUser: Profile;
  familyName: string | null;
  isSupabaseConfigured: boolean;
  onOpenAddTx: () => void;
  onOpenSetupModal: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'accounts', label: 'Accounts & Family', shortLabel: 'Accounts', icon: Landmark },
  { id: 'goals', label: 'Savings Goals', shortLabel: 'Goals', icon: PiggyBank },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Categories & Settings', shortLabel: 'Settings', icon: Settings },
];

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  activeTab,
  onSelectTab,
  scope,
  onChangeScope,
  currentUser,
  familyName,
  isSupabaseConfigured,
  onOpenAddTx,
  onOpenSetupModal,
  children,
}) => {
  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#FFF9FA] text-[#2D2226] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-[#F9E4EA] bg-white px-4 py-6 justify-between sticky top-0 h-screen">
        <div className="space-y-8">
          {/* Single-element brand wordmark */}
          <div className="px-3">
            <span className="text-xl font-bold tracking-tight text-[#2D2226] whitespace-nowrap">
              Roselle
            </span>
          </div>

          <nav aria-label="Primary navigation" className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#FCE7EC] text-[#2D2226] font-semibold'
                      : 'text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FFF9FA] font-medium'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      active ? 'text-[#E87A90]' : 'text-[#7A656C]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Summary */}
        <div className="pt-4 border-t border-[#F9E4EA] px-2 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#FCE7EC] text-[#E87A90] text-xs font-bold inline-flex items-center justify-center shrink-0">
            {currentUser.avatar_initials}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#2D2226] truncate">{currentUser.full_name}</p>
            <p className="text-[11px] text-[#7A656C] truncate">
              {familyName ?? 'Personal Workspace'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-8">
        {/* Subtle Demo Mode Banner (only when Supabase env vars are not set) */}
        {!isSupabaseConfigured && (
          <div className="bg-[#FCE7EC]/75 border-b border-[#F9E4EA] px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#2D2226]">
              <Database className="w-3.5 h-3.5 text-[#E87A90] shrink-0" />
              <span>
                Local Demo Mode active · Changes save to your browser until Supabase keys are configured.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenSetupModal}
              className="font-semibold text-[#D6657C] hover:text-[#2D2226] underline underline-offset-2 whitespace-nowrap shrink-0"
            >
              Setup Guide & Auth
            </button>
          </div>
        )}

        {/* Workspace Top Bar */}
        <header className="px-4 sm:px-8 py-4 border-b border-[#F9E4EA] bg-white/85 backdrop-blur-sm lg:sticky lg:top-0 z-30">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="lg:hidden text-lg font-bold tracking-tight text-[#2D2226] whitespace-nowrap">
                Roselle
              </span>
              <span className="lg:hidden text-[#F3D1DA]" aria-hidden="true">/</span>
              <h1 className="text-base sm:text-lg font-semibold text-[#2D2226] truncate">
                {activeNav.label}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Scope Toggle: My View vs Family Combined View */}
              <div
                className="inline-flex items-center p-1 rounded-xl bg-[#FFF9FA] border border-[#F9E4EA]"
                role="group"
                aria-label="Workspace scope"
              >
                <button
                  type="button"
                  onClick={() => onChangeScope('personal')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    scope === 'personal'
                      ? 'bg-[#FCE7EC] text-[#2D2226]'
                      : 'text-[#7A656C] hover:text-[#2D2226]'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#E87A90]" />
                  <span>My View</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeScope('family')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    scope === 'family'
                      ? 'bg-[#FCE7EC] text-[#2D2226]'
                      : 'text-[#7A656C] hover:text-[#2D2226]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#E87A90]" />
                  <span className="hidden sm:inline">Family Combined View</span>
                  <span className="sm:hidden">Family</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenAddTx}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#F9E4EA] px-2 py-1.5 grid grid-cols-5 gap-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${
                active ? 'bg-[#FCE7EC] text-[#2D2226]' : 'text-[#7A656C]'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#E87A90]' : 'text-[#7A656C]'}`} />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
