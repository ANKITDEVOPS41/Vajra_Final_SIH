const fs = require('fs');

const path = '/Users/gauravkumarnayak/Desktop/new sih/convectnow/frontend/src/components/scrollytelling/StormAnatomyScrolly.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<DataProvenanceBadge source="VIRTUAL" />',
  '<DataProvenanceBadge source="DATASET" />'
);

fs.writeFileSync(path, content);
