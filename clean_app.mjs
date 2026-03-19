import { readFileSync, writeFileSync } from 'fs';

// Read the file
const content = readFileSync('./src/app/App.tsx', 'utf-8');

// Split into lines
const lines = content.split('\n');

// Keep only the first 2446 lines
const cleanedLines = lines.slice(0, 2446);

// Join back together
const cleanedContent = cleanedLines.join('\n');

// Write back to the file
writeFileSync('./src/app/App.tsx', cleanedContent);

console.log(`Cleaned file: kept ${cleanedLines.length} lines, removed ${lines.length - cleanedLines.length} duplicate lines`);
