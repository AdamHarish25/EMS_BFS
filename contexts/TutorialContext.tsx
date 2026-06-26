"use client";
import React, { createContext, useContext, useState } from "react";

interface TutorialContextType {
  runTutorial: boolean;
  isMultiPage: boolean;
  startTutorial: () => void;
  stopTutorial: () => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  runTutorial: false,
  isMultiPage: false,
  startTutorial: () => {},
  stopTutorial: () => {},
  pauseTutorial: () => {},
  resumeTutorial: () => {},
});

export const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
  const [runTutorial, setRunTutorial] = useState(false);
  const [isMultiPage, setIsMultiPage] = useState(false);

  const startTutorial = () => {
    setIsMultiPage(true);
    setRunTutorial(true);
  };
  const stopTutorial = () => {
    setIsMultiPage(false);
    setRunTutorial(false);
  };
  const pauseTutorial = () => {
    setRunTutorial(false);
  };
  const resumeTutorial = () => {
    setRunTutorial(true);
  };

  return (
    <TutorialContext.Provider value={{ runTutorial, isMultiPage, startTutorial, stopTutorial, pauseTutorial, resumeTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => useContext(TutorialContext);
