import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  DollarSign,
  FlaskConical,
  Gavel,
  LayoutDashboard,
  Package,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/journal", label: "Journal", icon: PenLine },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/decisions", label: "Decisions", icon: Gavel },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/products", label: "Products", icon: Package },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/risks", label: "Risks", icon: AlertTriangle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai", label: "AI Hub", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];
