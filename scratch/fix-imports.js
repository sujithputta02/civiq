import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiSrc = path.resolve(__dirname, '../apps/api/src');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Regex to find relative imports that don't have an extension
      // It looks for from './something' or from "../something"
      // And replaces with from './something.js' or from "../something.js"
      const newContent = content.replace(
        /from\s+(['"])(\.\.?\/[^'"]+)(['"])/g,
        (match, quote, importPath, endQuote) => {
          if (
            importPath.endsWith('.js') ||
            importPath.endsWith('.css') ||
            importPath.endsWith('.json')
          ) {
            return match;
          }
          return `from ${quote}${importPath}.js${endQuote}`;
        }
      );

      if (content !== newContent) {
        console.log(`Updated imports in: ${fullPath}`);
        fs.writeFileSync(fullPath, newContent);
      }
    }
  }
}

processDirectory(apiSrc);
