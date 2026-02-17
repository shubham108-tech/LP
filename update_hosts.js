const fs = require('fs');
const os = require('os');
const path = require('path'); // Added path module just in case

// Configuration
const DOMAIN = 'shubham.com';
// Detect hosts file path
const HOSTS_FILE = process.platform === 'win32'
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/drivers/etc/hosts')
    : '/etc/hosts';

function getLocalIP() {
    const nets = os.networkInterfaces();
    const candidates = [];

    console.log('\n[Auto-Domain] Interface Scan:');

    for (const name of Object.keys(nets)) {
        // Skip virtual adapters
        const lowerName = name.toLowerCase();
        if (lowerName.includes('vmware') ||
            lowerName.includes('virtual') ||
            lowerName.includes('vethernet') ||
            lowerName.includes('pseudo') ||
            lowerName.includes('loopback')) {
            console.log(`  - Skipping Virtual Adapter: ${name}`);
            continue;
        }

        for (const net of nets[name]) {
            // Skip non-IPv4 and internal (localhost)
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`  - Found: ${net.address} (${name})`);
                candidates.push({ address: net.address, name: name });
            }
        }
    }

    if (candidates.length === 0) return '127.0.0.1';

    // Strategy 1: User explicitly mentioned 172.x.x.x range
    const userPreferred = candidates.find(c => c.address.startsWith('172.'));
    if (userPreferred) {
        console.log(`  -> Selected (User Preference 172.x): ${userPreferred.address}`);
        return userPreferred.address;
    }

    // Strategy 2: Remove addresses ending in .1 (often virtual gateways/host-only adapters like VMnet)
    // ONLY if we have other options.
    const nonGateway = candidates.filter(c => !c.address.endsWith('.1'));

    // Strategy 3: Prioritize common LAN ranges among non-gateway
    if (nonGateway.length > 0) {
        // Class A/B private networks (10.x, 172.x) often real LANs in corporate/uni settings
        const classAB = nonGateway.find(c => c.address.startsWith('10.') || c.address.startsWith('172.'));
        if (classAB) {
            console.log(`  -> Selected (Class A/B): ${classAB.address}`);
            return classAB.address;
        }

        // Class C (192.168.x.x) - standard home WiFi
        const classC = nonGateway.find(c => c.address.startsWith('192.168.'));
        if (classC) {
            console.log(`  -> Selected (Class C): ${classC.address}`);
            return classC.address;
        }

        console.log(`  -> Selected (Best Candidate): ${nonGateway[0].address}`);
        return nonGateway[0].address;
    }

    // Fallback: If only .1 addresses exist, use the first one (might be the only adapter)
    console.log(`  -> Selected (Fallback): ${candidates[0].address}`);
    return candidates[0].address;
}

const ip = getLocalIP();
console.log(`[Auto-Domain] Mapping ${DOMAIN} -> ${ip}`);

try {
    let content = '';
    if (fs.existsSync(HOSTS_FILE)) {
        content = fs.readFileSync(HOSTS_FILE, 'utf8');
    }

    // Clean old entries for this domain
    const lines = content.split(/\r?\n/);
    const newLines = lines.filter(line => !line.trim().endsWith(DOMAIN) && line.trim() !== '');

    // Add new mapping
    newLines.push(`${ip}       ${DOMAIN}`);

    // Write
    fs.writeFileSync(HOSTS_FILE, newLines.join('\r\n'), 'utf8');

    console.log(`[Auto-Domain] SUCCESS: Hosts file updated.`);
    console.log(`[Auto-Domain] Access at: http://${DOMAIN}:5173`);
} catch (err) {
    if (err.code === 'EPERM' || err.code === 'EACCES') {
        console.warn('\n[Auto-Domain] WARNING: Permission Denied to Hosts File.');
        console.warn('  -> Run your terminal as Administrator to fix this.');
        console.warn(`  -> You can still use the IP manually: http://${ip}:5173`);
    } else {
        console.error('[Auto-Domain] Unexpected Error:', err.message);
    }
}
