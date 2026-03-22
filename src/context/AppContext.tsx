import React, { createContext, useContext, useState, useEffect } from 'react';

// Status types
export type Tier1Status = 'Pending' | 'Verified: Token Issued' | 'Not Verified' | 'Pending Scan';
export type Tier2Status = 'Waiting for Final Clearance' | 'Clearance Granted' | 'Danger: Do Not Enter';

interface AppContextType {
  // Tier 1 Shared State
  tier1Status: Tier1Status;
  setTier1Status: (status: Tier1Status) => void;
  
  // Tier 2 Shared State
  tier2Status: Tier2Status;
  setTier2Status: (status: Tier2Status) => void;
  
  // Clearance Protocol Notification
  showClearanceProtocol: boolean;
  setShowClearanceProtocol: (show: boolean) => void;
}

const AppContext = createContext<AppContextType>({
  tier1Status: 'Pending',
  setTier1Status: () => {},
  tier2Status: 'Waiting for Final Clearance',
  setTier2Status: () => {},
  showClearanceProtocol: false,
  setShowClearanceProtocol: () => {},
});

export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier1Status, setTier1Status] = useState<Tier1Status>('Pending');
  const [tier2Status, setTier2Status] = useState<Tier2Status>('Waiting for Final Clearance');
  const [showClearanceProtocol, setShowClearanceProtocol] = useState(false);

  // When Tier 2 status is granted, trigger the clearance protocol popup
  useEffect(() => {
    if (tier2Status === 'Clearance Granted') {
      setShowClearanceProtocol(true);
    }
  }, [tier2Status]);

  return (
    <AppContext.Provider value={{
      tier1Status, setTier1Status,
      tier2Status, setTier2Status,
      showClearanceProtocol, setShowClearanceProtocol
    }}>
      {children}
    </AppContext.Provider>
  );
};
