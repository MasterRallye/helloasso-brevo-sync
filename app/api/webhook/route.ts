import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  return NextResponse.json({ success: true, message: "Webhook en ligne et opérationnel (GET)" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📨 Données brutes HelloAsso :", JSON.stringify(body, null, 2));

    const data = body.data;

    // Infos de base
    const email = data.payer?.email;
    const firstName = data.payer?.firstName || '';
    const lastName = data.payer?.lastName || '';
    const fullName = `${firstName} ${lastName}`;
    const ticketUrl = data.items?.[0]?.ticketUrl || '';
    const eventDate = data.date?.split('T')[0]; // ex: "2025-04-16"
    const eventName = data.formSlug || 'evenement-inconnu';

    // Génération du tag unique pour l’événement
    const eventTag = `MR_${eventDate?.replace(/-/g, '_')}_${eventName}`;

    const brevoApiKey = process.env.BREVO_API_KEY;

    if (!brevoApiKey) {
      console.error("❌ Clé API Brevo manquante !");
      return NextResponse.json({ success: false, error: "Clé API manquante" }, { status: 500 });
    }

    // ➕ Préparer le contact à créer ou mettre à jour
    const payload = {
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        FULLNAME: fullName,
        TICKET_URL: ticketUrl,
        EVENT_DATE: eventDate,
        EVENT_NAME: eventName,
      },
      updateEnabled: true,
      listIds: [], // ← on n'utilise pas de listes pour l'instant
      tags: [eventTag]
    };

    const response = await axios.post(
      'https://api.brevo.com/v3/contacts',
      payload,
      {
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("✅ Contact ajouté/mis à jour dans Brevo :", response.data);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("❌ Erreur webhook HelloAsso → Brevo", error);
    return NextResponse.json({ success: false, error: "Erreur lors de l'envoi à Brevo" }, { status: 500 });
  }
}
