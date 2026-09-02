import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconHelperProps {
  name: string;
  className?: string;
}

export const IconHelper: React.FC<IconHelperProps> = ({ name, className = 'w-5 h-5' }) => {
  // Map icon strings to Lucide Icon components
  const icons: Record<string, React.ElementType> = {
    ShoppingBag: LucideIcons.ShoppingBag,
    HeartHandshake: LucideIcons.HeartHandshake,
    Stethoscope: LucideIcons.Stethoscope,
    Clock: LucideIcons.Clock,
    Users: LucideIcons.Users,
    Landmark: LucideIcons.Landmark,
    Building2: LucideIcons.Building2,
    FileText: LucideIcons.FileText,
    Pill: LucideIcons.Pill,
    CalendarCheck: LucideIcons.CalendarCheck,
    UserCheck: LucideIcons.UserCheck,
    Wrench: LucideIcons.Wrench,
    Sparkles: LucideIcons.Sparkles,
    Shield: LucideIcons.Shield,
    Phone: LucideIcons.Phone,
    MapPin: LucideIcons.MapPin
  };

  const Component = icons[name] || LucideIcons.Sparkles;
  return <Component className={className} />;
};
