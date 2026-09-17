import { NextResponse } from "next/server";

// Esta ruta corre en el servidor (no en el navegador), así que el
// número de teléfono y la API key nunca quedan expuestos en el código
// que ve el cliente.
export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No hay items en rojo para mandar" },
        { status: 400 }
      );
    }

    const phone = process.env.CALLMEBOT_PHONE;
    const apiKey = process.env.CALLMEBOT_APIKEY;

    if (!phone || !apiKey) {
      return NextResponse.json(
        { error: "Faltan CALLMEBOT_PHONE / CALLMEBOT_APIKEY en el .env.local" },
        { status: 500 }
      );
    }

    const fecha = new Date().toLocaleDateString("es-AR");
    const lista = items.map((name: string) => `- ${name}`).join("\n");
    const mensaje = `🛒 Lista de compras (${fecha})\n\n${lista}`;

    const url =
      `https://api.callmebot.com/whatsapp.php?` +
      `phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(mensaje)}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `CallMeBot respondió con error: ${body}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
