import { useState } from "react";


import {
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

import {
  Contract,
  TransactionBuilder,
  rpc,
  Address,
  nativeToScVal,
  StrKey,
} from "@stellar/stellar-sdk";

import {
  CONTRACT_ID,
  RPC_URL,
  NETWORK_PASSPHRASE,
} from "./config";

type SimulationWithResult = {
  result?: {
    retval?: {
      value?: () => unknown[];
    };
  };
};

function getSimulationValues(
  simulation: unknown
): unknown[] | null {
  const sim = simulation as SimulationWithResult;

  if (
    sim.result?.retval &&
    typeof sim.result.retval === "object" &&
    "value" in sim.result.retval &&
    typeof sim.result.retval.value === "function"
  ) {
    return sim.result.retval.value();
  }

  return null;
}

function App() {
  console.log("App Render");

  const [wallet, setWallet] = useState("");
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
 const [details, setDetails] = useState<{
  sender: string;
  receiver: string;
  amount: string;
  status: string;
} | null>(null);

const [txStatus, setTxStatus] = useState("");

  // ----------------------------
  // Connect Wallet 
  // ----------------------------

  const connectWallet = async () => {
    try {
      const result = await requestAccess();

      if ("address" in result && result.address) {
        setWallet(result.address);
      }
    } catch (err) {
      console.error(err);
      alert("Wallet connection failed");
    }
  };

  // ----------------------------
  // Get Escrow Details
  // ----------------------------

  const getEscrow = async () => {
    try {
      if (!wallet) {
        alert("Connect wallet first");
        return;
      }

     setDetails(null);

      const server = new rpc.Server(RPC_URL);

      const account = await server.getAccount(wallet);

      const contract = new Contract(CONTRACT_ID);

      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("get_details"))
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);

      const simulation =
        await server.simulateTransaction(prepared);

      console.log("Simulation:", simulation);

      const values = getSimulationValues(simulation);

      if (!values) {
        alert("No escrow found.");
setDetails(null);
        return;
      }

      console.log("Decoded Values:", values);

  let sender = "";
let receiverAddress = "";
let escrowAmount = "";
let status = "";

values.forEach((v, i) => {
  const arm =
    typeof (v as { arm?: () => string }).arm === "function"
      ? (v as { arm: () => string }).arm()
      : "unknown";

  if (arm === "address") {
    const bytes = (
      v as {
        value: () => {
          value: () => {
            value: () => Uint8Array;
          };
        };
      }
    )
      .value()
      .value()
      .value();

    const address = StrKey.encodeEd25519PublicKey(bytes);

    if (i === 0) sender = address;
    if (i === 1) receiverAddress = address;
  }

  if (arm === "i128") {
    const val = (
      v as {
        value: () => {
          hi: () => { toBigInt: () => bigint };
          lo: () => { toBigInt: () => bigint };
        };
      }
    ).value();

    escrowAmount = val.lo().toBigInt().toString();
  }

  if (arm === "sym") {
    const bytes = (
      v as {
        value: () => Uint8Array;
      }
    ).value();

    status = new TextDecoder().decode(bytes);
  }
});

setDetails({
  sender,
  receiver: receiverAddress,
  amount: escrowAmount,
  status,
});

    } catch (err) {
      console.error(err);
      alert("Failed to fetch escrow.");
setDetails(null);
    }
  };

  // ----------------------------
  // Create Escrow
  // ----------------------------

  const lockFunds = async () => {
        console.log("Receiver value:", receiver);
    console.log("Amount value:", amount);

    setTxStatus("⏳ Waiting for wallet confirmation...");

    try {
      if (!wallet) {
        alert("Connect wallet first");
        return;
      }

      if (receiver.trim() === "") {
        alert("Enter receiver address");
        return;
      }

      if (amount.trim() === "") {
        alert("Enter amount");
        return;
      }

      console.log({
        wallet,
        receiver,
        amount,
      });


      const server = new rpc.Server(RPC_URL);

      const account = await server.getAccount(wallet);

      const contract = new Contract(CONTRACT_ID);

      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "create_escrow",
            new Address(wallet).toScVal(),
            new Address(receiver).toScVal(),
            nativeToScVal(Number(amount), {
              type: "i128",
            })
          )
        )
        .setTimeout(30)
        .build();

      const prepared =
        await server.prepareTransaction(tx);

      const signed =
        await signTransaction(prepared.toXDR(), {
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        setTxStatus("📤 Transaction Submitted...");

      const finalTx =
        TransactionBuilder.fromXDR(
          signed.signedTxXdr,
          NETWORK_PASSPHRASE
        );

      const response =
        await server.sendTransaction(finalTx);
        setTxStatus("⌛ Transaction Pending...");

      console.log("SEND RESPONSE:", response);

      if (response.status === "PENDING") {
        const txResponse =
          await server.pollTransaction(
            response.hash
          );

        console.log(
          "FINAL RESPONSE:",
          txResponse
        );

        if (txResponse.status === "SUCCESS") {
          alert("Escrow Created ✅");
          setTxStatus("✅ Escrow Created Successfully!");
        } else {
          console.error(txResponse);
          alert("Transaction Failed");
        }
      } else {
        setTxStatus("❌ Transaction Failed");
        console.error(response);
        alert("Send Failed");
      }
    } catch (err) {
      setTxStatus("❌ Transaction Failed");
      console.error(err);
      alert("Transaction Failed");
    }
  }; 
    return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-[450px] bg-slate-800 rounded-xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-cyan-400">
          Stellar Escrow 🚀
        </h1>

        <p className="text-gray-400 mt-2 text-sm">
          Our first Stellar dApp is officially live!
        </p>

        <button
          onClick={connectWallet}
          className="w-full mt-6 bg-green-500 hover:bg-green-600 py-3 rounded-xl text-white font-bold transition"
        >
          {wallet ? "Wallet Connected ✅" : "Connect Wallet"}
        </button>

        {wallet && (
          <p className="text-white text-xs mt-3 break-all">
            {wallet}
          </p>
        )}

        <input
          type="text"
          placeholder="Receiver Wallet Address"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          className="w-full mt-6 p-3 rounded text-black"
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mt-4 p-3 rounded text-black"
        />

        <button
          onClick={lockFunds}
          className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 py-3 rounded-xl text-white font-bold transition"
        >
          🔒 Lock Funds
        </button>

        <button
          onClick={getEscrow}
          className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 py-3 rounded-xl text-white font-bold transition"
        >
          📄 Get Escrow Details
        </button>

        {txStatus && (
  <div className="mt-4 bg-slate-700 rounded-lg p-4">
    <h2 className="text-white font-bold">
      Transaction Status
    </h2>

    <p className="text-cyan-300 mt-2">
      {txStatus}
    </p>
  </div>
)}

        {details && (
          <div className="mt-6 bg-slate-700 rounded-lg p-4">
            <h2 className="text-white font-bold mb-2">
              Escrow Details
            </h2>
<div className="text-white text-sm space-y-3">

  <div>
    <strong>Sender:</strong>
    <p className="break-all text-cyan-300">
      {details.sender}
    </p>
  </div>

  <div>
    <strong>Receiver:</strong>
    <p className="break-all text-cyan-300">
      {details.receiver}
    </p>
  </div>

  <div>
    <strong>Amount:</strong>
    <p className="text-yellow-300">
      {details.amount} XLM
    </p>
  </div>

  <div>
    <strong>Status:</strong>
    <p className="text-green-400 font-bold">
      {details.status}
    </p>
  </div>

</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;