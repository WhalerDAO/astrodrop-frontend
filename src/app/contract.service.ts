import { Injectable } from '@angular/core';
import Web3 from 'web3';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  constructor(public wallet: WalletService) { }

  getContract(address: string, abiName: string, web3?: Web3) {
    const abi = require(`../assets/abis/${abiName}.json`);
    if (web3) {
      return new web3.eth.Contract(abi, address);
    }
    return new this.wallet.web3.eth.Contract(abi, address);
  }

  getNamedContract(name: string, web3?: Web3) {
    const address = require('../assets/json/contracts.json')[name];
    return this.getContract(address, name, web3);
  }

  getNamedContractAddress(name: string) {
    return require('../assets/json/contracts.json')[name];
  }

  getERC20(address: string, web3?: Web3) {
    return this.getContract(address, 'ERC20', web3);
  }
}