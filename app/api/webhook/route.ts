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

    const headers = {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    // ✅ Récupération du contact existant
    let existingContact: { attributes?: Record<string, string> } = {}
    try {
      const res = await axios.get(`${BREVO_BASE_URL}/${email}`, { headers })
      existingContact = res.data
    } catch {
      existingContact = {}
    }

    const existing = existingContact?.attributes || {}

    const prenom = safeText(capitalize(item?.user?.firstName || payer.firstName || ''))
    const nom = safeText(upper(item?.user?.lastName || payer.lastName || ''))

    const rawPhone = rawCustomFields['Numéro de téléphone'] || ''
    const phone = rawPhone ? formatPhone(rawPhone) : undefined

    const dateNaissance = rawCustomFields['Date de naissance'] || ''
    const codePromo = item?.discount?.code || ''
    const prixBillet = formatAmount(item?.initialAmount || 0)

    const newParrain = safeText(capitalize(rawCustomFields['Parrain'] || ''))
    const newFilleul1 = safeText(capitalize(rawCustomFields['Filleul 1'] || ''))
    const newFilleul2 = safeText(capitalize(rawCustomFields['Filleul 2'] || ''))
    const newFilleul3 = safeText(capitalize(rawCustomFields['Filleul 3'] || ''))

    const attributes: Record<string, string> = {}

    // 📌 Fixer le prénom/nom à la première valeur connue
    if (!existing.PRENOM) attributes.PRENOM = prenom
    if (!existing.NOM) attributes.NOM = nom

    // ✅ Ajouter la date de naissance uniquement si absente
    if (!existing.DATE_NAISSANCE && dateNaissance) {
      attributes.DATE_NAISSANCE = dateNaissance
    }

    // ✅ Cumuler les champs multiples
    attributes.CODE_PROMO = mergeValues(existing.CODE_PROMO, codePromo)
    attributes.PRIX_BILLET = mergeValues(existing.PRIX_BILLET, prixBillet)
    attributes.TAG = mergeValues(existing.TAG, tag)
    attributes.PARRAIN = mergeValues(existing.PARRAIN, newParrain)
    attributes.FILLEUL_1 = mergeValues(existing.FILLEUL_1, newFilleul1)
    attributes.FILLEUL_2 = mergeValues(existing.FILLEUL_2, newFilleul2)
    attributes.FILLEUL_3 = mergeValues(existing.FILLEUL_3, newFilleul3)

    // ✅ Vérification du numéro avant de l'ajouter
    if (phone && phone.match(/^\+33\d{9}$/)) {
      try {
        const smsCheck = await axios.get(`${BREVO_BASE_URL}?sms=${encodeURIComponent(phone)}`, { headers })
        const found = smsCheck.data.contacts?.[0]
        if (!found || found.email === email) {
          attributes.SMS = phone
        } else {
          console.warn(`📵 Le numéro ${phone} est déjà associé à ${found.email}, SMS ignoré`)
        }
      } catch (err) {
        console.warn('🔍 Vérification du numéro échouée, SMS ignoré', err)
      }
    }

    console.log('📨 Données HelloAsso formatées :', {
      email,
      attributes
    })

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
