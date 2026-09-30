import ts from 'typescript';
import fs from 'fs';

const content = fs.readFileSync('src/app/pages/Settings.tsx', 'utf8');
const sf = ts.createSourceFile('Settings.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log('Active Settings.tsx parse diagnostics count:', sf.parseDiagnostics.length);
sf.parseDiagnostics.forEach(d => {
  const pos = d.file.getLineAndCharacterOfPosition(d.start);
  console.log(`Line ${pos.line + 1}:${pos.character + 1} - ${d.messageText}`);
});







