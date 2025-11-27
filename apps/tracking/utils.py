# apps/tracking/utils.py
from typing import Optional, Dict, Any
from copy import deepcopy
from apps.tracking.models import ProductAudit


def _compute_diff(old: dict, new: dict, path: str = "") -> Dict[str, dict]:
    """
    Calcula as diferenças entre dois dicts (old x new), de forma recursiva.

    Retorna:
    {
      "changed": { "campo": {"old": ..., "new": ...}, ... },
      "added": { "campo": valor_novo, ... },
      "removed": { "campo": valor_antigo, ... },
    }

    Onde "campo" pode ser algo como:
    - "identification.serialNumber"
    - "usageData.maintenanceHistory.0.description"
    etc.
    """
    changed = {}
    added = {}
    removed = {}

    old = old or {}
    new = new or {}

    all_keys = set(old.keys()) | set(new.keys())
    for key in all_keys:
        full_key = f"{path}.{key}" if path else key
        old_val = old.get(key)
        new_val = new.get(key)

        if isinstance(old_val, dict) and isinstance(new_val, dict):
            sub = _compute_diff(old_val, new_val, path=full_key)
            changed.update(sub["changed"])
            added.update(sub["added"])
            removed.update(sub["removed"])
        else:
            if key not in old and key in new:
                added[full_key] = new_val
            elif key in old and key not in new:
                removed[full_key] = old_val
            elif old_val != new_val:
                changed[full_key] = {"old": old_val, "new": new_val}

    return {"changed": changed, "added": added, "removed": removed}


def log_product_audit(
    *,
    instance,                     # instância de Products (mongoengine)
    event_type: str,
    source: Optional[str] = None,
    source_channel: Optional[str] = None,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    actor_type: Optional[str] = "user",
    previous_data: Optional[Dict[str, Any]] = None,
    new_data: Optional[Dict[str, Any]] = None,
    lifecycle_category: Optional[str] = None,
    lifecycle_type: Optional[str] = None,
    related_product_id: Optional[str] = None,
    request_id: Optional[str] = None,
    notes: Optional[str] = None,
):
    """
    Função genérica de auditoria/tracking para Products.

    - `previous_data` e `new_data` devem ser dicts (ex: instance.to_mongo().to_dict()).
    - Pode ser chamada de serializers, views, serviços, brokers, etc.
    """

    if previous_data is None and event_type in ("update", "delete", "relation_change", "lifecycle_event"):
        raise ValueError("previous_data é obrigatório para eventos de update/delete/relation_change/lifecycle_event")
    if new_data is None and event_type in ("create", "update", "relation_change", "lifecycle_event"):
        raise ValueError("new_data é obrigatório para eventos de create/update/relation_change/lifecycle_event")

    diff_data = None
    has_struct_change = False
    has_lifecycle_change = False

    if previous_data and new_data:
        diff_data = _compute_diff(previous_data, new_data)

        # Heurística p/ classificar tipo de mudança:
        struct_prefixes = (
            "identification.",
            "technicalSpecifications.",
            "documentation.",
            "sustainability.",
            "productionData.",
        )
        lifecycle_prefixes = (
            "usageData.",
            "productLifecycle.",
            "maintenanceHistory",
            "repairHistory",
        )

        changed_keys = set(diff_data["changed"].keys()) | \
                       set(diff_data["added"].keys()) | \
                       set(diff_data["removed"].keys())

        for k in changed_keys:
            if k.startswith(struct_prefixes):
                has_struct_change = True
            if k.startswith(lifecycle_prefixes):
                has_lifecycle_change = True

    # Usa previous ou new só pra extrair dados básicos de identificação
    base_data = previous_data or new_data or {}
    identification = base_data.get("identification") or {}

    audit = ProductAudit(
        productId=str(getattr(instance, "id", None)),
        productCode=identification.get("serialNumber") or identification.get("internalCode"),

        eventType=event_type,
        source=source,
        sourceChannel=source_channel,
        requestId=request_id,

        actorId=actor_id,
        actorName=actor_name,
        actorType=actor_type,

        previousData=previous_data,
        newData=new_data,
        diff=diff_data,

        lifecycleCategory=lifecycle_category,
        lifecycleType=lifecycle_type,
        relatedProductId=related_product_id,

        hasStructChange=has_struct_change,
        hasLifecycleChange=has_lifecycle_change,

        notes=notes,
    )
    audit.save()
    return audit
