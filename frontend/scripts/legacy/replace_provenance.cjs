const fs = require('fs');

const path = '/Users/gauravkumarnayak/Desktop/new sih/convectnow/frontend/src/components/DataProvenanceBadge.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "export type ProvenanceSource = 'LIVE' | 'VIRTUAL' | 'DATASET' | 'PLANNED';",
  "export type ProvenanceSource = 'LIVE' | 'DATASET' | 'PLANNED';"
);

// Remove the case 'VIRTUAL': and its return
content = content.replace(
  /\n\s*case 'VIRTUAL':\s*return \([\s\S]*?\);\n/g,
  "\n"
);

fs.writeFileSync(path, content);
