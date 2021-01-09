import IPFS from 'ipfs-mini'
import { RBTree } from 'bintrees'

// Node interface for the local tree
interface LocalNode {
  key: number;
  value: Object;
}

// Node interface for the red black tree
interface RBTreeNode {
  left: RBTreeNode;
  right: RBTreeNode;
  data: LocalNode;
}

// Interface for each node IPFS file
interface IPFSNode {
  key: number;
  value: Object;
  leftChild: string | null;
  rightChild: string | null;
}

// Interface for the root IPFS file
interface IPFSRoot {
  metadata: Object;
  root: string;
}

export class IPFSSearchTree {
  ipfs: any;
  tree: any;

  constructor(ipfsEndpoint: string) {
    this.ipfs = new IPFS({ host: ipfsEndpoint, port: 5001, protocol: 'https' });
    this.tree = new RBTree((a: LocalNode, b: LocalNode) => {
      return a.key - b.key;
    });
  }

  insert(key: number, value: Object) {
    this.tree.insert({
      key,
      value
    });
  }

  async uploadTreeToIPFS(metadata: Object): Promise<string> {
    const ipfsRoot: IPFSRoot = {
      metadata,
      root: await this.uploadSubtreeToIPFS(this.tree._root)
    };
    return this.uploadObjectToIPFS(ipfsRoot);
  }

  private uploadObjectToIPFS(value: Object): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ipfs.addJSON(value, (err, result) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    })
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
