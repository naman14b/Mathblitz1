"""FastAPI Router for Google Play In-App Billing verification.

Prepared for server-authoritative Google Play Developer API verification
once in-app products are registered in Google Play Console.
"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db import get_db
from ..models import GooglePlayPurchase, utc_now

router = APIRouter(prefix="/api/billing", tags=["billing"])


class GooglePlayVerifyRequest(BaseModel):
    player_id: str = Field(..., description="Player profile ID")
    product_id: str = Field(..., description="Google Play product SKU")
    purchase_token: str = Field(..., description="Unique purchase token from Google Play Billing")
    package_name: str = Field(default="com.naman.mathblitz", description="Android application package name")
    order_id: Optional[str] = Field(default=None, description="Google Play order reference")


class GooglePlayVerifyResponse(BaseModel):
    verified: bool
    status: str
    product_id: str
    player_id: str
    detail: str


@router.post("/google-play/verify", response_model=GooglePlayVerifyResponse)
async def verify_google_play_purchase_endpoint(
    req: GooglePlayVerifyRequest,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Server-authoritative endpoint for verifying Google Play In-App purchases.
    Treats purchase_token as an idempotency key to prevent double-crediting.

    For the initial Google Play release, real-money products are not active,
    so this endpoint returns 'not_configured' and safely refuses client-side grants.
    """
    if not req.purchase_token or not req.purchase_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid purchase_token: Token is required for verification."
        )

    # Idempotency check: verify token has not been processed previously
    query = select(GooglePlayPurchase).where(GooglePlayPurchase.purchase_token == req.purchase_token.strip())
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        return {
            "verified": existing.purchase_state == "verified",
            "status": existing.purchase_state,
            "product_id": existing.product_id,
            "player_id": existing.player_id,
            "detail": "Purchase token already recorded in system."
        }

    # Record purchase attempt in inactive/pending state
    # Full verification will use Google Play Developer API (androidpublisher v3) when credentials are provided
    return {
        "verified": False,
        "status": "not_configured",
        "product_id": req.product_id,
        "player_id": req.player_id,
        "detail": "Google Play Billing verification is prepared but inactive for this release. Products must first be registered in Google Play Console."
    }
