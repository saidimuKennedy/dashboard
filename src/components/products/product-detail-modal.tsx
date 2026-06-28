"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailModalShell,
  detailModalActionsClassName,
  detailModalHeaderClassName,
} from "@/components/ui/detail-modal-shell";
import { PRODUCT_STATUS_OPTIONS, type ProductDetail } from "@/types/product";

interface ProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailModal({ productId, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const fetchProduct = useCallback(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/v1/products/${productId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load product.");
          return;
        }
        const data = json.data as ProductDetail;
        setProduct(data);
        setDraft({
          name: data.name,
          description: data.description ?? "",
          status: data.status,
        });
      })
      .catch(() => toast.error("Failed to load product."))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    fetchProduct();
  }, [productId, fetchProduct]);

  if (!productId) return null;

  async function saveProduct() {
    if (!productId || !draft.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description || null,
          status: draft.status,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save product.");
        return;
      }
      toast.success("Product saved.");
      fetchProduct();
      window.dispatchEvent(new CustomEvent("product:updated"));
    } catch {
      toast.error("Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!productId) return;
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/products/${productId}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to delete product.");
        return;
      }
      toast.success("Product deleted.");
      window.dispatchEvent(new CustomEvent("product:updated"));
      onClose();
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DetailModalShell onClose={onClose} closeLabel="Close product details" maxWidth="2xl">
        <div className={detailModalHeaderClassName()}>
          <div className="min-w-0 flex-1">
            {loading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="truncate text-lg font-semibold">{product?.name ?? "Product"}</h2>
                {product ? <Badge variant="secondary">{product.status}</Badge> : null}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="product-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="product-name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="product-status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="product-status"
                  className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, status: event.target.value }))
                  }
                  disabled={saving}
                >
                  {PRODUCT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {!PRODUCT_STATUS_OPTIONS.some((option) => option.value === draft.status) ? (
                    <option value={draft.status}>{draft.status}</option>
                  ) : null}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="product-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="product-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={5}
                  disabled={saving}
                />
              </div>

              {product?.releases?.length ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recent releases</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {product.releases.map((release) => (
                      <div key={release.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">v{release.version}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(release.releasedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {release.notes ? (
                          <p className="mt-1 text-sm text-muted-foreground">{release.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={deleteProduct}
            loading={deleting}
            disabled={loading || saving}
            className="text-error hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button onClick={saveProduct} loading={saving} disabled={loading || deleting}>
              Save
            </Button>
          </div>
        </div>
    </DetailModalShell>
  );
}
