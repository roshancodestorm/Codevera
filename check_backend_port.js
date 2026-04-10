import net from 'net';
import fs from 'fs';

const client = new net.Socket();
client.setTimeout(2000);

client.connect(5000, '127.0.0.1', () => {
  fs.writeFileSync('backend_status.txt', 'OPEN');
  client.destroy();
});

client.on('error', (err) => {
  fs.writeFileSync('backend_status.txt', 'CLOSED: ' + err.message);
  client.destroy();
});

client.on('timeout', () => {
  fs.writeFileSync('backend_status.txt', 'TIMEOUT');
  client.destroy();
});
