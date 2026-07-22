const fs = require('fs');
const parser = require('@babel/parser');

function checkFile(code) {
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    return true;
  } catch (e) {
    return false;
  }
}

const code = fs.readFileSync('src/app/barber/dashboard/page.tsx', 'utf8');
const lines = code.split('\n');

for (let i = 460; i < 1140; i++) {
  const testLines = [...lines];
  testLines.splice(i, 1);
  if (checkFile(testLines.join('\n'))) {
    console.log(`Removing line ${i+1} fixes the parsing error!`);
  }
}
