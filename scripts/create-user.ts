import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createInterface } from 'readline'

const prisma = new PrismaClient()

interface UserInput {
  email: string
  password: string
  name?: string
  role?: string
}

function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function question(rl: ReturnType<typeof createReadlineInterface>, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function createUser() {
  const rl = createReadlineInterface()

  try {
    console.log("🚀 Création d'un nouvel utilisateur\n")

    const email = await question(rl, 'Email: ')
    if (!email) {
      throw new Error("L'email est obligatoire")
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log('\n⚠️  Un utilisateur avec cet email existe déjà.')
      const confirm = await question(rl, 'Voulez-vous mettre à jour le mot de passe ? (oui/non): ')
      if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
        console.log('Opération annulée.')
        return
      }
    }

    const password = await question(rl, 'Mot de passe (min. 6 caractères): ')
    if (!password || password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères')
    }

    const name = await question(rl, 'Nom (optionnel): ')
    const role = await question(rl, 'Rôle (user/owner, par défaut: user): ')

    const userData: UserInput = {
      email,
      password,
      role: role || 'user',
    }

    // Ajouter name seulement s'il n'est pas vide
    if (name && name.trim()) {
      userData.name = name.trim()
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(userData.password, 10)

    // Créer ou mettre à jour l'utilisateur
    const user = existingUser
      ? await prisma.user.update({
          where: { email: userData.email },
          data: {
            passwordHash,
            ...(userData.name && { name: userData.name }),
            ...(userData.role && { role: userData.role }),
          },
        })
      : await prisma.user.create({
          data: {
            email: userData.email,
            passwordHash,
            ...(userData.name && { name: userData.name }),
            role: userData.role || 'user',
          },
        })

    console.log('\n✅ Utilisateur créé avec succès !')
    console.log('\nDétails:')
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Nom: ${user.name || '(non défini)'}`)
    console.log(`  Rôle: ${user.role}`)
  } catch (error) {
    console.error("\n❌ Erreur lors de la création de l'utilisateur:", error)
    process.exit(1)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

createUser()
