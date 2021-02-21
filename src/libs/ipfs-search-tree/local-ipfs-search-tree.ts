import IPFS from 'ipfs-mini'
import { RBTree } from 'bintrees'
import { IPFSNode, IPFSRoot, RBTreeNodeData, RBTreeNode, SubtreeIPFSFiles } from './interfaces';
import BigNumber from 'bignumber.js';
import Hash from 'ipfs-only-hash';
import fetch from 'node-fetch';

// Used for creating & uploading a tree
export class LocalIPFSSearchTree {
  UPLOAD_INTERVAL = 10; // in ms
  PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIxOGE1NGQ3ZS1iMDA4LTQ4YjctYmU0OS1jMmNiYjI3NTNkYmYiLCJlbWFpbCI6InplZnJhbWxvdUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlfSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiY2M1MDUyM2IyYmI4Yjk4YWY0NTQiLCJzY29wZWRLZXlTZWNyZXQiOiJhMGEzYTVhNDkxZTEwZTEyNDlkZTFkZmIyM2Y2MjMwZjcyMTkxNmU5NzM1YmNlNzhhODFkMDhjNDNkMGYyMjkwIiwiaWF0IjoxNjEwNDk2OTEyfQ.yWo8Y68YBZW5TjKuqZNGbK3bPVqPovsvHwKymLuZjjQ';
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
      await this.uploadObjectToPinata(ipfsNode);
      await sleep(this.UPLOAD_INTERVAL);
    }

    const ipfsHash = await this.uploadObjectToPinata(ipfsRoot);
    return ipfsHash;
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

  private async uploadObjectToPinata(value: any): Promise<string> {
    return fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', { method: 'POST', body: JSON.stringify(value), headers: { Authorization: `Bearer ${this.PINATA_JWT}`, 'Content-Type': 'application/json' }})
      .then(response => response.json())
      .then(parsedResponse => parsedResponse.IpfsHash);
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
