import { BigNumber } from 'bignumber.js';
import { IPFSRoot, Metadata } from './interfaces';
import { IPFSHelper } from './ipfs-helper';

// Used for searching a remote tree
export class RemoteIPFSSearchTree {
  ipfsHelper: IPFSHelper;
  rootIPFSHash: string;
  rootFile: IPFSRoot;

  constructor(ipfsEndpoint: string, rootIPFSHash: string) {
    this.ipfsHelper = new IPFSHelper(ipfsEndpoint);
    this.rootIPFSHash = rootIPFSHash;
  }

  async init() {
    this.rootFile = await this.ipfsHelper.getObjectFromIPFS(this.rootIPFSHash);
  }

  async find(key: string): Promise<any> {
    // linear search to find pivot
    for (let i = 0; i < this.rootFile.pivots.length; i++) {
      const pivot = this.rootFile.pivots[i];
      const pivotNum = new BigNumber(pivot.substr(2).toLowerCase(), 16);
      const keyNum = new BigNumber(key.substr(2).toLowerCase(), 16);
      if (keyNum.lte(pivotNum)) {
        // found pivot, fetch bin
        const bin = await this.ipfsHelper.getObjectFromIPFS(this.rootFile.bins[i]);

        // find value in bin
        return bin[key];
      }
    }
    return null;
  }

  get metadata(): Metadata {
    return this.rootFile.metadata;
  }
}