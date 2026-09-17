"use client";
import Image from 'next/image';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchProducts } from "@/lib/stockActions";
import { ProductStatus } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState<ProductStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"ok" | "error" | null>(null);
  const [search, setSearch] = useState("");

  async function reload() {
    try {
      const data = await fetchProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con Supabase. Revisá tu .env.local");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();

    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        reload();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const productsToBuy = products.filter((p) => p.status === "red");

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function sendShoppingList() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/send-shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: productsToBuy.map((p) => p.name) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSendResult("ok");
    } catch (err) {
      console.error(err);
      setSendResult("error");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <main className="container"><p>Cargando inventario...</p></main>;
  if (error) return <main className="container"><p className="error">{error}</p></main>;

  return (
    <main className="container">
      <div className="logo-container">
        <Image
          src="/logo.png"
          alt="Logo de mi aplicación"
          width={200}
          height={100}
          priority
        />
        <h1>Kitchen Stock</h1>
      </div>

      <div className="layout">
        <div className="main-content">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {search && filteredProducts.length === 0 && (
            <p className="no-results">No hay productos que coincidan con "{search}"</p>
          )}
        </div>

        {productsToBuy.length > 0 && (
          <aside className="sidebar">
            <div className="shopping-alert">
              <p className="shopping-alert-title">We need to buy ({productsToBuy.length})</p>
              <ul>
                {productsToBuy.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
              <button
                className="whatsapp-button"
                onClick={sendShoppingList}
                disabled={sending}
              >
                {sending ? "Enviando..." : "Enviar lista por WhatsApp"}
              </button>
              {sendResult === "ok" && (
                <p className="send-feedback send-feedback-ok">Lista enviada ✓</p>
              )}
              {sendResult === "error" && (
                <p className="send-feedback send-feedback-error">
                  No se pudo enviar. Revisá la consola del servidor.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}