import { createContext, useState } from "react";
import React from "react";

export const DataConext = createContext();

export const ContextProvider = ({ children }) => {
  const [auth, setData] = useState({
    isAuthenticated: false,
    user: null,
  });

  return (
    <DataConext.Provider value={{ auth, setData }}>
      {children}
    </DataConext.Provider>
  );
};
