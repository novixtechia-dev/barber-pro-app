const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('page_test.tsx', 'utf8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("Success");
} catch (e) {
  console.log(e);
}
