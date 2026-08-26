const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function resolveConflictsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('<<<<<<< HEAD')) return;
  
  // Regex to match conflict blocks
  // <<<<<<< HEAD\n(content1)=======\n(content2)>>>>>>> <hash>\n
  const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> [a-f0-9]+\r?\n/g;
  
  const resolved = content.replace(regex, '$1');
  
  fs.writeFileSync(filePath, resolved, 'utf8');
  console.log(`Resolved: ${filePath}`);
}

const filesToCheck = [
  'vite.config.js',
  'src/services/api.js',
  'src/index.css',
  'src/data.js',
  'src/App.jsx',
  'setup.ps1',
  'index.html',
  'package.json'
];

filesToCheck.forEach(f => {
  const fullPath = path.join(__dirname, f);
  if (fs.existsSync(fullPath)) {
    resolveConflictsInFile(fullPath);
  }
});
