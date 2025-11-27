# apps/tracking/models.py
from mongoengine import (
    DynamicDocument,
    StringField,
    DateTimeField,
    DictField,
    BooleanField,
)
from datetime import datetime, timezone


def now_utc():
    return datetime.now(timezone.utc)


class ProductAudit(DynamicDocument):
    productId = StringField(required=True)
    productCode = StringField(null=True) 

    # Tipo do evento de auditoria
    eventType = StringField(required=True, choices=(
        "create",         
        "update",         
        "delete",         
        "lifecycle_event",
        "relation_change",
    ))

    # Origem da alteração
    source = StringField(null=True)           
    sourceChannel = StringField(null=True)     
    requestId = StringField(null=True)        

    # Quem fez
    actorId = StringField(null=True)           
    actorName = StringField(null=True)         
    actorType = StringField(null=True)        

    # Snapshots completos (ANTES e DEPOIS)
    previousData = DictField(null=True)        
    newData = DictField(null=True)             
    diff = DictField(null=True)                

    # Campos específicos de vida útil / tracking
    lifecycleCategory = StringField(null=True, choices=(
        "maintenance",
        "repair",
        "status_change",
        "movement",
        "other",
    ))
    lifecycleType = StringField(null=True)
    relatedProductId = StringField(null=True)

    # Flags de conveniência
    hasStructChange = BooleanField(default=False)
    hasLifecycleChange = BooleanField(default=False)

    notes = StringField(null=True)

    createdAt = DateTimeField(default=now_utc)

    meta = {
        'collection': 'products_audit',
        'indexes': [
            'productId',
            'productCode',
            'eventType',
            'lifecycleCategory',
            'relatedProductId',
            '-createdAt',
        ]
    }
