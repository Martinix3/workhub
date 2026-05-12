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


def test_source_marker_is_stable_for_deduplication():
    assert source_marker("abc123") == "WhatsApp message ID: abc123"
