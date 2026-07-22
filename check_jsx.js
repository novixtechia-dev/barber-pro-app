const fs = require('fs');
const ts = require('typescript');
const code = fs.readFileSync('src/app/barber/dashboard/page.tsx', 'utf-8');
const sourceFile = ts.createSourceFile('page.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function visit(node) {
  if (node.kind === ts.SyntaxKind.JsxExpression) {
    if (node.expression === undefined && node.getText() !== '{}') {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        console.log(`Empty/invalid JsxExpression at ${line+1}:${character+1}`);
    }
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);
