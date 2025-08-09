"use client";

import { CDPHooksProvider } from "@coinbase/cdp-hooks";
import { createProvider } from "puro";
import type { ReactNode } from "react";

const CDP_CONFIG = {
  projectId: process.env.PLASMO_PUBLIC_CDP_PROJECT_ID,
};

const APP_CONFIG = {
  name: "Wish",
};

const useWalletProvider = () => {
  return {
    config: CDP_CONFIG,
    app: APP_CONFIG,
  };
};

const { Provider, BaseContext } = createProvider(useWalletProvider);

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider = ({ children }: WalletContextProviderProps) => (
  <Provider>
    <CDPHooksProvider config={CDP_CONFIG}>
      {children}
    </CDPHooksProvider>
  </Provider>
);

export { BaseContext as WalletContext };