import { create } from 'zustand'

interface VaultState {
  vaultAddress: string | null
  setVaultAddress: (address: string | null) => void
}

const DEFAULT_VAULT_ADDRESS = '0x29d6fbe61ea5b41697a285e8ef5de6f2f9e6bd94'

const loadVaultAddress = () => {
  if (typeof window === 'undefined') return DEFAULT_VAULT_ADDRESS
  const stored = localStorage.getItem('vaultAddress')
  return stored || DEFAULT_VAULT_ADDRESS
}

export const useVaultStore = create<VaultState>((set) => ({
  vaultAddress: loadVaultAddress(),

  setVaultAddress: (address) => {
    set({ vaultAddress: address })
    if (typeof window !== 'undefined') {
      if (address) {
        localStorage.setItem('vaultAddress', address)
      } else {
        localStorage.removeItem('vaultAddress')
      }
    }
  },
}))
