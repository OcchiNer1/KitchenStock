import "./globals.css";

export const metadata = {
  title: "Stock de la cocina",
  description: "Control de inventario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
