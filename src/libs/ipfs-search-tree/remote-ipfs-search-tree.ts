import { BigNumber } from 'bignumber.js';
import IPFS from '../ipfs-mini';
import { IPFSRoot } from './interfaces';

// Used for searching a remote tree
export class RemoteIPFSSearchTree {
  ipfs: any;
  rootIPFSHash: string;
  rootFile: IPFSRoot;

  constructor(ipfsEndpoint: string, rootIPFSHash: string) {
    this.ipfs = new IPFS({ host: ipfsEndpoint, port: 5001, protocol: 'https', base: '/api/v0' });
    this.rootIPFSHash = rootIPFSHash;
  }

  async init() {
    this.rootFile = await this.getObjectFromIPFS(this.rootIPFSHash);
  }

  async find(key: string): Promise<any> {
    // linear search to find pivot
    for (let i = 0; i < this.rootFile.pivots.length; i++) {
      const pivot = this.rootFile.pivots[i];
      const pivotNum = new BigNumber(pivot.substr(2).toLowerCase(), 16);
      const keyNum = new BigNumber(key.substr(2).toLowerCase(), 16);
      if (keyNum.lte(pivotNum)) {
        // found pivot, fetch bin
        const bin = await this.getObjectFromIPFS(this.rootFile.bins[i]);

        // find value in bin
        return bin[key];
      }
    }
    return null;
  }

  get metadata(): any {
    return this.rootFile.metadata;
  }

  private async getObjectFromIPFS(ipfsHash: string | null): Promise<any> {
    if (ipfsHash === null) {
      return null;
    }
    return new Promise((resolve, reject) => {
      this.ipfs.catJSON(ipfsHash, (err, result) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}