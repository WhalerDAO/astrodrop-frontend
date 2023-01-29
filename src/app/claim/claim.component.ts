import { Component, OnInit } from '@angular/core';
import { RemoteIPFSSearchTree } from '../../libs/ipfs-search-tree/remote-ipfs-search-tree';
import { ethers } from 'ethers';
import { ActivatedRoute } from '@angular/router';
import BigNumber from 'bignumber.js';
import { WalletService } from '../wallet.service';
import { ContractService } from '../contract.service';

@Component({
  selector: 'app-claim',
  templateUrl: './claim.component.html',
  styleUrls: ['./claim.component.css']
})
export class ClaimComponent implements OnInit {
  IPFS_ENDPOINT = 'gateway.pinata.cloud';
  rootIPFSHash: string;
  remoteTree: RemoteIPFSSearchTree;
  claimAddress: string;
  userClaim: any;
  airdropBalance: BigNumber;
  claimableAmount: string;
  claimTokenSymbol: string;
  claimed: boolean;
  finishedLoadingRoot: boolean;
  finishedCheckingClaim: boolean;
  expirationTime: string;
  sweepEnabled: boolean;

  constructor(
    private activatedRoute: ActivatedRoute,
    public wallet: WalletService,
    public contracts: ContractService
  ) { }

  async ngOnInit() {
    this.rootIPFSHash = this.activatedRoute.snapshot.paramMap.get('rootIPFSHash');
    this.remoteTree = new RemoteIPFSSearchTree(this.IPFS_ENDPOINT, this.rootIPFSHash);
    await this.remoteTree.init();

    const readonlyWeb3 = this.wallet.readonlyWeb3();
    const astrodropContract = this.contracts.getContract(this.remoteTree.metadata.contractAddress, 'Astrodrop', readonlyWeb3);
    const expireTimestamp = (+await astrodropContract.methods.expireTimestamp().call()) * 1e3
    this.expirationTime = new Date(expireTimestamp).toString();
    this.finishedLoadingRoot = true;

    const owner = await astrodropContract.methods.owner().call();
    this.sweepEnabled = Date.now() >= expireTimestamp && this.wallet.userAddress.toLowerCase() === owner.toLowerCase();
  }

  resetData() {
    this.claimed = false;
    this.finishedCheckingClaim = false;
    this.finishedLoadingRoot = false;
  }

  clickCheck() {
    if (!this.wallet.web3.utils.isAddress(this.claimAddress)) {
      this.wallet.displayGenericError(new Error('The provided address is not a valid Ethereum address.'));
      return;
    }

    this.checkClaim(this.claimAddress);
  }

  clickClaim() {
    this.claimAirdrop(this.claimAddress, this.userClaim);
  }

  clickSweep() {
    this.sweep();
  }

  async getClaim(address: string) {
    const checksumAddress = ethers.utils.getAddress(address);
    const claim = await this.remoteTree.find(checksumAddress);
    return claim;
  }

  async checkClaim(claimAddress: string) {
    this.finishedCheckingClaim = false;

    const readonlyWeb3 = this.wallet.readonlyWeb3();

    this.userClaim = await this.getClaim(claimAddress);
    if (!this.userClaim) {
      this.wallet.displayGenericError(new Error('The provided address is not included in this airdrop.'));
      return;
    }

    const astrodropContract = this.contracts.getContract(this.remoteTree.metadata.contractAddress, 'Astrodrop', readonlyWeb3);
    this.claimed = await astrodropContract.methods.isClaimed(this.userClaim.index).call();

    const tokenAddress = this.remoteTree.metadata.tokenAddress;
    const tokenContract = this.contracts.getERC20(tokenAddress, readonlyWeb3);
    this.claimTokenSymbol = await tokenContract.methods.symbol().call();

    if (!this.claimed) {
      let tokenDecimals;
      if (this.remoteTree.metadata.tokenType === '20') {
        tokenDecimals = +await tokenContract.methods.decimals().call();
      } else if (this.remoteTree.metadata.tokenType === '721') {
        tokenDecimals = 0;
      }
      const tokenPrecision = new BigNumber(10).pow(tokenDecimals);
      this.airdropBalance = new BigNumber(this.userClaim.amount, 16).div(tokenPrecision);
      this.claimableAmount = this.airdropBalance.toFixed(tokenDecimals);
    }

    this.finishedCheckingClaim = true;
  }

  claimAirdrop(claimAddress: string, claim: any) {
    const astrodropContract = this.contracts.getContract(this.remoteTree.metadata.contractAddress, 'Astrodrop');
    const func = astrodropContract.methods.claim(claim.index, claimAddress, claim.amount, claim.proof);

    this.wallet.sendTx(func, () => { }, () => { }, (error) => { this.wallet.displayGenericError(error) });
  }

  sweep() {
    const astrodropContract = this.contracts.getContract(this.remoteTree.metadata.contractAddress, 'Astrodrop');
    const func = astrodropContract.methods.sweep(this.remoteTree.metadata.tokenAddress, this.wallet.userAddress);

    this.wallet.sendTx(func, () => { }, () => { }, (error) => { this.wallet.displayGenericError(error) });
  }
}
