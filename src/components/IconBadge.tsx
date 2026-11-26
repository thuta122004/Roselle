import React from 'react';
import {
  Utensils,
  Home,
  Car,
  ShoppingBag,
  HeartPulse,
  Sparkles,
  PiggyBank,
  Briefcase,
  Gift,
  Plane,
  Landmark,
  Wallet,
  CreditCard,
  TrendingUp,
  Coffee,
  BookOpen,
  Music,
  Shield,
  Smartphone,
  Leaf,
  Droplets,
  Sun,
  Umbrella,
  Tag,
  type LucideIcon,
} from 'lucide-react';

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Utensils,
  Home,
  Car,
  ShoppingBag,
  HeartPulse,
  Sparkles,
  PiggyBank,
  Briefcase,
  Gift,
  Plane,
  Landmark,
  Wallet,
  CreditCard,
  TrendingUp,
  Coffee,
  BookOpen,
  Music,
  Shield,
  Smartphone,
  Leaf,
  Droplets,
  Sun,
  Umbrella,
  Tag,
};

export const SELECTABLE_ICON_NAMES = [
  'Utensils',
  'Home',
  'Car',
  'ShoppingBag',
  'HeartPulse',
  'Sparkles',
  'PiggyBank',
  'Briefcase',
  'Gift',
  'Plane',
  'Landmark',
  'Wallet',
  'CreditCard',
  'TrendingUp',
  'Coffee',
  'BookOpen',
  'Music',
  'Shield',
  'Smartphone',
  'Leaf',
  'Droplets',
  'Sun',
  'Umbrella',
  'Tag',
] as const;

export const PASTEL_SWATCHES = [
  { label: 'Dusty Rose', hex: '#E87A90' },
  { label: 'Soft Sage', hex: '#3D8B74' },
  { label: 'Warm Amber', hex: '#D98A3C' },
  { label: 'Coral Rose', hex: '#D9536F' },
  { label: 'Mauve Plum', hex: '#9D6B84' },
  { label: 'Petal Blush', hex: '#D48A9E' },
  { label: 'Slate Mist', hex: '#6F8094' },
  { label: 'Terracotta Sand', hex: '#C67D63' },
] as const;

interface IconBadgeProps {
  iconName: string;
  colorHex?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  iconName,
  colorHex,
  size = 'md',
  className = '',
}) => {
  const IconComponent = ICON_REGISTRY[iconName] ?? Tag;

  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
        ? 'w-12 h-12 rounded-2xl'
        : 'w-10 h-10 rounded-xl';

  const iconSizes =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-[18px] h-[18px]';

  if (colorHex) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}
        style={{
          backgroundColor: `${colorHex}1F`,
          color: colorHex,
        }}
        aria-hidden="true"
      >
        <IconComponent className={iconSizes} strokeWidth={1.85} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 bg-[#FCE7EC] text-[#E87A90] ${sizeClasses} ${className}`}
      aria-hidden="true"
    >
      <IconComponent className={iconSizes} strokeWidth={1.85} />
    </span>
  );
};
