const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src/modules', function (filePath) {
    if (filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');

        let originalContent = content;

        // This regex looks for req.params.SOMETHING when it's NOT already casted
        content = content.replace(/(?<!\()req\.params\.([a-zA-Z0-9_]+)(?! as string)/g, '(req.params.$1 as string)');
        content = content.replace(/(?<!\()req\.query\.([a-zA-Z0-9_]+)(?! as string)/g, '(req.query.$1 as string)');
        content = content.replace(/(?<!\()req\.body\.([a-zA-Z0-9_]+)(?! as string)/g, '(req.body.$1 as any)');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed', filePath);
        }
    }
});
