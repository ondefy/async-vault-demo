'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { VaultPanel } from '@/components/VaultPanel'

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Async Vault Demo</h1>
            <ConnectButton />
          </div>
        </header>

        <VaultPanel />
      </div>
    </main>
  )
}
