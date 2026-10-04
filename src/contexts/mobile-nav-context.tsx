"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

interface MobileNavContextValue {
  /**
   * Whether the bottom navigation bar is hidden on mobile screens.
   * Useful when an active chat thread is opened to maximize vertical
   * space for messages and composer, matching native WhatsApp.
   */
  isBottomNavHidden: boolean;
  setBottomNavHidden: (hidden: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
  isBottomNavHidden: false,
  setBottomNavHidden: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isBottomNavHidden, setBottomNavHidden] = useState(false);

  const value = useMemo(
    () => ({ isBottomNavHidden, setBottomNavHidden }),
    [isBottomNavHidden]
  );

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
