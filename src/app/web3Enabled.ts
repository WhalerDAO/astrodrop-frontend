import Web3 from 'web3';
import Notify from 'bnc-notify';
import Onboard from 'bnc-onboard';
import BigNumber from 'bignumber.js';

export class Web3Enabled {
  blocknativeAPIKey: string;
  infuraKey: string;
  infuraEndpoint: string;
  assistInstance: any;
  notifyInstance: any;
  state: any;
  networkID: number;

  constructor(public web3: Web3) {
    this.blocknativeAPIKey = '08eaf62d-228c-4ec6-a033-f8b97689102b';
    this.infuraKey = '7a7dd3472294438eab040845d03c215c';
    this.infuraEndpoint = `https://mainnet.infura.io/v3/${this.infuraKey}`
    this.networkID = 1;
    this.state = {
      address: null,
      wallet: {
        provider: null
      }
    };
  }

  async connect(onConnected, onError, isStartupMode: boolean) {
    if (!this.assistInstance) {
      const wallets = [
        {
          walletName: 'metamask',
          preferred: true
        },
        {
          walletName: 'walletConnect',
          infuraKey: this.infuraKey,
          networkId: this.networkID,
          preferred: true
        }
      ];

      const walletChecks = [
        { checkName: 'derivationPath' },
        { checkName: 'connect' },
        { checkName: 'accounts' },
        { checkName: 'network' },
      ];

      const walletSelectConfig = {
        heading: 'Select a Wallet',
        description: 'Please select a wallet to connect to Astrodrop:',
        wallets
      };

      const bncAssistConfig = {
        dappId: this.blocknativeAPIKey,
        darkMode: true,
        networkId: this.networkID,
        hideBranding: true,
        subscriptions: {
          wallet: wallet => {
            if (wallet.provider) {
              this.web3 = new Web3(wallet.provider);
            }
            // store the selected wallet name to be retrieved next time the app loads
            window.localStorage.setItem('selectedWallet', wallet.name);
          },
          address: this.doNothing,
          network: this.doNothing,
          balance: this.doNothing
        },
        walletSelect: walletSelectConfig,
        walletCheck: walletChecks
      };
      this.assistInstance = Onboard(bncAssistConfig);
    }

    // Get user to select a wallet
    let selectedWallet;
    if (isStartupMode) {
      // Startup mode: connect to previously used wallet if available
      // get the selectedWallet value from local storage
      const previouslySelectedWallet = window.localStorage.getItem('selectedWallet');
      // call wallet select with that value if it exists
      if (previouslySelectedWallet != null) {
        selectedWallet = await this.assistInstance.walletSelect(previouslySelectedWallet);
      }
    } else {
      // Non startup mode: open wallet selection screen
      selectedWallet = await this.assistInstance.walletSelect();
    }
    const state = this.assistInstance.getState();
    if (
      selectedWallet
      || state.address !== null // If user already logged in but want to switch account, and then dismissed window
    ) {
      // Get users' wallet ready to transact
      const ready = await this.assistInstance.walletCheck();
      this.state = this.assistInstance.getState();

      if (!ready) {
        // Selected an option but then dismissed it
        // Treat as no wallet
        onError();
      } else {
        // Successfully connected
        onConnected();
      }
    } else {
      // User refuses to connect to wallet
      // Update state
      this.state = this.assistInstance.getState();
      onError();
    }

    if (!this.notifyInstance) {
      this.notifyInstance = Notify({
        dappId: this.blocknativeAPIKey,
        networkId: this.networkID
      });
      this.notifyInstance.config({
        darkMode: true
      });
    }
  }

  readonlyWeb3() {
    if (this.state.wallet.provider) {
      return this.web3;
    }
    return new Web3(this.infuraEndpoint);
  }

  async estimateGas(func, val, _onError) {
    return Math.floor((await func.estimateGas({
      from: this.state.address,
      value: val
    }).catch(_onError)) * 1.2);
  }

  async sendTx(func, _onTxHash, _onReceipt, _onError) {
    const gasLimit = await this.estimateGas(func, 0, _onError);
    if (!isNaN(gasLimit)) {
      return func.send({
        from: this.state.address,
        gas: gasLimit,
      }).on('transactionHash', (hash) => {
        _onTxHash(hash);
        const { emitter } = this.notifyInstance.hash(hash);
        // emitter.on('txConfirmed', _onReceipt);
        emitter.on('txFailed', _onError);
      })
        .on('receipt', _onReceipt)
        .on('error', (e) => {
          if (!e.toString().contains('newBlockHeaders')) {
            _onError(e);
          }
        });
    }
  }

  async sendTxWithValue(func, val, _onTxHash, _onReceipt, _onError) {
    const gasLimit = await this.estimateGas(func, val, _onError);
    if (!isNaN(gasLimit)) {
      return func.send({
        from: this.state.address,
        gas: gasLimit,
        value: val
      }).on('transactionHash', (hash) => {
        _onTxHash(hash);
        const { emitter } = this.notifyInstance.hash(hash);
        // emitter.on('txConfirmed', _onReceipt);
        emitter.on('txFailed', _onError);
      })
        .on('receipt', _onReceipt)
        .on('error', (e) => {
          if (!e.toString().contains('newBlockHeaders')) {
            _onError(e);
          }
        });
    }
  }

  async sendTxWithToken(func, token, to, amount, _onTxHash, _onReceipt, _onError) {
    const maxAllowance = new BigNumber(2).pow(256).minus(1).integerValue().toFixed();
    const allowance = new BigNumber(await token.methods.allowance(this.state.address, to).call());
    if (allowance.gte(amount)) {
      return this.sendTx(func, _onTxHash, _onReceipt, _onError);
    }
    return this.sendTx(token.methods.approve(to, maxAllowance), this.doNothing, () => {
      this.sendTx(func, _onTxHash, _onReceipt, _onError);
    }, _onError);
  }

  displayGenericError(error: Error) {
    let errorMessage;
    try {
      errorMessage = JSON.parse(error.message.slice(error.message.indexOf('{'))).originalError.message;
    } catch (err) {
      errorMessage = error.message;
    }
    this.notifyInstance.notification({
      eventCode: 'genericError',
      type: 'error',
      message: errorMessage
    });
  }

  doNothing() { }
}
