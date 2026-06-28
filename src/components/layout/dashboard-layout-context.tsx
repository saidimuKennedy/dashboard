"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

type DashboardLayoutContextValue = {
  isDesktop: boolean;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function DashboardLayoutProvider({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInitialized, setAiInitialized] = useState(false);

  useEffect(() => {
    if (aiInitialized) return;
    setAiPanelOpen(isDesktop);
    setAiInitialized(true);
  }, [aiInitialized, isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
      setMobileNavOpen(false);
      setAiPanelOpen(false);
      return;
    }
    setAiPanelOpen(true);
  }, [isDesktop]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen || (!isDesktop && aiPanelOpen) ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aiPanelOpen, isDesktop, mobileNavOpen]);

  const value = useMemo(
    () => ({
      isDesktop,
      mobileNavOpen,
      setMobileNavOpen,
      aiPanelOpen,
      setAiPanelOpen,
      toggleAiPanel: () => setAiPanelOpen((current) => !current),
    }),
    [aiPanelOpen, isDesktop, mobileNavOpen]
  );

  return (
    <DashboardLayoutContext.Provider value={value}>{children}</DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
  }
  return context;
}
