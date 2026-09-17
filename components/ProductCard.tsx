"use client";

import { useEffect, useState } from "react";
import { ProductStatus } from "@/lib/types";
import {
  setStockValue,
  adjustStockByUnits,
  updateThresholds,
} from "@/lib/stockActions";

const statusLabel: Record<string, string> = {
  red: "Hay que comprar",
  yellow: "Queda poco",
  green: "Stock ok",
};

function computeStatus(
  currentStock: number,
  minStock: number,
  warningStock: number | null
): "red" | "yellow" | "green" {
  if (currentStock <= minStock) return "red";
  if (warningStock !== null && currentStock <= warningStock) return "yellow";
  return "green";
}

export default function ProductCard({ product }: { product: ProductStatus }) {
  const [saving, setSaving] = useState(false);

  // Para productos DIVISIBLES: separamos en "buckets cerrados" (conteo
  // exacto) + "% del bucket abierto" (el único que se estima a ojo).
  const [closedBuckets, setClosedBuckets] = useState(
    Math.floor(product.current_stock / product.unit_size)
  );
  const [openPercentage, setOpenPercentage] = useState(
    Math.round(
      ((product.current_stock % product.unit_size) / product.unit_size) * 100
    )
  );

  // Para productos NO divisibles: contador simple de packs/unidades.
  const [localUnits, setLocalUnits] = useState(
    Math.round(product.stock_in_purchase_units)
  );

  const [editing, setEditing] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [minInput, setMinInput] = useState(
    String(Math.round(product.min_stock / product.unit_size))
  );
  const [warningInput, setWarningInput] = useState(
    product.warning_stock !== null
      ? String(Math.round(product.warning_stock / product.unit_size))
      : ""
  );

  // Sincroniza con la base cuando llega un cambio externo (otro
  // dispositivo) y no estamos nosotros mismos guardando algo.
  useEffect(() => {
    if (saving) return;
    setClosedBuckets(Math.floor(product.current_stock / product.unit_size));
    setOpenPercentage(
      Math.round(
        ((product.current_stock % product.unit_size) / product.unit_size) * 100
      )
    );
    setLocalUnits(Math.round(product.stock_in_purchase_units));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.current_stock]);

  async function saveDivisibleTotal(buckets: number, percentage: number) {
    setSaving(true);
    try {
      const total = buckets * product.unit_size + (percentage / 100) * product.unit_size;
      await setStockValue(product, total);
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el cambio. Revisá tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  function handleClosedBucketsStep(delta: number) {
    const next = Math.max(0, closedBuckets + delta);
    setClosedBuckets(next);
    saveDivisibleTotal(next, openPercentage);
  }

  function handleOpenPercentageCommit(value: number) {
    saveDivisibleTotal(closedBuckets, value);
  }

  async function handleStep(delta: number) {
    const next = Math.max(0, localUnits + delta);
    setLocalUnits(next);
    setSaving(true);
    try {
      await adjustStockByUnits(product, delta, delta > 0 ? "restock" : "usage");
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el cambio. Revisá tu conexión.");
      setLocalUnits(localUnits);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveThresholds() {
    setSavingThresholds(true);
    try {
      const min = Number(minInput);
      const warning = warningInput.trim() === "" ? null : Number(warningInput);
      await updateThresholds(product, min, warning);
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar. Revisá tu conexión.");
    } finally {
      setSavingThresholds(false);
    }
  }

  const localCurrentStock = product.is_divisible
    ? closedBuckets * product.unit_size + (openPercentage / 100) * product.unit_size
    : localUnits * product.unit_size;

  const localStatus = computeStatus(localCurrentStock, product.min_stock, product.warning_stock);
  const totalEquivalent = product.is_divisible
    ? (closedBuckets + openPercentage / 100).toFixed(1)
    : null;

  return (
    <div className={`card ${saving ? "card-saving" : ""}`}>
      <div className="card-header">
        <div>
          <p className="card-title">{product.name}</p>
          <p className="card-subtitle">{product.purchase_unit}</p>
        </div>
        <span
          className={`status-dot status-dot-${localStatus}`}
          title={statusLabel[localStatus]}
          aria-label={statusLabel[localStatus]}
        />
      </div>

      {product.is_divisible ? (
        <>
          <div className="bucket-row">
            <span className="bucket-label">Cerrados</span>
            <div className="stepper-row stepper-row-compact">
              <button
                aria-label="restar bucket cerrado"
                onClick={() => handleClosedBucketsStep(-1)}
                disabled={saving || closedBuckets <= 0}
              >
                -
              </button>
              <span className="stepper-count">{closedBuckets}</span>
              <button
                aria-label="sumar bucket cerrado"
                onClick={() => handleClosedBucketsStep(1)}
                disabled={saving}
              >
                +
              </button>
            </div>
          </div>

          <div className="bucket-row">
            <span className="bucket-label">Abierto</span>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={openPercentage}
                onChange={(e) => setOpenPercentage(Number(e.target.value))}
                onMouseUp={(e) =>
                  handleOpenPercentageCommit(Number((e.target as HTMLInputElement).value))
                }
                onTouchEnd={(e) =>
                  handleOpenPercentageCommit(Number((e.target as HTMLInputElement).value))
                }
              />
              <span className="slider-out">{openPercentage}%</span>
            </div>
          </div>

          <p className="bucket-total">Total: {totalEquivalent} buckets</p>
        </>
      ) : (
        <div className="stepper-row">
          <button
            aria-label={`restar ${product.purchase_unit}`}
            onClick={() => handleStep(-1)}
            disabled={saving || localUnits <= 0}
          >
            -
          </button>
          <span className="stepper-count">{localUnits}</span>
          <button aria-label={`sumar ${product.purchase_unit}`} onClick={() => handleStep(1)} disabled={saving}>
            +
          </button>
        </div>
      )}

      <button className="edit-toggle" onClick={() => setEditing((e) => !e)}>
        {editing ? "Cerrar" : "Editar mínimos"}
      </button>

      {editing && (
        <div className="edit-panel">
          <label>
            Mínimo (rojo)
            <input
              type="number"
              min={0}
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
            />
          </label>
          <label>
            Aviso (amarillo, opcional)
            <input
              type="number"
              min={0}
              value={warningInput}
              onChange={(e) => setWarningInput(e.target.value)}
              placeholder="sin aviso"
            />
          </label>
          <p className="edit-hint">
            En {product.purchase_unit.split(" ")[0].toLowerCase()}s, no en {product.base_unit}.
          </p>
          <button
            className="edit-save"
            onClick={handleSaveThresholds}
            disabled={savingThresholds}
          >
            {savingThresholds ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}
    </div>
  );
}
