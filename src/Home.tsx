import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import {
    Transaction,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Snackbar, Paper, Container, Portal } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { AlertState } from './utils';
import { MintButton } from './MintButton';
import {
    awaitTransactionSignatureConfirmation,
    CandyMachineAccount,
    getCandyMachineState,
    mintOneToken,
} from "./candy-machine";
import "@fortawesome/fontawesome-free/js/all.js";
import "./home.css";
import { FirebaseApp } from "firebase/app";
import { collection, doc, DocumentData, getDocs, getFirestore, query, setDoc, where } from "firebase/firestore/lite";

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: right;
`;

const WalletAmount = styled.div`
  color: black;
  width: auto;
  padding: 5px 5px 5px 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 22px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap: 10px;
`;

const Wallet = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
`;

const ConnectButton = styled(WalletMultiButton)`
  border-radius: 18px !important;
  padding: 6px 16px;
  background-color: #4E44CE;
  margin: 0 auto;
`;


const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 4%;
  margin-left: 4%;
  text-align: center;
  justify-content: center;
`;


export interface HomeProps {
    candyMachineId?: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    txTimeout: number;
    rpcHost: string;
    network: WalletAdapterNetwork;
    firebaseApp: FirebaseApp;
    firebaseCollectionName:string | undefined;
}

const Home = (props: HomeProps) => {
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });


    const wallet = useWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();

    const solFeesEstimation = 0.012; // approx of account creation fees

    const anchorWallet = useMemo(() => {
        if (
            !wallet ||
            !wallet.publicKey ||
            !wallet.signAllTransactions ||
            !wallet.signTransaction
        ) {
            return;
        }

        return {
            publicKey: wallet.publicKey,
            signAllTransactions: wallet.signAllTransactions,
            signTransaction: wallet.signTransaction,
        } as anchor.Wallet;
    }, [wallet]);


    function throwConfetti(): void {
        confetti({
            particleCount: 400,
            spread: 70,
            origin: { y: 0.6 },
        });
    }


    async function getFirebaseWL(): Promise<DocumentData | undefined> {
        if (!props.firebaseCollectionName) {
            return
        }
        const db = getFirestore(props.firebaseApp);
        const WL = collection(db, props.firebaseCollectionName);
        const q = query(WL, where("address", "==", wallet.publicKey?.toString()));
        const querySnapshot = await getDocs(q);
        let data = {}
        querySnapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            // console.log(doc.id, " => ", doc.data());
            if (doc.data().status !== "minted") {
                // console.log("found available doc");
                data = doc
            }
        });
        return data
    }

    async function updateFirebaseMintingStatus(wl: DocumentData, status: string): Promise<void> {
        if (!props.firebaseCollectionName) {
            throw new Error("no firebase whitelist collection name")
        }
        const db = getFirestore(props.firebaseApp);
        const cityRef = doc(db, props.firebaseCollectionName, wl.id);
        await setDoc(cityRef, { status: status }, { merge: true });
    }

    async function updateFirebaseTxIdMetadata(wl: DocumentData, id: string, metadataKey: string): Promise<void> {
         if (!props.firebaseCollectionName) {
            throw new Error("no firebase whitelist collection name")
        }
        const db = getFirestore(props.firebaseApp);
        const cityRef = doc(db, props.firebaseCollectionName, wl.id);
        await setDoc(cityRef, { txId: id, metadataKey: metadataKey }, { merge: true });
    }

    const refreshCandyMachineState = async () => {
        if (!anchorWallet) {
            return;
        }

        if (!props.candyMachineId) {
            return
        }
        const candyMachineId = new anchor.web3.PublicKey(
            props.candyMachineId
        );

        const candyMachine = await getCandyMachineState(
            anchorWallet!,
            candyMachineId,
            props.connection,
        );

        console.log(candyMachine)
        setCandyMachine(candyMachine);
    }

    useEffect(() => {
        refreshCandyMachineState()
        // eslint-disable-next-line
    }, [props.connection, anchorWallet, props.candyMachineId]);


    const onMint = async (
        beforeTransactions: Transaction[] = [],
        afterTransactions: Transaction[] = [],
    ) => {
        const firebaseWL = await getFirebaseWL()
        if (!firebaseWL) {
            return
        }
        try {
            if (!anchorWallet) {
                return;
            }
            if (wallet.connected && candyMachine?.program && wallet.publicKey) {
                
                if (!firebaseWL.id) {
                    setAlertState({
                        open: true,
                        message: 'Mint failed! You are not on the whitelist!',
                        severity: 'error',
                        hideDuration: 8000,
                    });
                    return
                }

                const balance = await props.connection.getBalance(anchorWallet!.publicKey);

                if ((balance / LAMPORTS_PER_SOL) < solFeesEstimation) {
                    setAlertState({
                        open: true,
                        message: 'Insufficient funds to cover gas and fees!',
                        severity: 'error',
                        hideDuration: 4000,
                    });
                    return
                }

                let status: any = { err: true };
                let metadataStatus = null;
                let mintResult = null;
                setIsMinting(true);
                if (firebaseWL.data().status === "minting") {
                    setAlertState({
                        open: true,
                        message: 'Something went wrong with your mint, please contact me in the discord!',
                        severity: 'error',
                        hideDuration: 8000,
                    });
                    return
                }
                 else {
                    await updateFirebaseMintingStatus(firebaseWL, "minting")
                    
                    const mint = anchor.web3.Keypair.generate();
                    mintResult = await mintOneToken(
                        candyMachine,
                        wallet.publicKey,
                        mint,
                        beforeTransactions,
                        afterTransactions,
                        // setupState,
                    );
                }
                
                if (mintResult) {
                    // Update firebase with txId
                    await updateFirebaseTxIdMetadata(firebaseWL, mintResult.mintTxId, mintResult.metadataKey.toString())

                    status = await awaitTransactionSignatureConfirmation(
                        mintResult.mintTxId,
                        props.txTimeout,
                        props.connection,
                        true,
                    );

                    metadataStatus =
                        await candyMachine.program.provider.connection.getAccountInfo(
                            mintResult.metadataKey,
                            'processed',
                        );
                    console.log('Metadata status: ', !!metadataStatus);
                }

                if (status && !status.err && metadataStatus) {
                    await updateFirebaseMintingStatus(firebaseWL, "minted")
                    setAlertState({
                        open: true,
                        message: 'Congratulations! Mint succeeded!',
                        severity: 'success',
                    });

                    throwConfetti();
                } else if (status && !status.err) {
                    // Check what happened and update firebase

                    setAlertState({
                        open: true,
                        message:
                            'Mint likely failed! Anti-bot SOL 0.01 fee potentially charged! Check the explorer to confirm the mint failed and if so, make sure you are eligible to mint before trying again.',
                        severity: 'error',
                        hideDuration: 8000,
                    });
                } else {
                    await updateFirebaseMintingStatus(firebaseWL, "notMinted")
                    setAlertState({
                        open: true,
                        message: 'Mint failed! Please try again!',
                        severity: 'error',
                    });
                }
            }
        } catch (error: any) {
            let message = error.msg || 'Minting failed! Please try again!';
            if (!error.msg) {
                if (!error.message) {
                    message = 'Transaction Timeout! Please try again.';
                } else if (error.message.indexOf('0x138')) {
                } else if (error.message.indexOf('0x137')) {
                    await updateFirebaseMintingStatus(firebaseWL, "notMinted")
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf('0x135')) {
                    await updateFirebaseMintingStatus(firebaseWL, "notMinted")
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    await updateFirebaseMintingStatus(firebaseWL, "notMinted")
                    message = `SOLD OUT!`;
                } else if (error.code === 312) {
                    await updateFirebaseMintingStatus(firebaseWL, "notMinted")
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            setIsMinting(false);
        }
    };

    return (
        <main>
            <MainContainer>
                <WalletContainer>
                    <Wallet>
                        {wallet ?
                            <WalletAmount><ConnectButton /></WalletAmount> :
                            <ConnectButton>Connect Wallet</ConnectButton>}
                    </Wallet>
                </WalletContainer>


                <Container maxWidth="sm" style={{ marginTop: 15 }}>
                    <Paper
                        style={{ padding: 16, backgroundColor: "#151A1F", borderRadius: 6, paddingTop: 0 }}
                    >
                        <MintButton
                                            candyMachine={candyMachine}
                                            isMinting={isMinting}
                                            isActive={true}
                                            isEnded={false}
                                            isSoldOut={false}
                                            onMint={onMint}
                                        />
                    </Paper>
                </Container>

            </MainContainer>
            <Portal>
                <Snackbar
                    open={alertState.open}
                    autoHideDuration={6000}
                    onClose={() => setAlertState({ ...alertState, open: false })}
                >
                    <Alert
                        onClose={() => setAlertState({ ...alertState, open: false })}
                        severity={alertState.severity}
                    >
                        {alertState.message}
                    </Alert>
                </Snackbar>
            </Portal>
        </main>
    );
};

export default Home;
