const os = require('os');
const fs = require('fs');

const nets = os.networkInterfaces();
fs.writeFileSync('debug_nets.json', JSON.stringify(nets, null, 2));
console.log('Saved debug_nets.json');
