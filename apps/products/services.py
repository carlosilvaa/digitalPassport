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
    raw_topic: Optional[str] = None,
    raw_payload: Optional[str] = None,
):
    print(">>> apply_operational_delta() chamado para product:", product.id)
    print(">>> delta recebido:", delta)

    if not delta:
        print(">>> delta vazio, nada a fazer.")
        return {"changed": False, "product": product}

    # Snapshot ANTES
    previous_data = product.to_mongo().to_dict()
    print(">>> ANTES, usageData no snapshot:", previous_data.get("usageData"))

    # Garante que usageData existe
    usage = getattr(product, "usageData", None)
    if usage is None:
        print(">>> usageData era None, criando novo UsageData()")
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

    print(">>> current_operational:", current_operational)

    # Merge do delta em cima do estado atual
    new_operational = {**current_operational, **delta}
    print(">>> new_operational:", new_operational)

    # Se nada mudou de fato, nem salva nem audita
    if new_operational == current_operational:
        print(">>> new_operational == current_operational -> nada mudou, abortando.")
        return {"changed": False, "product": product}

    # Atribui de volta
    usage.operationalData = new_operational
    product.usageData = usage

    print(
        ">>> ANTES DO SAVE, product.usageData.operationalData (em memória):",
        getattr(product.usageData, "operationalData", None),
    )

    # SALVA PRIMEIRO
    product.save()
    print(">>> product.save() chamado")

    # RECARREGA DO MONGO E MOSTRA O QUE VOLTOU
    product.reload()
    snap_after = product.to_mongo().to_dict()
    print(">>> DEPOIS DO SAVE+RELOAD, usageData:", snap_after.get("usageData"))

    # Snapshot DEPOIS
    new_data = snap_after

    # Monta notes final (inclui info crua do MQTT se existir)
    base_notes = notes or "Atualização de dados operacionais via MQTT/HTTP bridge"
    if raw_topic or raw_payload:
        extras = []
        if raw_topic:
            extras.append(f"topic={raw_topic}")
        if raw_payload:
            extras.append(f"payload={raw_payload}")
        base_notes = f"{base_notes} | " + " ".join(extras)

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
        notes=base_notes,
    )

    print(">>> log_product_audit criado, id:", getattr(audit, "id", None))

    return {
        "changed": True,
        "product": product,
        "audit_id": str(getattr(audit, "id", "")),
    }
