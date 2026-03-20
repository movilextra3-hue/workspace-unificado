# Script para enviar SOL usando la API de Solana (sin CLI)
# Requiere: @solana/web3.js o puedes usar este script con Node.js

$CANTIDAD_NETA = 0.00132799  # Cantidad que debe recibir el destinatario
$FEE_ESTIMADO = 0.000005  # Fee aproximado

Write-Host "=== ENVIAR SOL USANDO API ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cantidad neta a recibir: $CANTIDAD_NETA SOL" -ForegroundColor Yellow
Write-Host "Fee estimado: ~$FEE_ESTIMADO SOL" -ForegroundColor Gray
Write-Host "Cantidad total a enviar: $($CANTIDAD_NETA + $FEE_ESTIMADO) SOL" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️ NOTA: Este script requiere Node.js y @solana/web3.js" -ForegroundColor Yellow
Write-Host ""

# Verificar Node.js
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeInstalled) {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "OPCIÓN 1: Instalar Node.js y usar script JavaScript" -ForegroundColor Yellow
    Write-Host "OPCIÓN 2: Instalar Solana CLI y usar comandos directos" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== OPCIÓN 1: SCRIPT JAVASCRIPT ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Instala Node.js: https://nodejs.org/" -ForegroundColor Gray
    Write-Host "2. Instala dependencias:" -ForegroundColor Gray
    Write-Host "   npm install @solana/web3.js bs58" -ForegroundColor Yellow
    Write-Host "3. Usa el script JavaScript que se creará" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=== OPCIÓN 2: SOLANA CLI ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Instala Solana CLI:" -ForegroundColor Gray
    Write-Host "   Windows: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    Write-Host "2. Configura tu clave privada:" -ForegroundColor Gray
    Write-Host "   solana config set --keypair <ruta_clave_privada.json>" -ForegroundColor Yellow
    Write-Host "3. Ejecuta:" -ForegroundColor Gray
    Write-Host "   solana transfer <destino> $($CANTIDAD_NETA + $FEE_ESTIMADO) --allow-unfunded-recipient" -ForegroundColor Yellow
    Write-Host ""
}

# Crear script JavaScript
$jsScript = @"
// Script para enviar SOL usando @solana/web3.js
const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

// CONFIGURACIÓN
const CANTIDAD_NETA = 0.00132799; // SOL que debe recibir el destinatario
const FEE_ESTIMADO = 0.000005; // Fee estimado
const CANTIDAD_TOTAL = CANTIDAD_NETA + FEE_ESTIMADO;

// Tu clave privada (NUNCA la compartas)
const PRIVATE_KEY_BASE58 = 'TU_CLAVE_PRIVADA_AQUI'; // Reemplaza con tu clave privada

// Dirección destino
const DESTINO = 'DIRECCION_DESTINO_AQUI'; // Reemplaza con la dirección destino

// Configuración de red
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

async function enviarSOL() {
    try {
        // Cargar clave privada
        const secretKey = bs58.decode(PRIVATE_KEY_BASE58);
        const fromKeypair = Keypair.fromSecretKey(secretKey);
        
        console.log('Dirección origen:', fromKeypair.publicKey.toBase58());
        console.log('Dirección destino:', DESTINO);
        console.log('Cantidad total a enviar:', CANTIDAD_TOTAL, 'SOL');
        console.log('Cantidad neta a recibir:', CANTIDAD_NETA, 'SOL');
        console.log('Fee estimado:', FEE_ESTIMADO, 'SOL');
        console.log('');
        
        // Verificar balance
        const balance = await connection.getBalance(fromKeypair.publicKey);
        const balanceSOL = balance / LAMPORTS_PER_SOL;
        console.log('Balance actual:', balanceSOL, 'SOL');
        
        if (balanceSOL < CANTIDAD_TOTAL) {
            console.error('❌ Error: Balance insuficiente');
            console.error('Necesitas:', CANTIDAD_TOTAL, 'SOL');
            console.error('Tienes:', balanceSOL, 'SOL');
            return;
        }
        
        // Crear transacción
        const toPublicKey = new PublicKey(DESTINO);
        const lamportsToSend = Math.floor(CANTIDAD_TOTAL * LAMPORTS_PER_SOL);
        
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: toPublicKey,
                lamports: lamportsToSend,
            })
        );
        
        // Obtener blockhash reciente
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromKeypair.publicKey;
        
        // Firmar transacción
        transaction.sign(fromKeypair);
        
        // Enviar transacción
        console.log('Enviando transacción...');
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            maxRetries: 3
        });
        
        console.log('');
        console.log('✅ Transacción enviada');
        console.log('Signature:', signature);
        console.log('');
        console.log('Verificar en:');
        console.log('  https://explorer.solana.com/tx/' + signature);
        console.log('  https://solscan.io/tx/' + signature);
        console.log('');
        
        // Confirmar transacción
        console.log('Esperando confirmación...');
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            console.error('❌ Error en la transacción:', confirmation.value.err);
        } else {
            console.log('✅ Transacción confirmada');
            console.log('Slot:', confirmation.value.slot);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Ejecutar
enviarSOL();
"@

$jsScript | Out-File "C:\Users\Administrador\Desktop\enviar_sol.js" -Encoding UTF8
Write-Host "✓ Script JavaScript creado: enviar_sol.js" -ForegroundColor Green
Write-Host ""

Write-Host "=== INSTRUCCIONES PARA USAR EL SCRIPT JAVASCRIPT ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Instala Node.js: https://nodejs.org/" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Instala las dependencias:" -ForegroundColor Gray
Write-Host "   npm install @solana/web3.js bs58" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Edita el archivo enviar_sol.js:" -ForegroundColor Gray
Write-Host "   - Reemplaza 'TU_CLAVE_PRIVADA_AQUI' con tu clave privada" -ForegroundColor Yellow
Write-Host "   - Reemplaza 'DIRECCION_DESTINO_AQUI' con la dirección destino" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Ejecuta:" -ForegroundColor Gray
Write-Host "   node enviar_sol.js" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== COMANDO DIRECTO (SI TIENES SOLANA CLI) ===" -ForegroundColor Cyan
Write-Host ""
$destino = Read-Host "Ingresa la dirección destino (o presiona Enter para saltar)"

if ($destino -and $destino.Length -eq 44) {
    $cantidadTotal = $CANTIDAD_NETA + $FEE_ESTIMADO
    Write-Host ""
    Write-Host "Comando a ejecutar:" -ForegroundColor Yellow
    Write-Host "solana transfer $destino $cantidadTotal --allow-unfunded-recipient" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Cantidad neta a recibir: $CANTIDAD_NETA SOL" -ForegroundColor Green
    Write-Host "Fee estimado: $FEE_ESTIMADO SOL" -ForegroundColor Gray
    Write-Host "Cantidad total: $cantidadTotal SOL" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Dirección no proporcionada o inválida." -ForegroundColor Yellow
    Write-Host "Usa el script JavaScript o proporciona la dirección cuando ejecutes el comando." -ForegroundColor Gray
}
