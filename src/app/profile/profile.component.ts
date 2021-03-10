import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import BigNumber from 'bignumber.js';
import { request, gql } from 'graphql-request'
import { ConstantsService } from '../constants.service';
import { ContractService } from '../contract.service';
import { WalletService } from '../wallet.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userAddress: string;
  eligibleAstrodrops: Astrodrop[];
  createdAstrodrops: Astrodrop[];

  constructor(
    private activatedRoute: ActivatedRoute,
    public wallet: WalletService,
    public constants: ConstantsService,
    public contracts: ContractService
  ) {
    this.eligibleAstrodrops = [];
    this.createdAstrodrops = [];
  }

  ngOnInit(): void {
    this.userAddress = this.activatedRoute.snapshot.paramMap.get('userAddress');
    this.loadData();
  }

  loadData() {
    const claimantID = this.wallet.web3.utils.toChecksumAddress(this.userAddress);
    const creatorID = this.userAddress.toLowerCase();
    const queryString = gql`
      {
        claimant(id: "${claimantID}") {
          eligibleAstrodrops {
            astrodrop {
              id
              name
              logoURL
              ipfsHash
            }
          }
        }
        astrodrops(where: { creator: "${creatorID}" }) {
          id
          name
          logoURL
          ipfsHash
        }
      }
    `;
    request(this.constants.GRAPHQL_ENDPOINT, queryString).then((data) => this.handleData(data));
  }

  async handleData(queryResult: QueryResult) {
    const claimant = queryResult.claimant;
    const createdAstrodrops = queryResult.astrodrops;

    if (claimant) {
      const rawDrops = claimant.eligibleAstrodrops;
      const parsedDrops: Astrodrop[] = [];
      for (const rawDrop of rawDrops) {
        parsedDrops.push({
          name: rawDrop.astrodrop.name,
          logoURL: rawDrop.astrodrop.logoURL,
          ipfsHash: rawDrop.astrodrop.ipfsHash
        });
      }
      this.eligibleAstrodrops = parsedDrops;
    }

    if (createdAstrodrops) {
      const rawDrops = createdAstrodrops;
      const parsedDrops: Astrodrop[] = [];
      for (const rawDrop of rawDrops) {
        parsedDrops.push({
          name: rawDrop.name,
          logoURL: rawDrop.logoURL,
          ipfsHash: rawDrop.ipfsHash
        });
      }
      this.createdAstrodrops = parsedDrops;
    }
  }
}

interface QueryResult {
  claimant: {
    eligibleAstrodrops: {
      astrodrop: {
        id: string
        name: string | null
        logoURL: string | null
        ipfsHash: string
      }
    }[];
  };
  astrodrops: {
    id: string
    name: string | null
    logoURL: string | null
    ipfsHash: string
  }[];
}

interface Astrodrop {
  name: string;
  logoURL: string;
  ipfsHash: string;
}