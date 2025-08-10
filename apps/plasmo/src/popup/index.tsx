/**
 * Main popup entry point for the browser extension.
 * 
 * This component serves as the root of the extension popup UI,
 * providing wallet context and rendering the main interface.
 */

import "../app/globals.css";
import { Main } from "@/components/main";
import { WalletContextProvider } from "@/contexts/wallet-context";

/**
 * IndexPopup component - Root popup component
 * 
 * Wraps the main interface with necessary context providers
 * for wallet functionality and user authentication.
 * 
 * @returns JSX.Element - The main popup interface
 */
function IndexPopup(): JSX.Element {
  return (
    <WalletContextProvider>
      <Main />
    </WalletContextProvider>
  );
}

export default IndexPopup;
