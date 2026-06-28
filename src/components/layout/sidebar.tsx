"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";

function SidebarBrand() {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-border px-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
        <span className="text-xs font-bold text-primary">J</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">JIP</p>
        <p className="truncate text-[10px] text-muted-foreground">Intelligence Platform</p>
      </div>
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto p-2">
      <ul className="space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm transition-colors duration-150",
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
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-label="Close navigation menu"
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,16rem)] flex-col border-r border-border bg-card shadow-2xl lg:hidden">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
              <span className="text-xs font-bold text-primary">J</span>
            </div>
            <p className="text-sm font-semibold">Menu</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarNav onNavigate={onClose} />
      </aside>
    </>
  );
}
