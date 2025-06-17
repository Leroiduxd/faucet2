import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://brokex.trade',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

const RPC_URL = 'https://api.zan.top/node/v1/pharos/testnet/c6239098ec02412fbe1126bf461cd2d6';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY non définie dans le fichier .env");
  process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Map pour stocker les timestamps des envois
const sentTimestamps = new Map();
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h en ms

app.post('/send', async (req, res) => {
  const { address } = req.body;

  if (!ethers.utils.isAddress(address)) {
    return res.status(400).json({ error: 'Adresse invalide' });
  }

  const lastSent = sentTimestamps.get(address);
  const now = Date.now();

  if (lastSent && (now - lastSent < TIME_WINDOW_MS)) {
    return res.status(429).json({
      error: 'Cette adresse a déjà reçu des fonds il y a moins de 24h'
    });
  }

  try {
    console.log("🔁 Envoi de 0.1 PHR à :", address);

    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.utils.parseUnits('0.1', 'ether'),
      gasLimit: 21000,
      gasPrice: ethers.utils.parseUnits('1', 'gwei')
    });

    console.log("✅ TX envoyée :", tx.hash);

    sentTimestamps.set(address, now);

    res.json({
      success: true,
      txHash: tx.hash
    });

  } catch (error) {
    console.error('❌ Erreur :', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Faucet Pharos actif sur le port ${port}`);
});
