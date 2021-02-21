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
  IPFS_ENDPOINT = 'ipfs.infura.io';

  step: number;

  balancesInput: string;
  tokenAddressInput: string;

  rootIPFSHash: string;
  merkleTree: any;
  astrodropContractAddress: string;
  totalAirdropAmount: string;
  tokenSymbol: string;
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
  }

  clickNext() {
    this.step += 1;
    this.canContinue = false;
  }

  clickParseBalances() {
    try {
      this.parseBalances(this.balancesInput);
      this.canContinue = true;
    } catch (error) {
      this.wallet.displayGenericError(error);
    }
  }

  async clickDeploy() {
    // check inputs
    if (!this.wallet.web3.utils.isAddress(this.tokenAddressInput)) {
      this.wallet.displayGenericError(new Error('Input not an Ethereum address'));
    }

    const unixTimestamp = Date.now();
    const salt = '0x' + new BigNumber(this.merkleTree.merkleRoot, 16).plus(unixTimestamp).toString(16);
    this.astrodropContractAddress = await this.computeAstrodropAddress(salt);
    this.deployAstrodropContract(this.tokenAddressInput, this.merkleTree.merkleRoot, salt);

    const tokenContract = this.contracts.getERC20(this.tokenAddressInput, this.wallet.readonlyWeb3());
    tokenContract.methods.decimals().call().then(decimals => this.totalAirdropAmount = new BigNumber(this.merkleTree.tokenTotal, 16).div(Math.pow(10, +decimals)).toFixed(+decimals));
    tokenContract.methods.symbol().call().then(symbol => this.tokenSymbol = symbol);
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
      balances[claimant] = new BigNumber(balances[claimant]).toString(16);
    }

    // create merkle tree
    this.merkleTree = parseBalanceMap(balances);
  }

  async uploadTree(merkleTree: any, metadata: any) {
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
    this.rootIPFSHash = await searchTree.uploadTreeToIPFS(metadata);
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
