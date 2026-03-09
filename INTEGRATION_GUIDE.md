# Async Vault Integration Guide

Integration guide for an async vault with USDC as the underlying token.

## Prerequisites

- Vault contract address
- USDC contract address (available via `vault.asset()`)
- Connected wallet with USDC balance

## 1. Deposit Flow

Depositing converts USDC into vault shares. This is a **synchronous** two-step process.

### Step 1: Approve USDC spending

```solidity
USDC.approve(vaultAddress, amount)
```

The vault needs allowance to pull USDC from your wallet. You can approve the exact amount or `type(uint256).max` for unlimited.

### Step 2: Deposit USDC into the vault

```solidity
vault.deposit(assets, receiver)
```

| Parameter  | Description                                    |
|------------|------------------------------------------------|
| `assets`   | Amount of USDC (6 decimals), e.g. `1000000` = 1 USDC |
| `receiver` | Address that receives vault shares (usually `msg.sender`) |

**Returns:** number of shares minted.

### Example (ethers.js)

```typescript
const usdc = new Contract(await vault.asset(), erc20Abi, signer)
const amount = parseUnits("100", 6) // 100 USDC

// 1. Approve
await (await usdc.approve(vaultAddress, amount)).wait()

// 2. Deposit
const tx = await vault.deposit(amount, signer.address)
const receipt = await tx.wait()
```

### Example (wagmi)

```typescript
// 1. Approve
writeContract({
  address: usdcAddress,
  abi: erc20Abi,
  functionName: 'approve',
  args: [vaultAddress, amount],
})

// 2. After approval confirmed, deposit
writeContract({
  address: vaultAddress,
  abi: VAULT_ABI,
  functionName: 'deposit',
  args: [amount, userAddress],
})
```

## 2. Withdraw Flow (Async Redeem)

Withdrawals are **asynchronous** — the vault uses a request/claim pattern because assets may be allocated to strategies.

### Step 1: Request redeem

```solidity
vault.requestRedeem(shares, controller, owner)
```

| Parameter    | Description                                          |
|--------------|------------------------------------------------------|
| `shares`     | Number of vault shares to redeem                     |
| `controller` | Address that controls the withdrawal (usually `msg.sender`) |
| `owner`      | Address that owns the shares (usually `msg.sender`)  |

**Returns:** `requestId` (uint256).

### Step 2: Derive the withdraw key

```solidity
vault.getWithdrawKey(user, nonce) → bytes32
```

The withdraw key uniquely identifies your withdrawal request. The `nonce` is incremented per user — use `vault.nonces(user) - 1` to get the nonce for the most recent request.

### Step 3: Poll for claimability

```solidity
vault.isClaimable(withdrawKey) → bool
```

The request becomes claimable once the vault operator has processed pending withdrawals and sufficient assets are available. This may take minutes to hours depending on the vault's strategy cycle.

### Step 4: Claim USDC

```solidity
vault.claim(withdrawKey) → uint256
```

**Returns:** amount of USDC transferred to the receiver.

### Example (ethers.js)

```typescript
const shares = await vault.balanceOf(signer.address)

// 1. Request redeem
const tx = await vault.requestRedeem(shares, signer.address, signer.address)
await tx.wait()

// 2. Get withdraw key
const nonce = (await vault.nonces(signer.address)) - 1n
const withdrawKey = await vault.getWithdrawKey(signer.address, nonce)

// 3. Poll until claimable
while (!(await vault.isClaimable(withdrawKey))) {
  await new Promise(r => setTimeout(r, 30_000)) // poll every 30s
}

// 4. Claim
const claimTx = await vault.claim(withdrawKey)
await claimTx.wait()
```

### Example (wagmi)

```typescript
// 1. Request redeem
writeContract({
  address: vaultAddress,
  abi: VAULT_ABI,
  functionName: 'requestRedeem',
  args: [shares, userAddress, userAddress],
})

// 2. Read withdraw key (after tx confirmed)
const withdrawKey = readContract({
  address: vaultAddress,
  abi: VAULT_ABI,
  functionName: 'getWithdrawKey',
  args: [userAddress, nonce],
})

// 3. Check claimability
const claimable = readContract({
  address: vaultAddress,
  abi: VAULT_ABI,
  functionName: 'isClaimable',
  args: [withdrawKey],
})

// 4. Claim when ready
writeContract({
  address: vaultAddress,
  abi: VAULT_ABI,
  functionName: 'claim',
  args: [withdrawKey],
})
```

## Useful Read Functions

| Function             | Description                           |
|----------------------|---------------------------------------|
| `asset()`            | Underlying token address (USDC)       |
| `decimals()`         | Vault share decimals                  |
| `totalAssets()`      | Total USDC managed by the vault       |
| `totalSupply()`      | Total vault shares outstanding        |
| `balanceOf(user)`    | User's vault share balance            |
| `convertToAssets(shares)` | Preview USDC value for shares    |
| `convertToShares(assets)` | Preview shares for USDC amount   |
| `maxRequestRedeem(owner)` | Max shares redeemable by owner   |
| `pendingWithdrawals()` | Total pending withdrawal amount     |
| `isClaimed(withdrawKey)` | Whether a request was already claimed |
