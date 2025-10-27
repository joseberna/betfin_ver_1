
import { useAccount, useSignMessage } from 'wagmi';

export function useSiweAuth() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const login = async () => {
    // 1) pedir nonce
    const nonceRsp = await fetch('/api/siwe/nonce');
    const { nonce } = await nonceRsp.json();

    // 2) construir mensaje SIWE
    const domain = window.location.host.split(':')[0]; // 'localhost'
    const statement = 'Sign in to Bet Poker';
    const msg = [
      `${domain} wants you to sign in with your Ethereum account:`,
      address,
      '',
      statement,
      '',
      `URI: ${window.location.origin}`,
      `Version: 1`,
      `Chain ID: ${chainId || 1}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`
    ].join('\n');

    // 3) firmar
    const signature = await signMessageAsync({ message: msg });

    // 4) verificar en backend
    const verifyRsp = await fetch('/api/siwe/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, signature }),
    });
    const data = await verifyRsp.json();
    if (!data.ok) throw new Error(data.error || 'SIWE failed');

    // 5) guardar token
    localStorage.setItem('token', data.token);
    return { token: data.token, address: data.address };
  };

  return { login };
}
