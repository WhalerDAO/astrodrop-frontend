import { Component, OnInit } from '@angular/core';
import { parseBalanceMap } from '../../libs/merkle-tree/parse-balance-map';
import { LocalIPFSSearchTree } from '../../libs/ipfs-search-tree/local-ipfs-search-tree';
import { WalletService } from '../wallet.service';
import { ContractService } from '../contract.service';
import { BigNumber } from 'bignumber.js';
import Base58 from 'base-58';
import { Metadata } from 'src/libs/ipfs-search-tree/interfaces';

type BalanceFormat = { [account: string]: number | string }

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css']
})
export class CreateComponent implements OnInit {
  IPFS_ENDPOINT = 'api.thegraph.com/ipfs';

  step: number;

  balancesInput: string;
  tokenAddressInput: string;
  nameInput: string;
  descriptionInput: string;
  logoURLInput: string;

  rootIPFSHash: string;
  merkleTree: any;
  astrodropContractAddress: string;
  tokenDecimals: number;
  totalAirdropAmount: string;
  tokenSymbol: string;
  numRecipients: number;
  salt: string;
  canContinue: boolean;

  uploadingIPFSFiles: boolean;
  uploadIPFSFilesPercentage: number;

  constructor(
    public wallet: WalletService,
    public contracts: ContractService
  ) {

  }

  ngOnInit(): void {
    this.balancesInput = '';
    this.tokenAddressInput = '';
    this.nameInput = '';
    this.descriptionInput = '';
    this.logoURLInput = '';
    this.step = 1;
    this.canContinue = false;
    this.numRecipients = 0;
    this.uploadingIPFSFiles = false;
    this.uploadIPFSFilesPercentage = 0;
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

  async clickParseBalances() {
    try {
      this.parseBalances(this.balancesInput);
      this.numRecipients = Object.keys(this.merkleTree.claims).length;
      this.totalAirdropAmount = new BigNumber(this.merkleTree.tokenTotal, 16).div(new BigNumber(10).pow(this.tokenDecimals)).toFixed(this.tokenDecimals);
      const unixTimestamp = Date.now();
      this.salt = '0x' + new BigNumber(this.merkleTree.merkleRoot, 16).plus(unixTimestamp).toString(16);
      this.astrodropContractAddress = await this.computeAstrodropAddress(this.salt);
      this.canContinue = true;
    } catch (error) {
      this.wallet.displayGenericError(error);
    }
  }

  async clickDeploy() {
    this.deployAstrodropContract(this.tokenAddressInput, this.merkleTree.merkleRoot, this.salt, this.rootIPFSHash);
  }

  async clickUpload() {
    const metadata: Metadata = {
      name: this.nameInput,
      description: this.descriptionInput,
      logoURL: this.logoURLInput,
      contractAddress: this.astrodropContractAddress,
      merkleRoot: this.merkleTree.merkleRoot,
      tokenAddress: this.tokenAddressInput,
      tokenTotal: this.merkleTree.tokenTotal
    };
    this.uploadingIPFSFiles = true;
    const updateProgress = (percentageChange) => {
      this.uploadIPFSFilesPercentage += percentageChange;
    }
    await this.uploadTree(this.merkleTree, metadata, updateProgress);
    this.canContinue = true;
    this.uploadingIPFSFiles = false;
  }

  private parseBalances(rawBalances: string) {
    // parse balances
    const balances: BalanceFormat = JSON.parse(rawBalances);

    // convert balances to hexadecimal
    for (let claimant of Object.keys(balances)) {
      balances[claimant] = new BigNumber(balances[claimant]).times(new BigNumber(10).pow(this.tokenDecimals)).integerValue().toString(16);
    }

    // create merkle tree
    this.merkleTree = parseBalanceMap(balances);
  }

  private async uploadTree(merkleTree: any, metadata: any, updateProgress: any) {
    // create search tree
    const searchTree = new LocalIPFSSearchTree(this.IPFS_ENDPOINT, merkleTree.claims, metadata, updateProgress);

    // upload search tree to IPFS
    this.rootIPFSHash = await searchTree.uploadData();
  }

  private computeAstrodropAddress(salt: string): Promise<string> {
    const astrodropFactoryContract = this.contracts.getNamedContract('AstrodropFactory');
    const astrodropTemplateAddress = this.contracts.getNamedContractAddress('Astrodrop');
    return astrodropFactoryContract.methods.computeAstrodropAddress(astrodropTemplateAddress, salt).call();
  }

  private deployAstrodropContract(tokenAddress: string, merkleRoot: string, salt: string, ipfsHash: string) {
    // convert ipfsHash to 32 bytes by removing the first two bytes
    const truncatedIPFSHash = this.wallet.web3.utils.bytesToHex(Base58.decode(ipfsHash).slice(2));

    const astrodropFactoryContract = this.contracts.getNamedContract('AstrodropFactory');
    const astrodropTemplateAddress = this.contracts.getNamedContractAddress('Astrodrop');
    const func = astrodropFactoryContract.methods.createAstrodrop(
      astrodropTemplateAddress,
      tokenAddress,
      merkleRoot,
      salt,
      truncatedIPFSHash
    );
    return this.wallet.sendTx(func, () => { this.canContinue = true; }, () => { }, (error) => { this.wallet.displayGenericError(error) });
  }
}
