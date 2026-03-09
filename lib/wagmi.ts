'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, arbitrum, optimism, base, sepolia } from 'wagmi/chains'

if (!process.env.NEXT_PUBLIC_WC_DAPP_PROJECT_ID) {
  throw new Error('Missing NEXT_PUBLIC_WC_DAPP_PROJECT_ID environment variable')
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Async Vault Demo',
  projectId: process.env.NEXT_PUBLIC_WC_DAPP_PROJECT_ID,
  chains: [mainnet, polygon, arbitrum, optimism, base, sepolia],
  ssr: true,
})

export const SUPPORTED_CHAIN_IDS = [1, 137, 42161, 10, 8453, 11155111] as const
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number]
