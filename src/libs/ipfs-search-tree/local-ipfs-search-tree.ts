import IPFS from 'ipfs-mini'
import { RBTree } from 'bintrees'
import { IPFSNode, IPFSRoot, RBTreeNodeData, RBTreeNode } from './interfaces';
import BigNumber from 'bignumber.js';

// Used for creating & uploading a tree
export class LocalIPFSSearchTree {
  ipfs: any;
  tree: any;

  constructor(ipfsEndpoint: string) {
    this.ipfs = new IPFS({ host: ipfsEndpoint, port: 5001, protocol: 'https' });
    this.tree = new RBTree((a: RBTreeNodeData, b: RBTreeNodeData) => {
      const keyA = new BigNumber(a.key.toLowerCase(), 16);
      const keyB = new BigNumber(b.key.toLowerCase(), 16);
      if (keyA.eq(keyB)) {
        return 0;
      } else if (keyA.lt(keyB)) {
        return -1;
      } else {
        return 1;
      }
    });
  }

  insert(key: string, value: any) {
    this.tree.insert({
      key,
      value
    });
  }

  async uploadTreeToIPFS(metadata: any): Promise<string> {
    const ipfsRoot: IPFSRoot = {
      metadata,
      root: await this.uploadSubtreeToIPFS(this.tree._root)
    };
    return this.uploadObjectToIPFS(ipfsRoot);
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

  private async uploadSubtreeToIPFS(subtree: RBTreeNode | null): Promise<string> {
    if (subtree === null) {
      return null;
    }

    // do post order visit
    const ipfsNode: IPFSNode = {
      key: subtree.data.key,
      value: subtree.data.value,
      leftChild: null,
      rightChild: null
    };
    await Promise.all([
      this.uploadSubtreeToIPFS(subtree.left).then(ipfsHash => ipfsNode.leftChild = ipfsHash),
      this.uploadSubtreeToIPFS(subtree.right).then(ipfsHash => ipfsNode.rightChild = ipfsHash)
    ])
    return this.uploadObjectToIPFS(ipfsNode);
  }
}
