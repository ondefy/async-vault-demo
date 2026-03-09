'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { isAddress, formatUnits, erc20Abi } from 'viem'
import { VAULT_ABI } from '@/lib/vaultAbi'
import { useVaultStore } from '@/lib/store'

type AbiFunction = (typeof VAULT_ABI)[number]
type AbiFunctionItem = Extract<AbiFunction, { type: 'function' }>

const readFunctions = VAULT_ABI.filter(
  (item): item is AbiFunctionItem =>
    item.type === 'function' && (item.stateMutability === 'view' || item.stateMutability === 'pure')
)

const writeFunctions = VAULT_ABI.filter(
  (item): item is AbiFunctionItem =>
    item.type === 'function' && item.stateMutability === 'nonpayable'
)

export function VaultPanel() {
  const { address, isConnected } = useAccount()
  const { vaultAddress: storedVaultAddress, setVaultAddress } = useVaultStore()
  const [selectedFunction, setSelectedFunction] = useState<AbiFunctionItem | null>(null)
  const [args, setArgs] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'read' | 'write'>('read')

  const vaultAddress = storedVaultAddress || ''
  const isValidAddress = isAddress(vaultAddress)

  const handleVaultAddressChange = (value: string) => {
    setVaultAddress(value || null)
  }

  const quickReadActions = ['balanceOf', 'maxRequestRedeem', 'pendingWithdrawals', 'isClaimable', 'isClaimed', 'getWithdrawKey']
  const quickWriteActions = ['approve', 'claim', 'deposit', 'requestRedeem']

  const selectQuickAction = (functionName: string) => {
    const isRead = quickReadActions.includes(functionName)
    const functions = isRead ? readFunctions : writeFunctions
    const fn = functions.find((f) => f.name === functionName)
    if (fn) {
      setActiveTab(isRead ? 'read' : 'write')
      setSelectedFunction(fn)
      // Auto-fill address inputs with connected wallet
      const defaultArgs: Record<string, string> = {}
      if (address) {
        fn.inputs.forEach((input) => {
          if (input.type === 'address') {
            defaultArgs[input.name] = address
          }
        })
      }
      setArgs(defaultArgs)
            resetWrite()
    }
  }

  const { writeContract, data: txHash, isPending: isWritePending, reset: resetWrite } = useWriteContract()
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })


  const handleWrite = () => {
    if (!selectedFunction || !isValidAddress) return

    const functionArgs = selectedFunction.inputs.map((input) => {
      const value = args[input.name] || ''
      if (input.type === 'uint256') return BigInt(value || '0')
      if ((input.type as string) === 'bool') return value === 'true'
      return value
    })

    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: VAULT_ABI,
      functionName: selectedFunction.name as any,
      args: functionArgs as any,
    })
  }

  const renderFunctionSelector = (functions: AbiFunctionItem[]) => (
    <div className="space-y-2">
      <label className="block text-sm text-zinc-400">Select Function</label>
      <select
        value={selectedFunction?.name || ''}
        onChange={(e) => {
          const fn = functions.find((f) => f.name === e.target.value)
          setSelectedFunction(fn || null)
          setArgs({})
                    resetWrite()
        }}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
      >
        <option value="">Select a function...</option>
        {functions.map((fn) => (
          <option key={fn.name} value={fn.name}>
            {fn.name}({fn.inputs.map((i) => `${i.type} ${i.name}`).join(', ')})
          </option>
        ))}
      </select>
    </div>
  )

  const renderInputs = () => {
    if (!selectedFunction) return null

    return (
      <div className="space-y-3 mt-4">
        {selectedFunction.inputs.map((input) => (
          <div key={input.name}>
            <label className="block text-sm text-zinc-400 mb-1">
              {input.name} ({input.type})
            </label>
            <input
              type="text"
              value={args[input.name] || ''}
              onChange={(e) => setArgs({ ...args, [input.name]: e.target.value })}
              placeholder={input.type}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Vault Address</h2>
        <input
          type="text"
          value={vaultAddress}
          onChange={(e) => handleVaultAddressChange(e.target.value)}
          placeholder="0x..."
          className={`w-full bg-zinc-800 border rounded-lg px-4 py-3 text-white font-mono ${
            vaultAddress && !isValidAddress ? 'border-red-500' : 'border-zinc-700'
          }`}
        />
        {vaultAddress && !isValidAddress && (
          <p className="text-red-400 text-sm mt-2">Invalid address</p>
        )}
      </div>

      {isValidAddress && (
        <>
          <VaultInfo vaultAddress={vaultAddress as `0x${string}`} userAddress={address} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-2">Read</p>
                <div className="flex flex-wrap gap-2">
                  {quickReadActions.map((name) => (
                    <button
                      key={name}
                      onClick={() => selectQuickAction(name)}
                      className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">Write</p>
                <div className="flex flex-wrap gap-2">
                  {quickWriteActions.map((name) => (
                    <button
                      key={name}
                      onClick={() => selectQuickAction(name)}
                      className="px-3 py-1.5 text-sm bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700/50 text-emerald-400 rounded-lg transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setActiveTab('read')
                  setSelectedFunction(null)
                  setArgs({})
                                    resetWrite()
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'read'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Read
              </button>
              <button
                onClick={() => {
                  setActiveTab('write')
                  setSelectedFunction(null)
                  setArgs({})
                                    resetWrite()
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'write'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Write
              </button>
            </div>

            {activeTab === 'read' ? (
              <>
                {renderFunctionSelector(readFunctions)}
                {renderInputs()}
                {selectedFunction && (
                  <div className="mt-4">
                    <ReadContractResult
                      vaultAddress={vaultAddress as `0x${string}`}
                      functionName={selectedFunction.name}
                      args={selectedFunction.inputs.map((input) => {
                        const value = args[input.name] || ''
                        if (input.type === 'uint256') return BigInt(value || '0')
                        if ((input.type as string) === 'bool') return value === 'true'
                        return value
                      })}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {!isConnected ? (
                  <p className="text-zinc-400">Connect your wallet to write to the contract</p>
                ) : (
                  <>
                    {renderFunctionSelector(writeFunctions)}
                    {renderInputs()}
                    {selectedFunction && selectedFunction.name === 'deposit' ? (
                      <DepositButton
                        vaultAddress={vaultAddress as `0x${string}`}
                        amount={BigInt(args['assets'] || '0')}
                        receiver={(args['receiver'] || address) as `0x${string}`}
                        userAddress={address!}
                      />
                    ) : selectedFunction ? (
                      <button
                        onClick={handleWrite}
                        disabled={isWritePending || isTxLoading}
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
                      >
                        {isWritePending
                          ? 'Confirm in wallet...'
                          : isTxLoading
                            ? 'Processing...'
                            : `Call ${selectedFunction.name}`}
                      </button>
                    ) : null}
                    {txHash && selectedFunction?.name !== 'deposit' && (
                      <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
                        <p className="text-sm text-zinc-400">Transaction Hash:</p>
                        <code className="text-green-400 text-sm break-all">{txHash}</code>
                        {isTxSuccess && (
                          <p className="text-green-400 text-sm mt-2">Transaction confirmed!</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function VaultInfo({
  vaultAddress,
  userAddress,
}: {
  vaultAddress: `0x${string}`
  userAddress?: `0x${string}`
}) {
  const { data: name } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'name',
  })

  const { data: symbol } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'symbol',
  })

  const { data: totalAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
  })

  const { data: totalSupply } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
  })

  const { data: decimals } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'decimals',
  })

  const { data: userBalance } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  })

  const dec = decimals ?? 18

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Vault Info</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-zinc-400">Name</p>
          <p className="font-medium">{name || '...'}</p>
        </div>
        <div>
          <p className="text-zinc-400">Symbol</p>
          <p className="font-medium">{symbol || '...'}</p>
        </div>
        <div>
          <p className="text-zinc-400">Total Assets</p>
          <p className="font-mono">
            {totalAssets !== undefined ? formatUnits(totalAssets, dec) : '...'}
          </p>
        </div>
        <div>
          <p className="text-zinc-400">Total Supply</p>
          <p className="font-mono">
            {totalSupply !== undefined ? formatUnits(totalSupply, dec) : '...'}
          </p>
        </div>
        {userAddress && (
          <div className="col-span-2">
            <p className="text-zinc-400">Your Balance</p>
            <p className="font-mono">
              {userBalance !== undefined ? formatUnits(userBalance, dec) : '...'} {symbol}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ReadContractResult({
  vaultAddress,
  functionName,
  args,
}: {
  vaultAddress: `0x${string}`
  functionName: string
  args: any[]
}) {
  const { data, isLoading, error } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: functionName as any,
    args: args.length > 0 ? (args as any) : undefined,
  })

  const formatResult = (result: any): string => {
    if (result === undefined || result === null) return 'null'
    if (typeof result === 'bigint') return result.toString()
    if (typeof result === 'boolean') return result ? 'true' : 'false'
    if (typeof result === 'object') {
      if (Array.isArray(result)) {
        return `[${result.map(formatResult).join(', ')}]`
      }
      return JSON.stringify(
        result,
        (_, v) => (typeof v === 'bigint' ? v.toString() : v),
        2
      )
    }
    return String(result)
  }

  return (
    <div className="p-3 bg-zinc-800 rounded-lg">
      <p className="text-sm text-zinc-400 mb-1">Result:</p>
      {isLoading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error.message}</p>
      ) : (
        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap break-all">
          {formatResult(data)}
        </pre>
      )}
    </div>
  )
}

function DepositButton({
  vaultAddress,
  amount,
  receiver,
  userAddress,
}: {
  vaultAddress: `0x${string}`
  amount: bigint
  receiver: `0x${string}`
  userAddress: `0x${string}`
}) {
  const [step, setStep] = useState<'idle' | 'approving' | 'depositing'>('idle')

  // Get the vault's underlying asset
  const { data: assetAddress } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'asset',
  })

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: assetAddress ? [userAddress, vaultAddress] : undefined,
    query: { enabled: !!assetAddress },
  })

  const needsApproval = allowance !== undefined && allowance < amount

  // Approve transaction
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApprovePending,
    reset: _resetApprove,
  } = useWriteContract()

  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })

  // Deposit transaction
  const {
    writeContract: writeDeposit,
    data: depositTxHash,
    isPending: isDepositPending,
    reset: _resetDeposit,
  } = useWriteContract()

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  })

  // After approval succeeds, trigger deposit
  useEffect(() => {
    if (isApproveSuccess && step === 'approving') {
      refetchAllowance()
      setStep('depositing')
      writeDeposit({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [amount, receiver],
      })
    }
  }, [isApproveSuccess, step, vaultAddress, amount, receiver, writeDeposit, refetchAllowance])

  const handleClick = () => {
    if (needsApproval) {
      setStep('approving')
      writeApprove({
        address: assetAddress!,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, amount],
      })
    } else {
      setStep('depositing')
      writeDeposit({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [amount, receiver],
      })
    }
  }

  const isLoading = isApprovePending || isApproveLoading || isDepositPending || isDepositLoading

  const getButtonText = () => {
    if (isApprovePending) return 'Confirm approval in wallet...'
    if (isApproveLoading) return 'Approving...'
    if (isDepositPending) return 'Confirm deposit in wallet...'
    if (isDepositLoading) return 'Depositing...'
    if (needsApproval) return 'Approve & Deposit'
    return 'Deposit'
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        onClick={handleClick}
        disabled={isLoading || !assetAddress || amount === BigInt(0)}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
      >
        {getButtonText()}
      </button>

      {approveTxHash && (
        <div className="p-3 bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400">Approval Tx:</p>
          <code className="text-yellow-400 text-sm break-all">{approveTxHash}</code>
          {isApproveSuccess && <p className="text-green-400 text-sm mt-1">Approved!</p>}
        </div>
      )}

      {depositTxHash && (
        <div className="p-3 bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400">Deposit Tx:</p>
          <code className="text-green-400 text-sm break-all">{depositTxHash}</code>
          {isDepositSuccess && <p className="text-green-400 text-sm mt-1">Deposit confirmed!</p>}
        </div>
      )}
    </div>
  )
}
