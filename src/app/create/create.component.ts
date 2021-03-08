import { Component, OnInit } from '@angular/core';
import { parseBalanceMap } from '../../libs/merkle-tree/parse-balance-map';
import { LocalIPFSSearchTree } from '../../libs/ipfs-search-tree/local-ipfs-search-tree';
import { WalletService } from '../wallet.service';
import { ContractService } from '../contract.service';
import { BigNumber } from 'bignumber.js';

type BalanceFormat = { [account: string]: number | string }

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css']
})
export class CreateComponent implements OnInit {
  IPFS_ENDPOINT = 'api.thegraph.com';

  step: number;

  balancesInput: string;
  tokenAddressInput: string;

  rootIPFSHash: string;
  merkleTree: any;
  astrodropContractAddress: string;
  tokenDecimals: number;
  totalAirdropAmount: string;
  tokenSymbol: string;
  numRecipients: number;
  canContinue: boolean;

  constructor(
    public wallet: WalletService,
    public contracts: ContractService
  ) {

  }

  ngOnInit(): void {
    this.balancesInput = '';
    this.tokenAddressInput = '';
    this.step = 1;
    this.canContinue = false;
    this.numRecipients = 0;
  }

  clickNext() {
    this.step += 1;
    this.canContinue = false;
  }

  async clickConfirmToken() {
    // check inputs
    if (!this.wallet.web3.utils.isAddress(this.tokenAddressInput)) {
      this.wallet.displayGenericError(new Error('Input not an Ethereum address'));
      return;
    }

    const tokenContract = this.contracts.getERC20(this.tokenAddressInput, this.wallet.readonlyWeb3());
    await Promise.all([
      tokenContract.methods.decimals().call().then(decimals => this.tokenDecimals = +decimals),
      tokenContract.methods.symbol().call().then(symbol => this.tokenSymbol = symbol)
    ]);
    this.step += 1;
  }

  clickParseBalances() {
    try {
      this.parseBalances(this.balancesInput);
      this.numRecipients = Object.keys(this.merkleTree.claims).length;
      this.totalAirdropAmount = new BigNumber(this.merkleTree.tokenTotal, 16).div(new BigNumber(10).pow(this.tokenDecimals)).toFixed(this.tokenDecimals);
      this.canContinue = true;
    } catch (error) {
      this.wallet.displayGenericError(error);
    }
  }

  async clickDeploy() {
    const unixTimestamp = Date.now();
    const salt = '0x' + new BigNumber(this.merkleTree.merkleRoot, 16).plus(unixTimestamp).toString(16);
    this.astrodropContractAddress = await this.computeAstrodropAddress(salt);
    this.deployAstrodropContract(this.tokenAddressInput, this.merkleTree.merkleRoot, salt);
  }

  clickUpload() {
    const metadata = {
      contractAddress: this.astrodropContractAddress,
      merkleRoot: this.merkleTree.merkleRoot,
      tokenAddress: this.tokenAddressInput,
      tokenTotal: this.merkleTree.tokenTotal
    };
    this.uploadTree(this.merkleTree, metadata);
  }

  parseBalances(rawBalances: string) {
    // parse balances
    const balances: BalanceFormat = JSON.parse(rawBalances);

    // convert balances to hexadecimal
    for (let claimant of Object.keys(balances)) {
      balances[claimant] = new BigNumber(balances[claimant]).times(new BigNumber(10).pow(this.tokenDecimals)).integerValue().toString(16);
    }

    // create merkle tree
    this.merkleTree = parseBalanceMap(balances);
  }

  async uploadTree(merkleTree: any, metadata: any) {
    // create search tree
    const searchTree = new LocalIPFSSearchTree(this.IPFS_ENDPOINT, merkleTree.claims, metadata, 10);

    // upload search tree to IPFS
    this.rootIPFSHash = await searchTree.uploadData();
  }

  computeAstrodropAddress(salt: string): Promise<string> {
    const astrodropFactoryContract = this.contracts.getNamedContract('AstrodropFactory');
    const astrodropTemplateAddress = this.contracts.getNamedContractAddress('Astrodrop');
    return astrodropFactoryContract.methods.computeAstrodropAddress(astrodropTemplateAddress, salt).call();
  }

  deployAstrodropContract(tokenAddress: string, merkleRoot: string, salt: string) {
    const astrodropFactoryContract = this.contracts.getNamedContract('AstrodropFactory');
    const astrodropTemplateAddress = this.contracts.getNamedContractAddress('Astrodrop');
    const func = astrodropFactoryContract.methods.createAstrodrop(
      astrodropTemplateAddress,
      tokenAddress,
      merkleRoot,
      salt
    );
    return this.wallet.sendTx(func, () => { this.canContinue = true; }, () => { }, (error) => { this.wallet.displayGenericError(error) });
  }
}
