import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

export class WalletService {
  private sdk: CoinbaseWalletSDK;

  constructor() {
    this.sdk = new CoinbaseWalletSDK({
      appName: 'Power Punk',
      appLogoUrl: 'https://powerpunk.xyz/logo.png',
      // Using Base network
      chainId: 8453,
    });
  }

  async connect() {
    const ethereum = this.sdk.makeWeb3Provider();
    
    try {
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      return {
        address: accounts[0],
        provider: ethereum,
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async disconnect() {
    const ethereum = this.sdk.makeWeb3Provider();
    await ethereum.disconnect();
  }

  async sendTransaction(
    to: string,
    amount: string,
    from: string
  ) {
    const ethereum = this.sdk.makeWeb3Provider();
    
    const transactionParameters = {
      to,
      from,
      value: amount,
      // Base network gas settings
      gas: '0x5208', // 21000 in hex
    };

    try {
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });
      
      return txHash;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  async switchToBase() {
    const ethereum = this.sdk.makeWeb3Provider();
    
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // 8453 in hex
      });
    } catch (switchError: any) {
      // Chain not added to wallet
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }
}

export const walletService = new WalletService();