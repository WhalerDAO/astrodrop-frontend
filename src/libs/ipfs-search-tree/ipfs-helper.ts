import IPFS from '../ipfs-mini';
import Pinata from '@pinata/sdk';

export class IPFSHelper {
  PINATA_KEY_PUBLIC = '2118d54c0ec9b0c87ac5';
  PINATA_KEY_PRIVATE =
    '57f1b50a1cfaa88d64cafbde53e2814c450d812895fc08bb8e35fee366f3814e';

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
