export const config = {
    backendUrl: 'https://action-businesses-stuart-sing.trycloudflare.com',
    gatewayUrl: 'https://wholesale-oldest-returning-professional.trycloudflare.com',
    cloudflareUrl: 'https://wholesale-oldest-returning-professional.trycloudflare.com',
    pimlicoApiKey: 'pim_dVrBQtejohV1hpXb2afF9t',
    get pimlicoUrl() { return `https://api.pimlico.io/v2/hoodi-testnet/rpc?apikey=${this.pimlicoApiKey}`; }
};
