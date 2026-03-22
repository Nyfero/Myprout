const { exec } = require('child_process');
const path = require('path');

// Couleurs ANSI (pas besoin de chalk !)
const colors = {
  green:   (text) => `\x1b[32m${text}\x1b[0m`,
  blue:    (text) => `\x1b[34m${text}\x1b[0m`,
  red:     (text) => `\x1b[31m${text}\x1b[0m`,
  yellow:  (text) => `\x1b[33m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan:    (text) => `\x1b[36m${text}\x1b[0m`,
};

// Chemins vers les dossiers frontend et backend
const frontendPath = path.join(__dirname, 'frontend');
const backendPath  = path.join(__dirname, 'backend');

// Fonction pour lancer une commande et afficher les logs
const runCommand = (command, cwd, name, color) => {
  const child = exec(command, { cwd });

  child.stdout.on('data', (data) => {
    console.log(colors[color](`[${name}] ${data.toString().trim()}`));
  });

  child.stderr.on('data', (data) => {
    console.error(colors.red(`[${name} ERROR] ${data.toString().trim()}`));
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(colors.red(`[${name}] Process exited with code ${code}`));
    }
  });

  return child;
};

console.log(colors.cyan('🚀 Démarrage du projet...'));
console.log(colors.cyan('================================'));

// Lancer Prisma migrate (optionnel, retire si non nécessaire)
const prismaProcess = runCommand(
  'npx prisma migrate deploy',
  backendPath,
  'PRISMA',
  'magenta'
);

// Lancer le frontend (Vue 3 avec Vite)
const frontendProcess = runCommand(
  'npm run dev',
  frontendPath,
  'FRONTEND',
  'green'
);

// Lancer le backend (Node.js + Prisma)
const backendProcess = runCommand(
  'npx nodemon --exec "npx tsx" src/index.ts',
  backendPath,
  'BACKEND',
  'blue'
);

// Gestion de la fermeture propre (Ctrl+C)
process.on('SIGINT', () => {
  console.log(colors.yellow('\n⛔ Arrêt des serveurs...'));
  frontendProcess.kill();
  backendProcess.kill();
  prismaProcess.kill();
  process.exit(0);
});
