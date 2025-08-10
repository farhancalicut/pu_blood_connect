// app/context/MenuContext.tsx

import React, { createContext, useContext } from 'react';

// Define the shape of the context data
interface MenuContextType {
  toggleMenu: () => void;
}

// Create the context with a default value
const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Create a custom hook for easy access to the context
export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

export default MenuContext;