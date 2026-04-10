import net from 'net';
import fs from 'fs';

const client = new net.Socket();
client.setTimeout(2000);

client.connect(5173, '127.0.0.1', () => {
  fs.writeFileSync('port_status.txt', 'OPEN');
  client.destroy();
});

client.on('error', (err) => {
  fs.writeFileSync('port_status.txt', 'CLOSED: ' + err.message);
  client.destroy();
});

client.on('timeout', () => {
  fs.writeFileSync('port_status.txt', 'TIMEOUT');
  client.destroy();
});
