// scripts/ngrok-setup.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Iniciando Ngrok...');

const port = process.env.PORT || 3333;

// Usar spawn para processo contínuo
const ngrok = spawn('ngrok', ['http', port, '--region=sa', '--log=stdout']);

ngrok.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);

    // Extrair URL do ngrok
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok-free\.app/);
    if (urlMatch) {
        const ngrokUrl = urlMatch[0];
        console.log(`\n✅ Ngrok URL: ${ngrokUrl}`);
        console.log(`📋 Configure no Asaas: ${ngrokUrl}/webhook/asaas`);

        // Salvar URL em arquivo
        fs.writeFileSync('.ngrok-url', ngrokUrl);
    }
});

ngrok.stderr.on('data', (data) => {
    console.error(`❌ Ngrok error: ${data.toString()}`);
});

ngrok.on('close', (code) => {
    console.log(`❌ Ngrok process exited with code ${code}`);
});

// Encerramento graceful
process.on('SIGINT', () => {
    ngrok.kill('SIGINT');
    process.exit(0);
});