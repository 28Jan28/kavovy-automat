# YOUWARE.md - Kávový Automat Monitorovací Systém

## Přehled projektu

Tento projekt je webová aplikace pro správu kávového automatu. Umožňuje uživatelům přihlašování pomocí emailu/hesla nebo RFID karty, nákup kávy, správu uživatelů a produktů pro administrátory, a poskytuje statistiky o spotřebě kávy.

## Architektura

### Frontend
- Vanilla JavaScript bez frameworků
- HTML5 a CSS3
- Žádné externí knihovny kromě Supabase

### Backend
- Supabase (PostgreSQL databáze a autentizace)
- PostgreSQL funkce a triggery pro business logiku

## Struktura projektu

```
src/
  ├── css/              # CSS styly
  │   └── style.css     # Hlavní CSS soubor
  ├── img/              # Obrázky produktů (kávy)
  ├── js/               # JavaScript kód
  │   └── app.js        # Hlavní aplikační logika
  └── index.html        # Hlavní HTML soubor
```

## Klíčové komponenty

### Autentizace
- Přihlášení pomocí email/heslo
- Přihlášení pomocí RFID karty
- Registrace nových uživatelů

### Správa uživatelů (admin)
- Přidání nových uživatelů
- Přidání kreditu uživatelům
- Změna RFID karty
- Nastavení/odebrání admin práv

### Správa produktů (admin)
- Přidání nových produktů (kávy)
- Úprava existujících produktů
- Smazání produktů

### Transakce
- Nákup kávy (odečtení kreditu)
- Historie transakcí uživatele

### Statistiky
- Celkový stav pokladny
- Počet prodaných káv
- Nejpopulárnější káva
- Počet aktivních uživatelů

## Databázová struktura

### Tabulky
- `profiles` - Informace o uživatelích (credit, is_admin, rfid_card)
- `products` - Produkty (kávy)
- `transactions` - Záznamy o nákupech
- `cash_register` - Stav pokladny

### RPC funkce
- `check_rfid_only` - Ověření RFID karty pro přihlášení
- `check_rfid_login` - Ověření emailu a RFID karty
- `create_transaction_sync` - Vytvoření transakce při nákupu kávy
- `add_credit_and_update_cash` - Přidání kreditu uživateli a aktualizace pokladny

## Známé problémy a řešení

### Přihlášení
- Při problémech s přihlašováním zkontrolujte konzoli prohlížeče
- RFID autentizace je simulována, ve skutečném nasazení by bylo potřeba integrovat čtečku RFID karet

### Přidávání produktů/uživatelů
- Pokud přidání selže, zkontrolujte, zda jsou všechny požadované pole vyplněny
- Po přidání produktu je potřeba obnovit stránku, aby se zobrazily změny

### Správa pokladny
- Stav pokladny se aktualizuje pouze při přidání kreditu, nikoli při nákupu kávy
- Administrátor může ručně upravit stav pokladny

## Vývoj a testování

Pro vývoj a testování této aplikace je důležité mít nastavený Supabase projekt s odpovídající strukturou tabulek a funkcí. Základní sekvence pro nastavení:

1. Vytvořit Supabase projekt
2. Vytvořit tabulky (profiles, products, transactions, cash_register)
3. Nastavit RLS (Row Level Security) politiky
4. Vytvořit RPC funkce
5. Nastavit triggery pro automatické aktualizace

Pro lokální vývoj je možné použít nástroj Supabase CLI pro spuštění lokální instance Supabase.