import React, { useState } from 'react';
import { Check, Database, Plus, RotateCcw, Trash2, User } from 'lucide-react';
import {
  ICON_REGISTRY,
  IconBadge,
  PASTEL_SWATCHES,
  SELECTABLE_ICON_NAMES,
} from '../components/IconBadge';
import type { Category, CategoryType, Profile } from '../types/finance';
import type { AddCategoryInput } from '../hooks/useFinanceStore';

interface SettingsCategoriesPageProps {
  categories: Category[];
  currentUser: Profile;
  isSupabaseConfigured: boolean;
  onAddCategory: (input: AddCategoryInput) => Promise<boolean> | boolean;
  onDeleteCategory: (id: string) => void;
  onUpdateProfile: (fullName: string) => void;
  onOpenAuthSetup: () => void;
  onResetDemoData: () => void;
  onSignOut: () => void;
}

export const SettingsCategoriesPage: React.FC<SettingsCategoriesPageProps> = ({
  categories,
  currentUser,
  isSupabaseConfigured,
  onAddCategory,
  onDeleteCategory,
  onUpdateProfile,
  onOpenAuthSetup,
  onResetDemoData,
  onSignOut,
}) => {
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<CategoryType>('expense');
  const [catIcon, setCatIcon] = useState<string>('Coffee');
  const [catColor, setCatColor] = useState<string>(PASTEL_SWATCHES[0].hex);

  const [fullNameInput, setFullNameInput] = useState(currentUser.full_name);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const ok = await onAddCategory({
      name: catName,
      type: catType,
      icon_name: catIcon,
      color_hex: catColor,
    });
    if (ok) {
      setCatName('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Create Custom Category */}
        <div className="lg:col-span-5 soft-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <IconBadge iconName={catIcon} colorHex={catColor} size="md" />
            <div>
              <h2 className="text-base font-semibold text-[#2D2226]">Create Custom Category</h2>
              <p className="text-xs text-[#7A656C]">
                Pick a stroke-consistent icon and soft pastel swatch.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label htmlFor="cat-name" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Category Name
              </label>
              <input
                id="cat-name"
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Specialty Coffee or Books"
                className="input-field"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-[#7A656C] mb-1.5">Type</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FFF9FA] border border-[#F9E4EA]">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCatType(t)}
                    className={`py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      catType === t ? 'bg-[#FCE7EC] text-[#2D2226]' : 'text-[#7A656C]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Icon Selection
              </span>
              <div className="grid grid-cols-6 gap-2">
                {SELECTABLE_ICON_NAMES.map((iconName) => {
                  const IconComp = ICON_REGISTRY[iconName];
                  const active = catIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCatIcon(iconName)}
                      aria-label={`Icon ${iconName}`}
                      className={`p-2 rounded-xl border flex items-center justify-center transition-colors ${
                        active
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

            <div>
              <span className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Pastel Swatch
              </span>
              <div className="flex flex-wrap gap-2.5">
                {PASTEL_SWATCHES.map((swatch) => {
                  const active = catColor === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setCatColor(swatch.hex)}
                      aria-label={`Color ${swatch.label}`}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${
                        active ? 'ring-2 ring-offset-2 ring-[#2D2226] scale-105' : ''
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {active && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </form>
        </div>

        {/* Category Directory */}
        <div className="lg:col-span-7 soft-card rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#2D2226]">Category Directory</h2>
            <p className="text-xs text-[#7A656C]">
              Expense and income categories mapped cleanly to vector icons.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-[#7A656C] mb-2">
                Expense Categories ({expenseCategories.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {expenseCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[#F9E4EA] bg-[#FFF9FA]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconBadge iconName={cat.icon_name} colorHex={cat.color_hex} size="sm" />
                      <span className="text-xs font-semibold text-[#2D2226] truncate">
                        {cat.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      aria-label={`Delete category ${cat.name}`}
                      className="p-1.5 rounded-lg text-[#7A656C] hover:text-[#D9536F] hover:bg-[#FDECEF] transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#F9E4EA]">
              <h3 className="text-xs font-semibold text-[#7A656C] mb-2">
                Income Categories ({incomeCategories.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {incomeCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[#F9E4EA] bg-[#FFF9FA]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconBadge iconName={cat.icon_name} colorHex={cat.color_hex} size="sm" />
                      <span className="text-xs font-semibold text-[#2D2226] truncate">
                        {cat.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      aria-label={`Delete category ${cat.name}`}
                      className="p-1.5 rounded-lg text-[#7A656C] hover:text-[#D9536F] hover:bg-[#FDECEF] transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Supabase Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="soft-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#FCE7EC] text-[#E87A90] inline-flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#2D2226]">Member Profile</h2>
              <p className="text-xs text-[#7A656C]">
                {currentUser.email} · Initials {currentUser.avatar_initials}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateProfile(fullNameInput);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              required
              value={fullNameInput}
              onChange={(e) => setFullNameInput(e.target.value)}
              aria-label="Full Name"
              className="input-field flex-1"
            />
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Update Name
            </button>
          </form>
        </div>

        <div className="soft-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#FCE7EC] text-[#E87A90] inline-flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#2D2226]">
                Database & Workspace Mode
              </h2>
              <p className="text-xs text-[#7A656C]">
                {isSupabaseConfigured
                  ? 'Connected to live Supabase PostgreSQL & Auth'
                  : 'Running in Interactive Local Demo Mode (persisted in browser storage)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenAuthSetup}
              className="px-4 py-2.5 rounded-xl bg-[#FCE7EC] hover:bg-[#F7D3DD] text-[#2D2226] text-xs font-semibold transition-colors"
            >
              {isSupabaseConfigured ? 'Manage Auth Session' : 'View Supabase Setup & Auth'}
            </button>

            {isSupabaseConfigured ? (
              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2.5 rounded-xl border border-[#F9E4EA] hover:bg-[#FFF9FA] text-[#7A656C] text-xs font-semibold transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetDemoData}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#F9E4EA] hover:bg-[#FFF9FA] text-[#7A656C] hover:text-[#2D2226] text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
