import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConstantsService {
  PRECISION = 1e18;
  GRAPHQL_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/zeframlou/astrodrop';
}
