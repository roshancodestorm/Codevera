const { spawn } = require('child_process');
const WebSocket = require('ws');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CDP_PORT = 9336;
const PROFILE = 'C:/Temp/chrome-test-' + Date.now();

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--user-data-dir=' + PROFILE, '--remote-debugging-port=' + CDP_PORT,
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function test() {
  await sleep(3000);
  const resp = await fetch('http://127.0.0.1:' + CDP_PORT + '/json/version');
  const data = await resp.json();
  const ws = new WebSocket(data.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  
  let id = 0;
  const pending = new Map();
  ws.on('message', raw => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  
  const send = (method, params = {}) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  
  await send('Page.enable');
  await send('Runtime.enable');
  
  console.log('Navigating to app...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/' });
  
  // Wait for load event
  await new Promise((res, rej) => {
    ws.on('message', raw => {
      const msg = JSON.parse(raw.toString());
      if (msg.method === 'Page.loadEventFired') res();
    });
  });
  console.log('Load event fired');
  
  // Wait a bit more for JS execution
  await sleep(5000);
  
  // Check for the rail button
  const result = await send('Runtime.evaluate', { 
    expression: 'document.querySelector("[data-tool=text]") !== null', 
    returnByValue: true 
  });
  console.log('Text tool button exists:', result.result?.result?.value);
  
  // Get all rail buttons
  const rails = await send('Runtime.evaluate', { 
    expression: 'Array.from(document.querySelectorAll("[data-tool]")).map(b => b.getAttribute("data-tool"))', 
    returnByValue: true 
  });
  console.log('Rail tools:', rails.result?.result?.value);
  
  // Check for console errors
  const errors = await send('Runtime.evaluate', { 
    expression: 'window.__cdpErrors || []', 
    returnByValue: true 
  });
  console.log('Errors:', errors.result?.result?.value);
  
  // Check body innerHTML length
  const body = await send('Runtime.evaluate', { 
    expression: 'document.body.innerHTML.length', 
    returnByValue: true 
  });
  console.log('Body length:', body.result?.result?.value);
  
  ws.close();
  chrome.kill();
}

test().catch(e => { console.error(e); chrome.kill(); });