const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/data');
const publicDir = path.join(__dirname, 'public');

const filesToProcess = [
    path.join(srcDir, 'AllOpponents.ts'),
    path.join(srcDir, 'ModernOpponents.ts'),
    path.join(srcDir, 'opponents/classic.ts'),
    path.join(srcDir, 'opponents/modern.ts')
];

let notFound = [];

for (const file of filesToProcess) {
    if (!fs.existsSync(file)) {
        console.warn('File not found:', file);
        continue;
    }

    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Fix names with numbers (e.g. name: '紫羅蘭02' -> name: '紫羅蘭')
    // Regex matches name: 'XXX01' -> name: 'XXX'
    content = content.replace(/name:\s*'([^']+?)(?:0[1-9]|1[0-9])'/g, "name: '$1'");

    // Check URLs
    let urlRegex = /url:\s*'([^']+)'/g;
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
        let url = match[1];
        let pubPath = path.join(publicDir, url);
        if (!fs.existsSync(pubPath)) {
            notFound.push({ file: path.basename(file), url });
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed names in', path.basename(file));
    }
}

const missingJsonPath = path.join(__dirname, 'missing_urls.json');
fs.writeFileSync(missingJsonPath, JSON.stringify(notFound, null, 2));
console.log('Done checking files. Missing URLs written to missing_urls.json');
