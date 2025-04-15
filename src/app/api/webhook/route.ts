import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true, message: "Webhook opérationnel" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ⬇️ C’est ce qu’on veut afficher dans les logs Vercel
    console.log("📨 Données brutes HelloAsso :", JSON.stringify(body, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur de traitement :", error);
    return NextResponse.json({ success: false, error: "Erreur interne" }, { status: 500 });
  }
}
