// Metadata interface
export interface Metadata {
  name: string;
  description: string;
  logoURL: string;
  contractAddress: string;
  merkleRoot: string;
  tokenAddress: string;
  tokenTotal: string; // In hex
  tokenType: string;
}

// The root IPFS file
export interface IPFSRoot {
  metadata: any;
  pivots: string[];
  bins: string[];
  keys: string[];
}
