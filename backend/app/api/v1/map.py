from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.models import Restaurant, NGO, SurplusListing, User

router = APIRouter(prefix="/map", tags=["Interactive Map"])

@router.get("/entities")
def get_map_entities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns geographical coordinates and metadata for all restaurants, NGOs,
    and active surplus redistribution nodes for Leaflet rendering.
    """
    restaurants = db.query(Restaurant).all()
    ngos = db.query(NGO).all()
    active_listings = db.query(SurplusListing).filter(
        SurplusListing.status.in_(["VERIFIED_AVAILABLE", "RESERVED"])
    ).all()

    rest_nodes = []
    for r in restaurants:
        surplus_count = db.query(SurplusListing).filter(
            SurplusListing.restaurant_id == r.id,
            SurplusListing.status == "VERIFIED_AVAILABLE"
        ).count()

        rest_nodes.append({
            "id": r.id,
            "type": "RESTAURANT",
            "name": r.name,
            "cuisine_type": r.cuisine_type,
            "address": r.address,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "fssai_license": r.fssai_license_number,
            "contact_phone": r.contact_phone,
            "active_surplus_count": surplus_count
        })

    ngo_nodes = []
    for n in ngos:
        ngo_nodes.append({
            "id": n.id,
            "type": "NGO",
            "name": n.name,
            "address": n.address,
            "latitude": n.latitude,
            "longitude": n.longitude,
            "service_radius_km": n.service_radius_km,
            "verification_status": n.verification_status
        })

    surplus_markers = []
    for l in active_listings:
        rest = db.query(Restaurant).filter(Restaurant.id == l.restaurant_id).first()
        if rest:
            surplus_markers.append({
                "listing_id": l.id,
                "item_name": l.item_name,
                "quantity": l.quantity,
                "unit": l.unit,
                "listing_type": l.listing_type,
                "restaurant_id": rest.id,
                "restaurant_name": rest.name,
                "latitude": rest.latitude,
                "longitude": rest.longitude,
                "status": l.status,
                "target_audience": l.target_audience
            })

    return {
        "restaurants": rest_nodes,
        "ngos": ngo_nodes,
        "surplus_markers": surplus_markers,
        "total_nodes": len(rest_nodes) + len(ngo_nodes)
    }
