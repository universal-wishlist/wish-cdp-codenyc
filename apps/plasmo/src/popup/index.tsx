import "../app/globals.css";
import { Main } from "@/components/main";
import { WalletContextProvider } from "@/contexts/wallet-context";

function IndexPopup() {
  return (
    <WalletContextProvider>
        <Main />
    </WalletContextProvider>
  );
}

export default IndexPopup;
