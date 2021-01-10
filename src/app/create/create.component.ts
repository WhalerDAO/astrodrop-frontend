import { Component, OnInit } from '@angular/core';
import { parseBalanceMap } from '../../libs/merkle-tree/parse-balance-map';
import { LocalIPFSSearchTree } from '../../libs/ipfs-search-tree/local-ipfs-search-tree';

type BalanceFormat = { [account: string]: number | string }

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css']
})
export class CreateComponent implements OnInit {
  IPFS_ENDPOINT = 'ipfs.infura.io';
  balancesInput: string;
  rootIPFSHash: string;

  constructor() {
    this.balancesInput = '';
  }

  ngOnInit(): void {
  }

  clickUpload() {
    this.uploadTree(this.balancesInput);
  }

  async uploadTree(rawBalances: string) {
    // parse balances
    const balances: BalanceFormat = JSON.parse(rawBalances);

    // create merkle tree
    const merkleTree = parseBalanceMap(balances);

    // create search tree
    const searchTree = new LocalIPFSSearchTree(this.IPFS_ENDPOINT);
    for (const account of Object.keys(merkleTree.claims)) {
      const claim = merkleTree.claims[account];
      const key = account;
      const value = {
        index: claim.index,
        amount: claim.amount,
        proof: claim.proof
      };
      searchTree.insert(key, value);
    }

    // upload search tree to IPFS
    const metadata = {
      merkleRoot: merkleTree.merkleRoot,
      tokenTotal: merkleTree.tokenTotal
    };
    this.rootIPFSHash = await searchTree.uploadTreeToIPFS(metadata);
  }
}
