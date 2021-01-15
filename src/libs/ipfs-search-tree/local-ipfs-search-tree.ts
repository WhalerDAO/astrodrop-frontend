import IPFS from 'ipfs-mini'
import { RBTree } from 'bintrees'
import { IPFSNode, IPFSRoot, RBTreeNodeData, RBTreeNode, SubtreeIPFSFiles } from './interfaces';
import BigNumber from 'bignumber.js';
import Hash from 'ipfs-only-hash';

// Used for creating & uploading a tree
export class LocalIPFSSearchTree {
  UPLOAD_INTERVAL = 200; // in ms
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
    const ipfsFiles: SubtreeIPFSFiles = await this.getSubtreeIPFSFiles(this.tree._root); 
    const ipfsRoot: IPFSRoot = {
      metadata,
      root: ipfsFiles.ipfsHash
    };

    // upload ipfs nodes in order, with wait time between each upload
    const sleep = (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    for (const ipfsNode of ipfsFiles.files) {
      await this.uploadObjectToIPFS(ipfsNode);
      await sleep(this.UPLOAD_INTERVAL);
    }

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

  private async getSubtreeIPFSFiles(subtree: RBTreeNode | null): Promise<SubtreeIPFSFiles> {
    if (subtree === null) {
      return {
        ipfsHash: null,
        files: []
      };
    }

    // do post order visit
    const ipfsNode: IPFSNode = {
      key: subtree.data.key,
      value: subtree.data.value,
      leftChild: null,
      rightChild: null
    };
    const children = await Promise.all([
      this.getSubtreeIPFSFiles(subtree.left),
      this.getSubtreeIPFSFiles(subtree.right)
    ]);
    ipfsNode.leftChild = children[0].ipfsHash;
    ipfsNode.rightChild = children[1].ipfsHash;

    const data = Buffer.from(JSON.stringify(ipfsNode));
    const hash = await Hash.of(data);
    const result: SubtreeIPFSFiles = {
      ipfsHash: hash,
      files: children[0].files.concat(children[1].files).concat([ipfsNode])
    };

    return result;
  }
}
