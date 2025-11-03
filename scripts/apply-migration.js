/**
 * Script pour appliquer la migration SQL manuellement
 * Usage: node scripts/apply-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Application de la migration...');
    
    // Lire le fichier SQL de migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_template_type_and_variables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Exécuter chaque commande SQL séparément
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of commands) {
      if (command) {
        console.log(`Exécution: ${command.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(command);
      }
    }
    
    console.log('✅ Migration appliquée avec succès!');
    console.log('Vous pouvez maintenant régénérer le client Prisma avec: npx prisma generate');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Les colonnes existent déjà. La migration a peut-être déjà été appliquée.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

