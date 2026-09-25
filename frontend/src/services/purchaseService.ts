/**
 * MathBlitz - Purchase Architecture & Google Play Billing Abstraction
 *
 * This module prepares MathBlitz for Google Play In-App Billing (one-time digital products)
 * in accordance with Google Play Developer Program Policies.
 *
 * Architecture Principles:
 * 1. Clean provider interface separating UI/economy from payment SDKs.
 * 2. Inactive by default until products and merchant accounts are configured in Play Console.
 * 3. Server-authoritative verification via backend endpoint POST /api/billing/google-play/verify.
 * 4. Purchase token idempotency to prevent duplicate reward grants.
 * 5. Zero fake purchases, fake prices, or fake verification flows.
 */

export type ProductType = "inapp" | "subs";

export interface PlayProduct {
  productId: string;
  type: ProductType;
  title: string;
  description: string;
  priceFormatted?: string;
  priceCurrencyCode?: string;
  priceAmountMicros?: number;
}

export interface PurchaseTokenPayload {
  productId: string;
  purchaseToken: string;
  orderId?: string;
  packageName: string;
  purchaseTime: number;
  acknowledged: boolean;
}

export type PurchaseStatus =
  | "ready"
  | "uninitialized"
  | "pending"
  | "completed"
  | "cancelled"
  | "failed"
  | "not_available";

export interface PurchaseResult {
  success: boolean;
  status: PurchaseStatus;
  productId?: string;
  orderId?: string;
  purchaseToken?: string;
  error?: string;
}

export interface IPurchaseProvider {
  name: string;
  isAvailable(): boolean;
  initialize(): Promise<boolean>;
  getProducts(productIds: string[]): Promise<PlayProduct[]>;
  requestPurchase(productId: string): Promise<PurchaseResult>;
  acknowledgePurchase(purchaseToken: string): Promise<boolean>;
  restorePurchases(): Promise<PurchaseTokenPayload[]>;
}

/**
 * Google Play Billing Provider (Structured for standard Google Play Billing Client / react-native-iap)
 * Kept inactive for the initial production release until products are created in Play Console.
 */
export class GooglePlayBillingProvider implements IPurchaseProvider {
  public readonly name = "GooglePlayBilling";
  private _isReady = false;

  public isAvailable(): boolean {
    // Inactive until Google Play Billing one-time products are registered in Google Play Console
    return this._isReady;
  }

  public async initialize(): Promise<boolean> {
    // Future: Connect to native Google Play Billing client
    this._isReady = false;
    return false;
  }

  public async getProducts(_productIds: string[]): Promise<PlayProduct[]> {
    if (!this.isAvailable()) {
      return [];
    }
    // Future: Query SKU details from Play Store
    return [];
  }

  public async requestPurchase(_productId: string): Promise<PurchaseResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        status: "not_available",
        error: "Google Play Billing is not configured for this release.",
      };
    }
    return {
      success: false,
      status: "not_available",
      error: "Billing client not connected.",
    };
  }

  public async acknowledgePurchase(_purchaseToken: string): Promise<boolean> {
    return false;
  }

  public async restorePurchases(): Promise<PurchaseTokenPayload[]> {
    return [];
  }
}

/**
 * Main Purchase Service Singleton
 */
class PurchaseService {
  private provider: IPurchaseProvider;

  constructor(provider?: IPurchaseProvider) {
    this.provider = provider || new GooglePlayBillingProvider();
  }

  public setProvider(provider: IPurchaseProvider): void {
    this.provider = provider;
  }

  /**
   * Returns whether real-money Google Play purchases are currently available.
   * Currently returns false for the initial v1.0.0 release.
   */
  public isBillingAvailable(): boolean {
    return this.provider.isAvailable();
  }

  public async queryProducts(productIds: string[]): Promise<PlayProduct[]> {
    if (!this.provider.isAvailable()) return [];
    return this.provider.getProducts(productIds);
  }

  public async initiatePurchase(productId: string): Promise<PurchaseResult> {
    return this.provider.requestPurchase(productId);
  }

  /**
   * Server-authoritative purchase verification call to backend.
   * Sends purchase token and product ID to server to verify before granting entitlement.
   */
  public async verifyWithBackend(
    backendUrl: string,
    payload: {
      playerId: string;
      productId: string;
      purchaseToken: string;
      packageName: string;
      orderId?: string;
    }
  ): Promise<{ verified: boolean; error?: string }> {
    try {
      const response = await fetch(`${backendUrl}/api/billing/google-play/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: payload.playerId,
          product_id: payload.productId,
          purchase_token: payload.purchaseToken,
          package_name: payload.packageName,
          order_id: payload.orderId,
        }),
      });

      if (!response.ok) {
        return { verified: false, error: `Verification failed with HTTP ${response.status}` };
      }

      const data = await response.json();
      return { verified: Boolean(data.verified) };
    } catch (err: unknown) {
      return { verified: false, error: err instanceof Error ? err.message : "Network error" };
    }
  }

  public async restorePurchases(): Promise<PurchaseTokenPayload[]> {
    return this.provider.restorePurchases();
  }
}

export const purchaseService = new PurchaseService();
