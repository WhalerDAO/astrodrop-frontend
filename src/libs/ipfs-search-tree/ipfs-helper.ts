import IPFS from '../ipfs-mini';

export class IPFSHelper {
  ipfs: any;

  constructor(ipfsEndpoint: string) {
    this.ipfs = new IPFS({ host: ipfsEndpoint, protocol: 'https', base: '/api/v0' });
  }

  async getObjectFromIPFS(ipfsHash: string | null): Promise<any> {
    if (ipfsHash === null) {
      return null;
    }
    return new Promise((resolve, reject) => {
      this.ipfs.catJSON(ipfsHash, (err, result) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  uploadObjectToIPFS(value: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ipfs.addJSON(value, (err, result) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}