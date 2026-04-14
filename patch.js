const fs = require('fs');
const filepath = 'src/hooks/useB3Data.ts';
let code = fs.readFileSync(filepath, 'utf8');

// Fix: Get ALL transaction data, not just ticker
code = code.replace(
  /.select\("ticker"\)\s*\n\s*\.eq\("user_id", user\.id\);/g,
  `.select("*")
        .eq("user_id", user.id);`
);

fs.writeFileSync(filepath, code);
