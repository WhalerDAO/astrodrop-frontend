import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';

@Injectable({
  providedIn: 'root'
})
export class HelpersService {

  constructor() { }

  processWeb3Number(number): string {
    return new BigNumber(number).integerValue().toFixed();
  }
}
