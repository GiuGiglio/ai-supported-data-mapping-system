# Setup-Anleitung für AI Mapping System

## 🚀 Schnellstart

### Was du brauchst:

1. **Supabase Account** (kostenlos): [supabase.com](https://supabase.com)
2. **Vercel Account** (kostenlos): [vercel.com](https://vercel.com)
3. **GitHub Account** (kostenlos): [github.com](https://github.com)

## 📋 Schritt-für-Schritt Setup

### 1. Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle einen Account
2. Klicke auf "New Project"
3. Wähle eine Organisation (oder erstelle eine)
4. Gib deinem Projekt einen Namen: `ai-mapping-system`
5. Wähle ein Datenbank-Passwort (merke es dir!)
6. Wähle eine Region (z.B. West Europe)
7. Klicke auf "Create new project"

### 2. Supabase Datenbank-Schema einrichten

1. Gehe zu deinem Supabase Projekt
2. Klicke auf "SQL Editor" im linken Menü
3. Klicke auf "New query"
4. Kopiere den gesamten Inhalt aus `supabase/schema.sql`
5. Führe das SQL aus (Klick auf "Run")

### 3. Supabase Storage Bucket erstellen

1. Gehe zu "Storage" im linken Menü
2. Klicke auf "New bucket"
3. Name: `uploads`
4. Public bucket: ✅ (aktiviert)
5. Klicke auf "Create bucket"

### 4. Supabase Credentials kopieren

1. Gehe zu "Settings" → "API" im linken Menü
2. Kopiere:
   - **Project URL** (z.B. `https://xyz.supabase.co`)
   - **anon public** Key (beginnt mit `eyJ...`)

### 5. Environment-Variablen konfigurieren

1. Erstelle eine `.env.local` Datei im Projekt-Root:
```bash
cp env.example .env.local
```

2. Füge deine Supabase-Credentials hinzu:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Anwendung lokal testen

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

### 7. GitHub Repository erstellen

1. Gehe zu [github.com](https://github.com)
2. Klicke auf "New repository"
3. Name: `ai-mapping-system`
4. Public oder Private (deine Wahl)
5. Klicke auf "Create repository"

### 8. Code zu GitHub pushen

```bash
git init
git add .
git commit -m "Initial commit: AI Mapping System with Supabase"
git branch -M main
git remote add origin https://github.com/DEIN_USERNAME/ai-mapping-system.git
git push -u origin main
```

### 9. Vercel Deployment

1. Gehe zu [vercel.com](https://vercel.com)
2. Klicke auf "New Project"
3. Importiere dein GitHub Repository
4. Klicke auf "Deploy"

### 10. Environment-Variablen in Vercel

1. Gehe zu deinem Vercel Projekt
2. Klicke auf "Settings" → "Environment Variables"
3. Füge hinzu:
   - `NEXT_PUBLIC_SUPABASE_URL` = deine Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = dein Supabase Anon Key
4. Klicke auf "Save"
5. Gehe zu "Deployments" und klicke auf "Redeploy"

## 🧪 Testing

### Test-Dateien verwenden

1. Verwende die Excel-Datei `src/inputs/1.xlsx`
2. Teste verschiedene Formate (CSV, JSON)
3. Überprüfe die Datenbank-Einträge in Supabase

### Supabase Dashboard prüfen

1. Gehe zu deinem Supabase Projekt
2. Klicke auf "Table Editor"
3. Überprüfe die Tabellen:
   - `projects`
   - `product_data`
   - `field_mappings`

## 🔧 Troubleshooting

### Häufige Probleme:

1. **"User not authenticated"**
   - Supabase Auth ist noch nicht implementiert
   - Für jetzt: Kommentiere die Auth-Prüfung aus

2. **"Failed to upload file"**
   - Überprüfe Storage Bucket "uploads"
   - Überprüfe Storage Policies

3. **"Failed to create project"**
   - Überprüfe RLS Policies
   - Überprüfe Datenbank-Schema

### Debug-Modus aktivieren:

```bash
# In der Browser-Konsole
localStorage.setItem('supabase.debug', 'true')
```

## 📞 Support

Bei Problemen:

1. Überprüfe die Browser-Konsole (F12)
2. Überprüfe die Supabase Logs
3. Überprüfe die Vercel Logs

## 🎯 Nächste Schritte

Nach erfolgreichem Setup:

1. **User Story 2**: AI-Integration für Feld-Zuordnung
2. **User Story 3**: Datenqualitäts-Dashboard
3. **User Story 4**: Inline-Bearbeitung
4. **User Story 5**: Produktname-Generierung

---

**Status**: ✅ Setup-Anleitung vollständig 