"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  PenLine,
  Video,
  Gavel,
  Users,
  DollarSign,
  Package,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
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
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
          <span className="text-xs font-bold text-primary">J</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">JIP</p>
          <p className="truncate text-[10px] text-muted-foreground">Intelligence Platform</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
                    active
                      ? "bg-primary/15 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
