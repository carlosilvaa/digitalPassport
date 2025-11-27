# apps/products/services.py
from apps.tracking.utils import log_product_audit
from typing import Dict, Any, Optional
from apps.products.models import Products, UsageData

def apply_product_update_from_payload(
    *,
    product: Products,
    payload: dict,
    source: str,
    source_channel: str,
    actor_id: str | None = None,
    actor_name: str | None = None,
    notes: str | None = None,
):
    previous_data = product.to_mongo().to_dict()

    # snapshot depois das mudanças (antes de salvar dá pra usar to_mongo também)
    new_data = product.to_mongo().to_dict()

    if previous_data == new_data:
        # nada mudou de fato → não salva e não cria log
        return {"changed": False, "product": product}

    # mudou → salva
    product.save()

    # registra auditoria
    log_product_audit(
        instance=product,
        event_type="update",
        source=source,
        source_channel=source_channel,
        actor_id=actor_id,
        actor_name=actor_name,
        previous_data=previous_data,
        new_data=new_data,
        notes=notes or "Atualização via serviço apply_product_update_from_payload",
    )

    return {"changed": True, "product": product}


def apply_operational_delta(
    *,
    product: Products,
    delta: Dict[str, Any],
    source: str,
    source_channel: str,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    notes: Optional[str] = None,
):

    if not delta:
        return {"changed": False, "product": product}

    # Snapshot ANTES
    previous_data = product.to_mongo().to_dict()

    # Garante que usageData existe
    usage = getattr(product, "usageData", None)
    if usage is None:
        usage = UsageData()
        product.usageData = usage

    # Transformar usageData.operationalData em dict normal
    current_operational = getattr(usage, "operationalData", None)
    if current_operational is None:
        current_operational = {}
    else:
        if hasattr(current_operational, "to_mongo"):
            current_operational = current_operational.to_mongo().to_dict()
        elif not isinstance(current_operational, dict):
            current_operational = dict(current_operational)

    # Merge do delta em cima do estado atual
    new_operational = {**current_operational, **delta}

    # Se nada mudou de fato, nem salva nem audita
    if new_operational == current_operational:
        return {"changed": False, "product": product}

    # Atribui de volta
    usage.operationalData = new_operational
    product.usageData = usage

    # Snapshot DEPOIS (antes de salvar de fato)
    new_data = product.to_mongo().to_dict()

    audit = log_product_audit(
        instance=product,
        event_type="update",           
        source=source,                 
        source_channel=source_channel, 
        actor_id=actor_id,
        actor_name=actor_name,
        previous_data=previous_data,
        new_data=new_data,
        lifecycle_category="other",
        lifecycle_type="operational_data_update",
        related_product_id=None,
        notes=notes or "Atualização de dados operacionais via MQTT/HTTP bridge",
    )

    product.save()

    return {
        "changed": True,
        "product": product,
        "audit_id": str(getattr(audit, "id", "")),
    }