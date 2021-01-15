// The data in an RBTreeNode
export interface RBTreeNodeData {
  key: string; // hexadecimal string
  value: any;
}

// Node interface for the red black tree
export interface RBTreeNode {
  left: RBTreeNode;
  right: RBTreeNode;
  data: RBTreeNodeData;
}

// Interface for each node IPFS file
export interface IPFSNode {
  key: string; // hexadecimal string
  value: any;
  leftChild: string | null;
  rightChild: string | null;
}

// Interface for the root IPFS file
export interface IPFSRoot {
  metadata: any;
  root: string;
}

export interface SubtreeIPFSFiles {
  ipfsHash: string;
  files: IPFSNode[];
}