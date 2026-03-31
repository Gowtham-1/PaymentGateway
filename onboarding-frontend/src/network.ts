import { defineChain } from 'viem';

export const hoodi = defineChain({
    id: 560048,
    name: 'Hoodi',
    network: 'hoodi',
    nativeCurrency: {
        decimals: 18,
        name: 'Hoodi Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['https://rpc.hoodi.ethpandaops.io'] },
        public: { http: ['https://rpc.hoodi.ethpandaops.io'] },
    },
    blockExplorers: {
        default: { name: 'Etherscan', url: 'https://hoodi.etherscan.io' },
    },
});
