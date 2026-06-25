"use client";
import React, { createContext, useContext, useState } from "react";

interface TutorialContextType {
  runTutorial: boolean;
  startTutorial: () => void;
  stopTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  runTutorial: false,
  startTutorial: () => {},
  stopTutorial: () => {},
});

export const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
  const [runTutorial, setRunTutorial] = useState(false);

  const startTutorial = () => setRunTutorial(true);
  const stopTutorial = () => setRunTutorial(false);

  return (
    <TutorialContext.Provider value={{ runTutorial, startTutorial, stopTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => useContext(TutorialContext);
