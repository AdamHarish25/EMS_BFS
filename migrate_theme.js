const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /(?<!dark:)bg-slate-950/g, replace: 'bg-slate-50 dark:bg-slate-950' },
  { regex: /(?<!dark:)bg-slate-900/g, replace: 'bg-white dark:bg-slate-900' },
  { regex: /(?<!dark:)bg-slate-800/g, replace: 'bg-slate-100 dark:bg-slate-800' },
  { regex: /(?<!dark:)text-slate-50(?![0-9])/g, replace: 'text-slate-900 dark:text-slate-50' },
  { regex: /(?<!dark:)text-slate-100/g, replace: 'text-slate-800 dark:text-slate-100' },
  { regex: /(?<!dark:)text-slate-200/g, replace: 'text-slate-700 dark:text-slate-200' },
  { regex: /(?<!dark:)text-slate-300/g, replace: 'text-slate-600 dark:text-slate-300' },
  { regex: /(?<!dark:)text-slate-400/g, replace: 'text-slate-500 dark:text-slate-400' },
  { regex: /(?<!dark:)border-slate-800\/80/g, replace: 'border-slate-200 dark:border-slate-800/80' },
  { regex: /(?<!dark:)border-slate-800\/50/g, replace: 'border-slate-200 dark:border-slate-800/50' },
  { regex: /(?<!dark:)border-slate-800(?![\/0-9])/g, replace: 'border-slate-200 dark:border-slate-800' },
  { regex: /(?<!dark:)border-slate-700/g, replace: 'border-slate-300 dark:border-slate-700' },
  { regex: /(?<!dark:)bg-slate-900\/60/g, replace: 'bg-slate-50 dark:bg-slate-900/60' },
  { regex: /(?<!dark:)bg-slate-800\/50/g, replace: 'bg-slate-100 dark:bg-slate-800/50' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      processFile(fullPath);
    }
  });
}

processDirectory(path.join(__dirname, 'app'));
processDirectory(path.join(__dirname, 'components'));

