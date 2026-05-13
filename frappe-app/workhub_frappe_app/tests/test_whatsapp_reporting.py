from workhub_frappe_app.services.whatsapp_reporting import parse_reporting_event, source_marker


def test_parse_visit_activation_message_from_reporting_group():
    event = {
        "message_id": "3B5DD286F12692E904A2",
        "sender_name": "Mrtin",
        "body": "Nueva visita a catering el laurel. Todavía tienen producto, pero quieren que les hagamos un taller de cocteles",
        "whatsapp_ts": 1778229001,
    }

    parsed = parse_reporting_event(event)

    assert parsed["source_message_id"] == "3B5DD286F12692E904A2"
    assert parsed["account_name"] == "Catering El Laurel"
    assert parsed["interaction_type"] == "Visita"
    assert parsed["subject"] == "Visita / Activación - Catering El Laurel"
    assert parsed["sales_channel"] == "Catering"
    assert parsed["products_or_service"] == "Taller de cócteles"
    assert parsed["next_action"] == "Preparar taller de cocteles"
    assert parsed["priority"] == "Media"
    assert "WhatsApp message ID: 3B5DD286F12692E904A2" in parsed["description"]


def test_audio_without_transcription_is_kept_as_review_note_not_fake_client():
    event = {
        "message_id": "audio-1",
        "sender_name": "Mrtin",
        "body": "[audio received]",
        "transcription_text": "",
        "has_media": 1,
        "media_type": "audio",
    }

    parsed = parse_reporting_event(event)

    assert parsed["account_name"] == "WhatsApp Reporting Santa Brisa"
    assert parsed["interaction_type"] == "Reunión"
    assert parsed["next_action"] == "Revisar audio de WhatsApp"
    assert parsed["priority"] == "Media"
    assert "Audio pendiente de revisar/transcribir" in parsed["description"]


def test_parse_structured_commercial_report_uses_template_fields():
    event = {
        "message_id": "structured-1",
        "sender_name": "Miguel",
        "body": """REPORTE COMERCIAL
Tipo: visita
Nombre Cuenta: Labalabusta
Distribuidor: Dismavi
Zona: Barcelona
Comercial: Miguel
Estado cliente: interesado
Stock: 0
PLV: 0
Activación: 0
Producto / Cantidad:
Qué pasó: quieren programar una cata y taller
Próxima acción: escribir a Virginia y programar taller
Responsable: Miguel
Prioridad: Alta
Notas Adicionales/ Contacto: Virginia +34 605 01 92 79""",
        "whatsapp_ts": 1778660000,
    }

    parsed = parse_reporting_event(event)

    assert parsed["account_name"] == "Labalabusta"
    assert parsed["interaction_type"] == "Visita"
    assert parsed["sales_channel"] == "Distribuidor"
    assert parsed["products_or_service"] == "Taller"
    assert parsed["next_action"] == "Escribir a Virginia y programar taller"
    assert parsed["priority"] == "Alta"
    assert not parsed.get("skip")


def test_empty_template_report_is_skipped():
    event = {
        "message_id": "empty-template",
        "sender_name": "Mrtin",
        "body": """REPORTE COMERCIAL
Tipo:
Cliente:
Distribuidor:
Zona:
Comercial:
Estado cliente:
Stock:
PLV:
Activación:
Producto / Cantidad:
Qué pasó:
Próxima acción:
Responsable:
Prioridad:""",
    }

    parsed = parse_reporting_event(event)

    assert parsed["skip"] is True
    assert parsed["skip_reason"] == "empty_template"


def test_non_report_chatter_is_skipped():
    event = {
        "message_id": "chatter-1",
        "sender_name": "Cristobal",
        "body": "Q significa PLV",
    }

    parsed = parse_reporting_event(event)

    assert parsed["skip"] is True
    assert parsed["skip_reason"] == "not_commercial_report"


def test_source_marker_is_stable_for_deduplication():
    assert source_marker("abc123") == "WhatsApp message ID: abc123"
