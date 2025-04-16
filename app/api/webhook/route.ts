import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_BASE_URL = 'https://api.brevo.com/v3/contacts'

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''
}

function upper(str: string) {
  return str?.toUpperCase() || ''
}

function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.startsWith('0') ? '33' + cleaned.slice(1) : '33' + cleaned
}

function formatAmount(amount: number) {
  return (amount / 100).toFixed(2).replace('.', ',') + '€'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = body.data
    const payer = data.payer
    const item = data.items?.[0]

    // 🔍 Ajout du log des clés de données reçues
    console.log("🔍 Clés reçues depuis HelloAsso :", Object.keys(data))

    const email = payer.email?.trim().toLowerCase()
    const prenom = capitalize(item?.user?.firstName || payer.firstName || '')
    const nom = upper(item?.user?.lastName || payer.lastName || '')

    const rawPhone = data.phone || ''
    const phone = rawPhone ? formatPhone(rawPhone) : undefined

    const dateNaissance = data.customFields?.date_naissance || ''
    const codePromo = item?.discount?.code || ''
    const montantCodePromo = formatAmount(item?.discount?.amount || 0)
    const prixBillet = formatAmount(item?.initialAmount || 0)

    const parrain = capitalize(data['Parrain'] || data['Nom de votre parrain'] || '')
    const filleul1 = capitalize(data['Nom de votre filleul'] || data['Filleul'] || data['Filleul 1'] || '')
    const filleul2 = capitalize(data['Filleul 2'] || '')
    const filleul3 = capitalize(data['Filleul 3'] || '')

    const tag = data.formSlug

    const attributes: Record<string, string> = {
      PRENOM: prenom,
      NOM: nom,
      DATE_NAISSANCE: dateNaissance,
      CODE_PROMO: codePromo,
      MONTANT_CODE_PROMO: montantCodePromo,
      PRIX_BILLET: prixBillet,
      PARRAIN: parrain,
      FILLEUL_1: filleul1,
      FILLEUL_2: filleul2,
      FILLEUL_3: filleul3,
    }

    if (phone) {
      attributes.SMS = phone
    }

    console.log('📨 Données HelloAsso formatées :', {
      email,
      attributes,
      tag
    })

    const headers = {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    await axios.post(
      BREVO_BASE_URL,
      {
        email,
        attributes,
        updateEnabled: true,
        listIds: [],
        updateEnabledSms: true,
        tags: [tag],
      },
      { headers }
    )

    console.log(`✅ Contact ${email} ajouté ou mis à jour avec succès.`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Erreur webhook HelloAsso → Brevo :', error)
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Webhook opérationnel' })
}
