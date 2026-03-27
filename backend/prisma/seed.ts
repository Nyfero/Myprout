import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  const email = process.env.ADMIN_EMAIL!;
  const firstName = process.env.ADMIN_FIRSTNAME!;
  const lastName = process.env.ADMIN_LASTNAME!;
  const password_hash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12);

  // 1. Créer ou récupérer le rôle ADMIN
  const adminRole = await prisma.roles.upsert({
    where: { role_id: 1 },
    update: {},
    create: {
      role: 'ADMIN',
    },
  });

  console.log('✅ Rôle créé :', adminRole);

  // 2. Créer l'utilisateur admin
  const admin = await prisma.users.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstName,
      lastName,
      password_hash,
      is_active: true,
      roles: {
        connect: { role_id: adminRole.role_id },
      },
    },
  });

  console.log('✅ Admin créé avec succès :', admin);
}

main()
  .catch((e) => {
    console.error('❌ Erreur :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
