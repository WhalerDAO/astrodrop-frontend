import IPFS from 'ipfs-mini'
import { IPFSNode, IPFSRoot } from './interfaces';

// Used for searching a remote tree
export class RemoteIPFSSearchTree {
  ipfs: any;
  rootIPFSHash: string;
  rootFile: IPFSRoot;
  rootNode: IPFSNode;

  constructor(ipfsEndpoint: string, rootIPFSHash: string) {
    this.ipfs = new IPFS({ host: ipfsEndpoint, port: 5001, protocol: 'https' });
    this.rootIPFSHash = rootIPFSHash;
  }

  async init() {
    this.rootFile = await this.getObjectFromIPFS(this.rootIPFSHash);
    this.rootNode = await this.getObjectFromIPFS(this.rootFile.root);
  }

  async find(key: number): Promise<any> {
    return this.findFromSubtree(key, this.rootNode);
  }

  get metadata(): any {
    return this.rootFile.metadata;
  }

  private async findFromSubtree(key: number, subtree: IPFSNode): Promise<any> {
    let nextSubtreeToSearch;
    if (key === subtree.key) {
      // found at root
      return subtree.value;
    } else if (key < subtree.key) {
      // search left subtree
      nextSubtreeToSearch = await this.getObjectFromIPFS(subtree.leftChild);
    } else {
      // search right subtree
      nextSubtreeToSearch = await this.getObjectFromIPFS(subtree.rightChild);
    }

    if (nextSubtreeToSearch === null) {
      return null;
    }
    return this.findFromSubtree(key, nextSubtreeToSearch);
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