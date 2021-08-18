import { IPFSRoot, Metadata } from './interfaces';
import BigNumber from 'bignumber.js';
import { IPFSHelper } from './ipfs-helper';

// Used for creating & uploading a tree
export class LocalIPFSSearchTree {
  ipfsHelper: IPFSHelper;
  keyValueMap: any; // maps string to object
  metadata: Metadata;
  updateProgress: any; // callback for updating progress bar
  binSize: number;
  uploadDelayMs: number; // the delay between bin IPFS uploads in ms

  constructor(
    ipfsEndpoint: string,
    data: any,
    metadata: Metadata,
    updateProgress: any,
    binSize: number = 500,
    uploadDelayMs: number = 100
  ) {
    this.ipfsHelper = new IPFSHelper(ipfsEndpoint);
    this.keyValueMap = data;
    this.metadata = metadata;
    this.updateProgress = updateProgress;
    this.binSize = binSize;
    this.uploadDelayMs = uploadDelayMs;
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
    const numBins = Math.ceil(N / this.binSize);
    for (let i = 1; i <= numBins; i++) {
      let pivotIdx = i * this.binSize - 1;
      if (pivotIdx >= N) {
        pivotIdx = N - 1;
      }
      const pivot = sortedKeys[pivotIdx];
      pivots.push(pivot);

      const bin = {};
      const binStartIdx = (i - 1) * this.binSize;
      for (let j = binStartIdx; j <= pivotIdx; j++) {
        const key = sortedKeys[j];
        const value = this.keyValueMap[key];
        bin[key] = value;
      }
      dataBins.push(bin);
    }

    // upload binned data
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    const binIPFSHashes = [];
    for (const value of dataBins) {
      const hash = await this.ipfsHelper.uploadObjectToIPFS(value);
      this.updateProgress(1 / numBins);
      binIPFSHashes.push(hash);
      await sleep(this.uploadDelayMs);
    }

    // construct root file
    const rootFile: IPFSRoot = {
      metadata: this.metadata,
      pivots,
      bins: binIPFSHashes,
      keys: sortedKeys,
    };

    // upload root file
    const rootHash = await this.ipfsHelper.uploadObjectToIPFS(rootFile);
    return rootHash;
  }
}
