import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URLS.split(',')[0].trim();

const provider = new ethers.JsonRpcProvider(
  RPC_URL,
  4663,
  { staticNetwork: true }
);

const WALLET = '0x92B96A1773FcCec394B25B3E712cF62Fd063512d'.toLowerCase();

const ERC721_TRANSFER =
  ethers.id('Transfer(address,address,uint256)');

const ERC1155_SINGLE =
  ethers.id('TransferSingle(address,address,address,uint256,uint256)');

const ERC1155_BATCH =
  ethers.id('TransferBatch(address,address,address,uint256[],uint256[])');

const ZERO =
  '0x0000000000000000000000000000000000000000';

const ZERO_TOPIC =
  ethers.zeroPadValue(ZERO, 32);

const WALLET_TOPIC =
  ethers.zeroPadValue(WALLET, 32);

async function main() {
  console.log('=== BROAD NFT MINT TEST ===');
  console.log(`Wallet: ${WALLET}`);
  console.log(`Chain: 4663`);

  const latest = await provider.getBlockNumber();

  // Last 200,000 blocks
  const fromBlock = latest - 200000;
  const CHUNK = 1000;

  console.log(`Current block: ${latest}`);
  console.log(`Scanning: ${fromBlock} -> ${latest}`);
  console.log('');

  let matches = [];

  for (let start = fromBlock; start <= latest; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, latest);

    process.stdout.write(`${start} -> ${end} ... `);

    try {
      // ERC-721: zero address -> wallet
      const erc721 = await provider.getLogs({
        fromBlock: start,
        toBlock: end,
        topics: [
          ERC721_TRANSFER,
          ZERO_TOPIC,
          WALLET_TOPIC
        ]
      });

      // ERC-1155 TransferSingle: wallet recipient
      const erc1155Single = await provider.getLogs({
        fromBlock: start,
        toBlock: end,
        topics: [
          ERC1155_SINGLE,
          null,
          ZERO_TOPIC,
          WALLET_TOPIC
        ]
      });

      // ERC-1155 TransferBatch: wallet recipient
      const erc1155Batch = await provider.getLogs({
        fromBlock: start,
        toBlock: end,
        topics: [
          ERC1155_BATCH,
          null,
          ZERO_TOPIC,
          WALLET_TOPIC
        ]
      });

      const total =
        erc721.length +
        erc1155Single.length +
        erc1155Batch.length;

      console.log(
        `${total} match(es)`
      );

      for (const log of erc721) {
        matches.push({
          type: 'ERC-721',
          contract: log.address,
          tx: log.transactionHash,
          block: log.blockNumber
        });
      }

      for (const log of erc1155Single) {
        matches.push({
          type: 'ERC-1155 Single',
          contract: log.address,
          tx: log.transactionHash,
          block: log.blockNumber
        });
      }

      for (const log of erc1155Batch) {
        matches.push({
          type: 'ERC-1155 Batch',
          contract: log.address,
          tx: log.transactionHash,
          block: log.blockNumber
        });
      }

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  console.log('');
  console.log('======================================');
  console.log('RESULT');
  console.log('======================================');

  if (!matches.length) {
    console.log('No NFT mint events found for this wallet.');
    return;
  }

  console.log(`Found ${matches.length} NFT mint event(s)!`);

  for (const item of matches.slice(-20)) {
    console.log('');
    console.log(`Type:     ${item.type}`);
    console.log(`Contract: ${item.contract}`);
    console.log(`TX:       ${item.tx}`);
    console.log(`Block:    ${item.block}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});