const fs = require('fs');

const path = '/Users/gauravkumarnayak/Desktop/new sih/convectnow/frontend/src/components/EvaluationPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "              <div className=\"text-3xl font-bold font-mono text-blue-400 mt-1\">\n                0.923\n              </div>",
  "              <div className=\"text-3xl font-bold font-mono text-blue-400 mt-1\">\n                {benchmark?.pod !== undefined ? benchmark.pod.toFixed(3) : (benchmark?.POD !== undefined ? benchmark.POD.toFixed(3) : '—')}\n              </div>"
);

content = content.replace(
  "              <div className=\"text-3xl font-bold font-mono text-amber-400 mt-1\">\n                0.056\n              </div>",
  "              <div className=\"text-3xl font-bold font-mono text-amber-400 mt-1\">\n                {benchmark?.far !== undefined ? benchmark.far.toFixed(3) : (benchmark?.FAR !== undefined ? benchmark.FAR.toFixed(3) : '—')}\n              </div>"
);

fs.writeFileSync(path, content);
