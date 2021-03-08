import IPFS from '../ipfs-mini';
import { IPFSRoot } from './interfaces';
import Hash from 'ipfs-only-hash';
import BigNumber from 'bignumber.js';

// Used for creating & uploading a tree
export class LocalIPFSSearchTree {
  ipfs: any;
  keyValueMap: any; // maps string to object
  metadata: any;
  slices: number;

  constructor(ipfsEndpoint: string, data: any, metadata: any, slices: number) {
    this.ipfs = new IPFS({ host: ipfsEndpoint, port: 5001, protocol: 'https', base: '/ipfs/api/v0' });
    this.keyValueMap = data;
    this.metadata = metadata;
    this.slices = slices;
  }

  async uploadData(): Promise<string> {
    // sort data keys
    const sortedKeys = Object.keys(this.keyValueMap).sort((a, b) => {
      const aNum = new BigNumber(a.substr(2).toLowerCase(), 16);
      const bNum = new BigNumber(b.substr(2).toLowerCase(), 16);
      if (aNum.eq(bNum)) {
        return 0;
      }
      return aNum.lt(bNum) ? -1 : 1;
    });
    const N = sortedKeys.length;

    // divide data using pivots
    const pivots = [];
    const dataBins = [];
    const sliceLength = Math.floor(N / this.slices);
    for (let i = 1; i <= this.slices; i++) {
      const pivotIdx = i * sliceLength - 1;
      const pivot = sortedKeys[pivotIdx];
      pivots.push(pivot);

      const bin = {}
      const binStartIdx = (i - 1) * sliceLength;
      for (let j = binStartIdx; j <= pivotIdx; j++) {
        const key = sortedKeys[j];
        const value = this.keyValueMap[key];
        bin[key] = value;
      }
      dataBins.push(bin);
    }
    const leftoverLength = N - this.slices * sliceLength;
    if (leftoverLength > 0) {
      // put leftover entries in an additional bin
      // using the last key as pivot
      pivots.push(sortedKeys[N - 1]);

      const bin = {}
      const binStartIdx = this.slices * sliceLength;
      for (let j = binStartIdx; j <= N - 1; j++) {
        const key = sortedKeys[j];
        const value = this.keyValueMap[key];
        bin[key] = value;
      }
      dataBins.push(bin);
    }

    // upload binned data
    const binIPFSHashes = await Promise.all(dataBins.map(async (value) => {
      const hash = await this.uploadObjectToIPFS(value);
      return hash;
    }));

    // construct root file
    const rootFile: IPFSRoot = {
      metadata: this.metadata,
      pivots,
      bins: binIPFSHashes
    };

    // upload root file
    const rootHash = await this.uploadObjectToIPFS(rootFile);
    return rootHash;
  }

  private uploadObjectToIPFS(value: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ipfs.addJSON(value, (err, result) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}
