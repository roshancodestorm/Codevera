const fsp = require('fs/promises');
const path = require('path');
(async () => {
    try {
        const data = await fsp.readFile('F:/Projects/Codestrom/.ide/live-tasks.json', 'utf8');
        const obj = JSON.parse(data);
        const tasks = obj.tasks || [];
        const task = tasks.find(t => t && t.id && t.id.includes('agriculture')) || tasks[tasks.length - 1];
        
        let indexHtml = '', scriptJs = '';
        for(let e of task.events) {
            if (e.detail && typeof e.detail === 'string') {
                if (e.detail.includes('"path":"index.html"')) {
                    try { const d = JSON.parse(e.detail); if(d.content) indexHtml = d.content; } catch(err){}
                }
                if (e.detail.includes('"path":"script.js"')) {
                    try { const d = JSON.parse(e.detail); if(d.content) scriptJs = d.content; } catch(err){}
                }
            }
        }
        
        const outDir = 'F:/Projects/Codestrom/workspaces/agriculture-farming-showcase';
        if (indexHtml) await fsp.writeFile(path.join(outDir, 'index.html'), indexHtml, 'utf8');
        if (scriptJs) await fsp.writeFile(path.join(outDir, 'script.js'), scriptJs, 'utf8');
        
        console.log('index.html size:', indexHtml.length);
        console.log('script.js size:', scriptJs.length);
    } catch (err) {
        console.error(err);
    }
})();
