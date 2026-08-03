const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel Build Process...');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    fs.readdirSync(from).forEach(element => {
        const stat = fs.lstatSync(path.join(from, element));
        if (stat.isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else if (stat.isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

try {
    console.log('📦 Installing frontend dependencies and building...');
    execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
    execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

    const srcDist = path.join(__dirname, 'frontend', 'dist');
    const targetDist = path.join(__dirname, 'dist');
    const targetPublic = path.join(__dirname, 'public');

    copyFolderSync(srcDist, targetDist);
    copyFolderSync(srcDist, targetPublic);

    console.log('✅ Successfully copied frontend/dist to root /dist & /public!');
} catch (error) {
    console.error('❌ Vercel build failed:', error);
    process.exit(1);
}
