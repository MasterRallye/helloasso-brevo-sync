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

    // 🟡 LOGS DÉTAILLÉS POUR ANALYSE
    console.log('🔍 CLÉS DE data :', Object.keys(data))
    console.log('🔍 CONTENU DE item :', JSON.stringify(item, null, 2))

    // Log minimum
    const email = payer.email?.trim().toLowerCase()
    const prenom = capitalize(item?.user?.firstName || payer.firstName || '')
    const nom = upper(item?.user?.lastName || payer.lastName || '')

    const tag = data.formSlug

    console.log('📩 Contact traité sans insertion (test)', {
      email,
      prenom,
      nom,
      tag
    })

    return NextResponse.json({ success: true, message: 'Log envoyé avec succès' })
  } catch (error) {
    console.error('❌ Erreur analyse HelloAsso :', error)
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Webhook opérationnel' })
}
