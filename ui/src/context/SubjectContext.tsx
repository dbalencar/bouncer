import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Subject } from '../types';
import { setApiActor } from '../services/api';

interface SubjectContextType {
  selectedSubject: Subject | null;
  setSubject: (subject: Subject) => void;
  clearSubject: () => void;
}

const SubjectContext = createContext<SubjectContextType | undefined>(undefined);

export const SubjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const setSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setApiActor(subject.uid);
  };

  const clearSubject = () => {
    setSelectedSubject(null);
    setApiActor(null);
  };

  return (
    <SubjectContext.Provider value={{ selectedSubject, setSubject, clearSubject }}>
      {children}
    </SubjectContext.Provider>
  );
};

export const useSubject = () => {
  const context = useContext(SubjectContext);
  if (context === undefined) {
    throw new Error('useSubject must be used within a SubjectProvider');
  }
  return context;
};
