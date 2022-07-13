
# CandyMachine frontend with offchain whitelist (Firebase)

This is a simple solana candymachine minting dapp hooked up to firebase (external realtime db) to manage a custom and flexible whitelist. This was created to add flexibility to a whitelist over what gumdrop offers.
 
## Firebase setup

Setup account on https://firebase.google.com/

Go to the Console https://console.firebase.google.com/

Add a project

Get started by adding Firebase to your app -> Web

Register app

Add firebaseConfig to .env   
```
const firebaseConfig = {
  apiKey: "XXXXX",
  authDomain: "XXXXXX",
  projectId: "XXXXXXX",
  storageBucket: "XXXXXXX",
  messagingSenderId: "XXXXXXX",
  appId: "XXXXXXX"
};
```

```
REACT_APP_FIREBASE_API_KEY=XXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=XXXXXXXX
REACT_APP_FIREBASE_PROJECT_ID=XXXXXXXX
REACT_APP_FIREBASE_STORAGE_BUCKET=XXXXXXXX
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=XXXXXXXX
REACT_APP_FIREBASE_APP_ID=XXXXXXXX
```

Firestore db -> Createdb -> test mode



## Whitelist creation

Start a collection

Name your whitelist collection and copy this over to the .env

```
REACT_APP_FIREBASE_COLLECTION_NAME=Whitelist
```

Add a document for each space in the whitelist with the following data structure:

```
Auto-id: {
    "address": <ADDRESS TO BE ON THE WHITELIST>,
    "status":"notMinted"
}
```

The firestore database should look something like:

```
"Whitelist":{
    "HtgGgiw5SXkOi992GFz6":{
        "address": <ADDRESS TO BE ON THE WHITELIST>,
        "status":"notMinted"
    }
}
```
## Candy Machine

Add candymachine ID to .env

```
REACT_APP_CANDY_MACHINE_ID=XXXXX
```

## Installation

Install with yarn

```bash
  yarn 
  yarn start
```
    