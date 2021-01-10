import { Component, OnInit } from '@angular/core';
import { RemoteIPFSSearchTree } from '../../libs/ipfs-search-tree/remote-ipfs-search-tree';
import { ethers } from 'ethers';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-claim',
  templateUrl: './claim.component.html',
  styleUrls: ['./claim.component.css']
})
export class ClaimComponent implements OnInit {
  IPFS_ENDPOINT = 'ipfs.infura.io';
  rootIPFSHash: string;
  remoteTree: RemoteIPFSSearchTree;
  claimAddress: string;
  userClaim: any;

  constructor(private activatedRoute: ActivatedRoute) { }

  async ngOnInit() {
    this.rootIPFSHash = this.activatedRoute.snapshot.paramMap.get('rootIPFSHash');
    this.remoteTree = new RemoteIPFSSearchTree(this.IPFS_ENDPOINT, this.rootIPFSHash);
    await this.remoteTree.init();
  }

  async clickCheck() {
    const claim = await this.getClaim(this.claimAddress);
    this.userClaim = JSON.stringify(claim);
  }

  async clickClaim() {

  }

  async getClaim(address: string) {
    const checksumAddress = ethers.utils.getAddress(address);
    const claim = await this.remoteTree.find(checksumAddress);
    return claim;
  }
}
