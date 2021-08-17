import IPFS from '../ipfs-mini';
import Pinata from '@pinata/sdk';

export class IPFSHelper {
  PINATA_KEY_PUBLIC = 'a4f28fad3d730470b5d4';
  PINATA_KEY_PRIVATE =
    'ce41cd7a93892a02542a08897a6372500e3784d2ef2d323c743a0a9582709619';

  pinata: any;
  ipfs: any;

  constructor(ipfsEndpoint: string) {
    this.pinata = Pinata(this.PINATA_KEY_PUBLIC, this.PINATA_KEY_PRIVATE);
    this.ipfs = new IPFS({
      host: ipfsEndpoint,
      protocol: 'https',
      base: '/api/v0',
    });
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

  async uploadObjectToIPFS(value: any): Promise<string> {
    const options = {
      pinataOptions: {
        cidVersion: 0,
      },
    };
    const response = await this.pinata.pinJSONToIPFS(value, options);
    return response.IpfsHash;
  }
}
