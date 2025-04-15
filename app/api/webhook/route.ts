import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  return NextResponse.json({ success: true, message: "Webhook en ligne et opérationnel (GET)" });
}

export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json();

    console.log("📨 Données brutes HelloAsso :", JSON.stringify(data, null, 2));

    const email = data.payer?.email?.trim().toLowerCase();
    const prenom = data['Prénom participant'] || data.payer?.firstName || '';
    const nom = data['Nom participant'] || data.payer?.lastName || '';
    const dateNaissance = data['Date de naissance'] || '';
    const numero = data['Numéro de téléphone'] || '';

    const codePromo = data['Code Promo'] || '';
    const montantPromo = data['Montant code promo'] || '';
    const montantTarif = data['Montant tarif'] || '';

    const parrain = data['Parrain'] || data['Nom de votre parrain'] || '';
    const filleul1 = data['Filleul'] || data['Filleul 1'] || '';
    const filleul2 = data['Filleul 2'] || '';
    const filleul3 = data['Filleul 3'] || '';

    const firstName = prenom.trim().charAt(0).toUpperCase() + prenom.trim().slice(1).toLowerCase();
    const lastName = nom.trim().toUpperCase();
    const fullName = `${firstName} ${lastName}`;

    const phone = numero.replace(/\s+/g, '').replace(/^0/, '+33');

    const montantFormaté = parseFloat(montantPromo || 0).toFixed(2);
    const tarifFormaté = parseFloat(montantTarif || 0).toFixed(2);

    const dateEvenement = data.date?.split('T')[0] || 'inconnue';
    const eventSlug = data.formSlug || 'evenement';
    const eventTag = `MR_${dateEvenement.replace(/-/g, '_')}_${eventSlug}`;

    const brevoApiKey = process.env.BREVO_API_KEY;

    if (!brevoApiKey) {
      console.error("❌ Clé API Brevo manquante !");
      return NextResponse.json({ success: false, error: "Clé API manquante" }, { status: 500 });
    }

    const response = await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        attributes: {
          PRENOM: firstName,
          NOM: lastName,
          FULLNAME: fullName,
          TELEPHONE: phone,
          DATE_NAISSANCE: dateNaissance,
          CODE_PROMO: codePromo,
          MONTANT_PROMO: montantFormaté,
          PRIX_BILLET: tarifFormaté,
          PARRAIN: parrain,
          FILLEUL_1: filleul1,
          FILLEUL_2: filleul2,
          FILLEUL_3: filleul3,
        },
        updateEnabled: true,
        tags: [eventTag],
      },
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
