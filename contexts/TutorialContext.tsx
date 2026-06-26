"use client";
import React, { createContext, useContext, useState } from "react";

export type TutorialStatus = 'idle' | 'running' | 'paused';

interface TutorialContextType {
  status: TutorialStatus;
  startTutorial: () => void;
  stopTutorial: () => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  status: 'idle',
  startTutorial: () => {},
  stopTutorial: () => {},
  pauseTutorial: () => {},
  resumeTutorial: () => {},
});

export const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<TutorialStatus>('idle');

  const startTutorial = () => setStatus('running');
  const stopTutorial = () => setStatus('idle');
  const pauseTutorial = () => setStatus('paused');
  const resumeTutorial = () => setStatus('running');

  return (
    <TutorialContext.Provider value={{ status, startTutorial, stopTutorial, pauseTutorial, resumeTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => useContext(TutorialContext);
