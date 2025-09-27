const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function testDB() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma!');
    const users = await prisma.user.findMany();
    console.log('Users:', users); // Should show []
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}
testDB();