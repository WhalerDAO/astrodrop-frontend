import { Component, OnInit } from '@angular/core';
import { WalletService } from '../wallet.service';
import { ethers } from 'ethers';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  accountName: string;

  constructor(public wallet: WalletService) { }

  ngOnInit(): void {
    this.accountName = "unknown";
  }

  connectWallet() {
    this.wallet.connect(() => { }, () => { }, false);
  }

  setAccountName(address: string): void {
    this.accountName = `${address.substring(0, 6)}...${address.slice(-4)}`

    const ethersProvider = new ethers.providers.Web3Provider(this.wallet.web3.givenProvider);
    ethersProvider.lookupAddress(address)
      .then(lookedupAddress => {
        if (lookedupAddress) {
          this.accountName = lookedupAddress;
        }
      })
  }
}
