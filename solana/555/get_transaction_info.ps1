# Obtener información de una transacción/hash de Solana
$signature = "3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9zpjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz"

Write-Host "=== INFORMACIÓN DE TRANSACCIÓN/HASH DE CREACIÓN DE TOKEN SPL ===" -ForegroundColor Cyan
Write-Host "Signature/Hash: $signature" -ForegroundColor Yellow
Write-Host "Longitud: $($signature.Length) caracteres" -ForegroundColor Gray
Write-Host ""

# Verificar formato (las firmas de Solana tienen 88 caracteres en Base58)
$base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
$isBase58 = $true
foreach ($char in $signature.ToCharArray()) {
    if ($base58Chars.IndexOf($char) -eq -1) {
        $isBase58 = $false
        break
    }
}

if ($isBase58 -and $signature.Length -eq 88) {
    Write-Host "✓ Formato válido para firma de transacción Solana (88 caracteres Base58)" -ForegroundColor Green
} else {
    Write-Host "✗ Formato no válido para firma de transacción" -ForegroundColor Red
}

Write-Host ""
Write-Host "1. Obteniendo información de la transacción..." -ForegroundColor Green

try {
    $txBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getTransaction"
        params = @(
            $signature,
            @{
                encoding = "jsonParsed"
                maxSupportedTransactionVersion = 0
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $txBody
    
    if ($response.result) {
        $tx = $response.result
        Write-Host "   ✓ Transacción encontrada" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "=== DETALLES DE LA TRANSACCIÓN ===" -ForegroundColor Cyan
        
        # Slot
        if ($tx.slot) {
            Write-Host "Slot: $($tx.slot)" -ForegroundColor Cyan
        }
        
        # Block Time
        if ($tx.blockTime) {
            $blockTime = [DateTimeOffset]::FromUnixTimeSeconds($tx.blockTime).DateTime
            Write-Host "Fecha/Hora: $blockTime" -ForegroundColor Cyan
        }
        
        # Error
        if ($tx.meta.err) {
            Write-Host "Estado: ERROR - $($tx.meta.err)" -ForegroundColor Red
        } else {
            Write-Host "Estado: ÉXITO" -ForegroundColor Green
        }
        
        # Fee
        if ($tx.meta.fee) {
            $feeSOL = [math]::Round($tx.meta.fee / 1000000000, 9)
            Write-Host "Fee: $feeSOL SOL ($($tx.meta.fee) lamports)" -ForegroundColor Cyan
        }
        
        # Instructions
        if ($tx.transaction.message.instructions) {
            Write-Host ""
            Write-Host "=== INSTRUCCIONES ===" -ForegroundColor Yellow
            $instructionCount = 0
            foreach ($ix in $tx.transaction.message.instructions) {
                $instructionCount++
                Write-Host "Instrucción ${instructionCount}:" -ForegroundColor Cyan
                
                if ($ix.parsed) {
                    Write-Host "  Tipo: $($ix.parsed.type)" -ForegroundColor Gray
                    if ($ix.parsed.info) {
                        $info = $ix.parsed.info
                        if ($info.mint) {
                            Write-Host "  Mint: $($info.mint)" -ForegroundColor Green
                        }
                        if ($info.mintAuthority) {
                            Write-Host "  Mint Authority: $($info.mintAuthority)" -ForegroundColor Gray
                        }
                        if ($info.freezeAuthority) {
                            Write-Host "  Freeze Authority: $($info.freezeAuthority)" -ForegroundColor Gray
                        }
                        if ($info.decimals) {
                            Write-Host "  Decimals: $($info.decimals)" -ForegroundColor Gray
                        }
                        if ($info.account) {
                            Write-Host "  Account: $($info.account)" -ForegroundColor Gray
                        }
                        if ($info.owner) {
                            Write-Host "  Owner: $($info.owner)" -ForegroundColor Gray
                        }
                    }
                } else {
                    Write-Host "  Programa: $($ix.programId)" -ForegroundColor Gray
                }
            }
        }
        
        # Account Keys
        if ($tx.transaction.message.accountKeys) {
            Write-Host ""
            Write-Host "=== CUENTAS INVOLUCRADAS ===" -ForegroundColor Yellow
            foreach ($account in $tx.transaction.message.accountKeys) {
                if ($account.pubkey) {
                    Write-Host "  - $($account.pubkey)" -ForegroundColor Gray
                }
            }
        }
        
        # Pre/Post Token Balances
        if ($tx.meta.preTokenBalances -or $tx.meta.postTokenBalances) {
            Write-Host ""
            Write-Host "=== BALANCES DE TOKENS ===" -ForegroundColor Yellow
            if ($tx.meta.preTokenBalances) {
                Write-Host "Antes:" -ForegroundColor Cyan
                foreach ($balance in $tx.meta.preTokenBalances) {
                    Write-Host "  Account: $($balance.accountIndex)" -ForegroundColor Gray
                    if ($balance.mint) {
                        Write-Host "    Mint: $($balance.mint)" -ForegroundColor Green
                    }
                }
            }
            if ($tx.meta.postTokenBalances) {
                Write-Host "Después:" -ForegroundColor Cyan
                foreach ($balance in $tx.meta.postTokenBalances) {
                    Write-Host "  Account: $($balance.accountIndex)" -ForegroundColor Gray
                    if ($balance.mint) {
                        Write-Host "    Mint: $($balance.mint)" -ForegroundColor Green
                    }
                    if ($balance.uiTokenAmount) {
                        Write-Host "    Amount: $($balance.uiTokenAmount.uiAmount)" -ForegroundColor Green
                    }
                }
            }
        }
        
        # Logs
        if ($tx.meta.logMessages) {
            Write-Host ""
            Write-Host "=== LOGS (últimos 10) ===" -ForegroundColor Yellow
            $logs = $tx.meta.logMessages | Select-Object -First 10
            foreach ($log in $logs) {
                Write-Host "  $log" -ForegroundColor Gray
            }
        }
        
    } else {
        Write-Host "   ✗ Transacción no encontrada" -ForegroundColor Red
        Write-Host ""
        Write-Host "Posibles razones:" -ForegroundColor Yellow
        Write-Host "  - La transacción no existe en mainnet" -ForegroundColor Gray
        Write-Host "  - La transacción fue en testnet o devnet" -ForegroundColor Gray
        Write-Host "  - El hash es incorrecto" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ENLACES ===" -ForegroundColor Cyan
Write-Host "Solana Explorer: https://explorer.solana.com/tx/$signature" -ForegroundColor Yellow
Write-Host "Solscan: https://solscan.io/tx/$signature" -ForegroundColor Yellow
Write-Host "Solana Beach: https://solanabeach.io/transaction/$signature" -ForegroundColor Yellow
