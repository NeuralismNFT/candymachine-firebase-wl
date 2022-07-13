import { createTheme, ThemeProvider } from "@material-ui/core";
import { useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
    getPhantomWallet,
    getSlopeWallet,
    getSolflareWallet,
    getSolflareWebWallet,
    getSolletWallet,
    getSolletExtensionWallet,
    getSolongWallet,
    getLedgerWallet,
    getSafePalWallet,
} from "@solana/wallet-adapter-wallets";

import {
    WalletModalProvider
} from '@solana/wallet-adapter-react-ui';

import "./App.css";
import { DEFAULT_TIMEOUT } from './connection';
import Home from "./Home";
import { FirebaseOptions, initializeApp } from "firebase/app";

require('@solana/wallet-adapter-react-ui/styles.css');

declare global {
    interface Window { FIREBASE_APPCHECK_DEBUG_TOKEN: any; }
}

const WLCollectionName = process.env.REACT_APP_FIREBASE_COLLECTION_NAME

const getFirebaseConfig = (): FirebaseOptions => {
    return {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY!,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
    }
  }

const getCandyMachineId = (): anchor.web3.PublicKey | undefined => {
    try {
        const candyMachineId = new anchor.web3.PublicKey(
            process.env.REACT_APP_CANDY_MACHINE_ID!,
        );

        return candyMachineId;
    } catch (e) {
        console.log('Failed to construct CandyMachineId', e);
        return undefined;
    }
};

const candyMachineId = getCandyMachineId();

const network = process.env.REACT_APP_SOLANA_NETWORK as WalletAdapterNetwork;

const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST!;
const connection = new anchor.web3.Connection(
    rpcHost ? rpcHost : anchor.web3.clusterApiUrl('devnet'),
);

const theme = createTheme({
    palette: {
        type: 'dark',
    },
    overrides: {
        MuiButtonBase: {
            root: {
                justifyContent: 'flex-start',
            },
        },
        MuiButton: {
            root: {
                textTransform: undefined,
                padding: '12px 16px',
            },
            startIcon: {
                marginRight: 8,
            },
            endIcon: {
                marginLeft: 8,
            },
        },
    },
});

const app = initializeApp(getFirebaseConfig());

const App = () => {
    // Custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), []);

    const wallets = useMemo(
        () => [
            getPhantomWallet(),
            getSlopeWallet(),
            getSolflareWallet(),
            getSolflareWebWallet(),
            getSolletWallet({ network }),
            getSolletExtensionWallet({ network }),
            getSolongWallet(),
            getLedgerWallet(),
            getSafePalWallet(),
        ],
        []
    );

  return (
      <ThemeProvider theme={theme}>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect={true}>
            <WalletModalProvider>
              <Home
                candyMachineId={candyMachineId}
                connection={connection}
                txTimeout={DEFAULT_TIMEOUT}
                rpcHost={rpcHost}
                network={network}
                firebaseApp={app}
                firebaseCollectionName={WLCollectionName}
              />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </ThemeProvider>
  );
};

export default App;
