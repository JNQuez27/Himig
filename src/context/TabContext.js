import React, { createContext, useContext, useState } from 'react';

// Which bottom-nav tab is active. Lifted out of MainScreen so the nav can live
// as a persistent overlay above the whole stack (visible on Detail/Artist too).
const TabContext = createContext(null);
export const useTab = () => useContext(TabContext);

export function TabProvider({ children }) {
  const [tab, setTab] = useState('home');
  return <TabContext.Provider value={{ tab, setTab }}>{children}</TabContext.Provider>;
}
