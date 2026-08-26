const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'src', 'services', 'api.js');
let code = fs.readFileSync(apiPath, 'utf8');

// 1. Remove data imports
code = code.replace(/import\s+\{.*\}\s+from\s+["']\.\.\/data["'];?\n*/, '');

// 2. Remove mock state variables
code = code.replace(/let\s+_(docs|tags|users|nextDocId|nextTagId|nextUserId|mockSettings)[^;]+;\n/g, '');
code = code.replace(/let\s+_mockSettings\s*=\s*\{[\s\S]*?\};\n/g, '');

// 3. Remove canUseMockFallback
code = code.replace(/function canUseMockFallback\(error\)\s*\{[\s\S]*?\}/, '');

function removeMockBlocks(source) {
  const catchPattern = /catch\s*\([^)]*\)\s*\{[^{}]*canUseMockFallback[^{}]*\}/g;
  
  let match;
  while ((match = catchPattern.exec(source)) !== null) {
    const catchStart = match.index;
    
    // Find the matching 'try {' for this catch
    const tryStart = source.lastIndexOf('try {', catchStart);
    
    // We want to extract the content inside the try block
    let tryContentStart = tryStart + 'try {'.length;
    let tryContentEnd = source.lastIndexOf('}', catchStart);
    
    const tryContent = source.substring(tryContentStart, tryContentEnd).trim();
    
    // Find the end of the method (next }, \n  }, or similar)
    const methodEnd = source.indexOf('  },', catchBlockEnd = catchStart + match[0].length);
    if (methodEnd === -1) break;
    
    const methodStart = source.lastIndexOf('async', tryStart);
    const methodHeader = source.substring(methodStart, tryStart);
    
    const newMethod = methodHeader + tryContent + '\n';
    
    source = source.substring(0, methodStart) + newMethod + source.substring(methodEnd);
    catchPattern.lastIndex = 0; // reset
  }
  return source;
}

code = removeMockBlocks(code);
code = code.replace(/const MOCK_FALLBACK_ENABLED =.*?\n/, '');

fs.writeFileSync(apiPath, code);
console.log("api.js cleaned successfully!");
