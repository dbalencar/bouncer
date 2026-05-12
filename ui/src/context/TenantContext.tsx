import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Tenant } from '../types';

interface TenantContextType {
  selectedTenant: Tenant | null;
  setTenant: (tenant: Tenant) => void;
  clearTenant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const setTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
  };

  const clearTenant = () => {
    setSelectedTenant(null);
  };

  return (
    <TenantContext.Provider value={{ selectedTenant, setTenant, clearTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
