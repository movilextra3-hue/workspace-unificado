'use strict';
// Script para enviar SOL usando @solana/web3.js
// Seguridad: no subas este archivo con claves reales; en producción usa process.env.
const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

// CONFIGURACIÓN
const CANTIDAD_NETA = 0.00132799; // SOL que debe recibir el destinatario
const FEE_ESTIMADO = 0.000005; // Fee estimado
const CANTIDAD_TOTAL = CANTIDAD_NETA + FEE_ESTIMADO;

// Tu clave privada (NUNCA la compartas ni la subas a repositorios)
const PRIVATE_KEY_BASE58 = process.env.SOLANA_PRIVATE_KEY_BASE58 || 'TU_CLAVE_PRIVADA_AQUI';

// Dirección destino
const DESTINO = process.env.SOLANA_DESTINO || 'DIRECCION_DESTINO_AQUI';

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
