# Warenkorb-API

## Warenkorb-ID

`cartId` ist eine vom Backend erzeugte UUID. Sie entspricht keiner numerischen Datenbank-ID und muss vom Client als undurchsichtiger Wert behandelt werden.

Intern darf das zugehörige Datenbankfeld weiterhin `sessionId` heißen. In öffentlichen API-Antworten wird es ausschließlich als `cartId` ausgegeben.

## Endpunkte

- `POST /api/v1/carts`
- `GET /api/v1/carts/:cartId`
- `POST /api/v1/carts/:cartId/items`
- `PATCH /api/v1/carts/:cartId/items/:itemId`
- `DELETE /api/v1/carts/:cartId/items/:itemId`
- `DELETE /api/v1/carts/:cartId/items`

Alle erfolgreichen Änderungen liefern den vollständigen aktuellen Warenkorb zurück.

## Mengen

Beim Hinzufügen einer Position sind Mengen von `1` bis `99` erlaubt.

Beim Aktualisieren einer Position sind Mengen von `0` bis `99` erlaubt. Die Menge `0` entfernt die Position aus dem Warenkorb.

Identische Produkt- und Optionskonfigurationen werden zu einer Position zusammengeführt. Die Gesamtmenge einer identischen Konfiguration darf `99` nicht überschreiten.

Die Reihenfolge der übermittelten Options-IDs beeinflusst die Konfiguration nicht.

## Optionsgruppen

Die Optionsauswahl wird anhand von `minSelections` und `maxSelections` der jeweiligen Optionsgruppe geprüft.

Für den MVP gelten folgende Regeln:

- Beilage: `0` bis `2` Optionen
- Sauce: `0` bis `1` Option

Doppelte Options-IDs sind nicht erlaubt.

Eine ausgewählte Option muss:

- zum gewählten Produkt gehören,
- in einer Optionsgruppe des Produkts enthalten sein,
- verfügbar sein.

Wenn die Mindest- oder Höchstauswahl einer Optionsgruppe verletzt wird, lehnt das Backend die Anfrage ab.

## Preise

Der Produktpreis wird beim Hinzufügen einer Position als Snapshot im Warenkorb gespeichert.

Für ausgewählte Optionen werden ebenfalls folgende Informationen als Snapshot gespeichert:

- Optionsname
- Optionsaufpreis

Nachträgliche Änderungen am Produktpreis oder an einem Optionsaufpreis verändern bereits vorhandene Warenkorbpositionen nicht.

Vor dem Checkout werden die aktuelle Produkt- und Optionsverfügbarkeit sowie die aktuellen Regeln der Optionsgruppen erneut geprüft.

Alle Geldbeträge werden als Strings mit genau zwei Nachkommastellen ausgegeben.

Die Währung ist `EUR`.

## Berechnete Werte

Jede Warenkorbposition enthält folgende Preisangaben:

- `baseUnitPrice`: gespeicherter Grundpreis des Produkts
- `optionSurcharge`: Summe der Aufpreise aller ausgewählten Optionen
- `unitTotal`: Grundpreis zuzüglich aller Optionsaufpreise
- `lineTotal`: Gesamtpreis der Position unter Berücksichtigung der Menge

Der Warenkorb enthält zusätzlich:

- `total`: Summe aller Positionspreise

Es gelten folgende Berechnungen:

```text
optionSurcharge = Summe der Optionsaufpreise
unitTotal = baseUnitPrice + optionSurcharge
lineTotal = unitTotal × quantity
total = Summe aller lineTotal-Werte
```

## Erfolgsantwort

Ein erfolgreicher Warenkorb wird in folgender Struktur ausgegeben:

```json
{
  "cartId": "3c577f07-58ba-49bf-96c0-f067836dd078",
  "status": "offen",
  "currency": "EUR",
  "createdAt": "2026-08-09T12:00:00.000Z",
  "updatedAt": "2026-08-09T12:05:00.000Z",
  "items": [
    {
      "itemId": 1,
      "product": {
        "id": 1,
        "name": "Halbes Hähnchen"
      },
      "quantity": 2,
      "baseUnitPrice": "7.50",
      "options": [
        {
          "id": 10,
          "name": "Große Pommes",
          "surcharge": "3.50"
        }
      ],
      "optionSurcharge": "3.50",
      "unitTotal": "11.00",
      "lineTotal": "22.00"
    }
  ],
  "total": "22.00"
}
```

## Fehlerantwort

Fehler werden einheitlich mit HTTP-Statuscode, maschinenlesbarem Fehlercode und verständlicher Nachricht ausgegeben.

Beispiel:

```json
{
  "statusCode": 404,
  "code": "CART_NOT_FOUND",
  "message": "Warenkorb wurde nicht gefunden."
}
```

## Fehlercodes

| Situation                               | HTTP-Status | Fehlercode                   |
| --------------------------------------- | ----------: | ---------------------------- |
| Warenkorb nicht gefunden                |       `404` | `CART_NOT_FOUND`             |
| Warenkorbposition nicht gefunden        |       `404` | `CART_ITEM_NOT_FOUND`        |
| Warenkorb ist bereits bestellt          |       `409` | `CART_CLOSED`                |
| Produkt ist nicht verfügbar             |       `404` | `PRODUCT_UNAVAILABLE`        |
| Option gehört nicht zum Produkt         |       `400` | `PRODUCT_OPTION_INVALID`     |
| Option ist nicht verfügbar              |       `409` | `PRODUCT_OPTION_UNAVAILABLE` |
| Auswahlgrenze wurde verletzt            |       `400` | `OPTION_SELECTION_INVALID`   |
| Zusammengeführte Menge überschreitet 99 |       `409` | `MAXIMUM_QUANTITY_EXCEEDED`  |

## Warenkorbstatus

Ein neu erstellter Warenkorb besitzt den Status `offen`.

Ein offener Warenkorb darf:

- gelesen,
- erweitert,
- aktualisiert,
- geleert werden.

Ein bestellter Warenkorb darf weiterhin über den GET-Endpunkt gelesen werden. Er darf jedoch nicht mehr verändert werden.

Jeder Änderungsversuch an einem bestellten Warenkorb wird mit dem HTTP-Status `409` und dem Fehlercode `CART_CLOSED` abgelehnt.

Eine automatische Ablaufzeit für offene Warenkörbe ist nicht Bestandteil des MVP.

## Zeitstempel

Der Warenkorb enthält:

- `createdAt`: Zeitpunkt der Erstellung
- `updatedAt`: Zeitpunkt der letzten erfolgreichen Änderung

`updatedAt` wird bei jeder erfolgreichen Warenkorbänderung aktualisiert. Dazu zählen:

- Hinzufügen einer Position
- Zusammenführen identischer Positionen
- Ändern einer Menge
- Ändern von Optionen
- Zusammenführen nach einer Optionsänderung
- Entfernen einer Position
- Entfernen durch Menge `0`
- Leeren des Warenkorbs
