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
  return cleaned.startsWith('0') ? '+33' + cleaned.slice(1) : '+33' + cleaned
}

function formatAmount(amount: number) {
  return (amount / 100).toFixed(2).replace('.', ',') + '€'
}

function safeText(str: string): string {
  return str
    .replace(/['"]/g, '')
    .replace(/[^\w\sÀ-ÿ-]/g, '')
    .trim()
}

type CustomField = { name: string; answer: string }

function extractCustomFields(customFieldsArray: CustomField[]) {
  const customFields: Record<string, string> = {}
  customFieldsArray?.forEach((entry) => {
    if (entry.name && entry.answer) {
      customFields[entry.name] = entry.answer
    }
  })
  return customFields
}

function mergeValues(existing: string | undefined, incoming: string): string {
  if (!existing) return incoming
  const values = existing.split(',').map(v => v.trim())
  if (values.includes(incoming)) return existing
  return [...values, incoming].join(', ')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = body.data
    const payer = data.payer
    const item = data.items?.[0]
    const rawCustomFields = extractCustomFields(item?.customFields || [])
    const email = payer.email?.trim().toLowerCase()
    const tag = data.formSlug

    // ✅ Typage propre
    let existingContact: { attributes?: Record<string, string> } = {}
    try {
      const res = await axios.get(`${BREVO_BASE_URL}/${email}`, {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      })
      existingContact = res.data
    } catch {
      existingContact = {}
    }

    const prenom = safeText(capitalize(item?.user?.firstName || payer.firstName || ''))
    const nom = safeText(upper(item?.user?.lastName || payer.lastName || ''))

    const rawPhone = rawCustomFields['Numéro de téléphone'] || ''
    const phone = rawPhone ? formatPhone(rawPhone) : undefined

    const dateNaissance = rawCustomFields['Date de naissance'] || ''
    const codePromo = item?.discount?.code || ''
    const montantCodePromo = formatAmount(item?.discount?.amount || 0)
    const prixBillet = formatAmount(item?.initialAmount || 0)

    const newParrain = safeText(capitalize(rawCustomFields['Parrain'] || ''))
    const newFilleul1 = safeText(capitalize(rawCustomFields['Filleul 1'] || ''))
    const newFilleul2 = safeText(capitalize(rawCustomFields['Filleul 2'] || ''))
    const newFilleul3 = safeText(capitalize(rawCustomFields['Filleul 3'] || ''))

    const attributes: Record<string, string> = {
      PRENOM: prenom,
      NOM: nom,
      DATE_NAISSANCE: dateNaissance,
      CODE_PROMO: codePromo,
      MONTANT_CODE_PROMO: montantCodePromo,
      PRIX_BILLET: prixBillet,
      TAG: mergeValues(existingContact?.attributes?.TAG, tag),
      PARRAIN: mergeValues(existingContact?.attributes?.PARRAIN, newParrain),
      FILLEUL_1: mergeValues(existingContact?.attributes?.FILLEUL_1, newFilleul1),
      FILLEUL_2: mergeValues(existingContact?.attributes?.FILLEUL_2, newFilleul2),
      FILLEUL_3: mergeValues(existingContact?.attributes?.FILLEUL_3, newFilleul3),
    }

    if (phone && phone.match(/^\+33\d{9}$/)) {
      attributes.SMS = phone
    }

    console.log('📨 Données HelloAsso formatées :', {
      email,
      attributes
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
      },
      { headers }
    )

    console.log(`✅ Contact ${email} ajouté ou mis à jour avec succès.`)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Brevo a répondu :', error.response?.data)
    } else {
      console.error('❌ Erreur webhook HelloAsso → Brevo :', error)
    }
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Webhook opérationnel' })
}
