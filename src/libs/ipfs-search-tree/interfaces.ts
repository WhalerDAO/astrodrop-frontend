// The data in an RBTreeNode
export interface RBTreeNodeData {
  key: number;
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
  key: number;
  value: any;
  leftChild: string | null;
  rightChild: string | null;
}

// Interface for the root IPFS file
export interface IPFSRoot {
  metadata: any;
  root: string;
}