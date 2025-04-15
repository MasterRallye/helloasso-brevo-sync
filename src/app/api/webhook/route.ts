import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const firstName = body?.payer?.firstName || ''
    const lastName = body?.payer?.lastName || ''
    const email = body?.payer?.email || ''
    const phone = body?.payer?.phone || ''
    const birthdate = body?.payer?.birthDate || ''
    const eventName = body?.event?.name || 'Événement inconnu'

    const brevoApiKey = process.env.BREVO_API_KEY as string

    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          PHONE: phone,
          BIRTHDATE: birthdate,
          EVENT: eventName,
        },
        updateEnabled: true,
        listIds: [/* à compléter plus tard */],
      },
      {
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur webhook HelloAsso → Brevo', error)
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 })
  }
}
 
