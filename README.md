# AI Mapping System

Ein KI-gestütztes Daten-Mapping System für die automatisierte Produktdaten-Verarbeitung mit Supabase Backend.

## User Story 1: Datei-Upload und -Erkennung

Diese Implementierung erfüllt die High Priority User Story 1 mit folgenden Akzeptanzkriterien:

### ✅ Erfüllte Akzeptanzkriterien:

- **System akzeptiert Excel (.xlsx, .xls), CSV, JSON, PDF und Freitext-Eingaben**
- **Drag-and-Drop-Funktionalität verfügbar**
- **Dateigröße bis 50MB unterstützt**
- **Fehlermeldungen bei nicht unterstützten Formaten**
- **Upload-Progress-Anzeige**

### 🚀 Features:

1. **Drag & Drop Interface**: Intuitive Datei-Upload-Oberfläche
2. **Multi-Format Support**: Excel, CSV, JSON, PDF, Text
3. **Progress Tracking**: Echtzeit-Upload- und Verarbeitungsfortschritt
4. **Error Handling**: Detaillierte Fehlermeldungen
5. **File Management**: Anzeige und Verwaltung hochgeladener Dateien
6. **Data Preview**: Vorschau der verarbeiteten Daten
7. **Download Functionality**: Export verarbeiteter Daten als JSON
8. **Supabase Integration**: Automatische Speicherung in PostgreSQL-Datenbank
9. **File Storage**: Supabase Storage für Datei-Uploads
10. **Real-time Updates**: Supabase Real-time für Dashboard-Updates

## 🛠️ Technologie-Stack

- **Frontend**: Next.js 15 mit TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Real-time)
- **UI Framework**: Tailwind CSS + Custom Components
- **File Processing**: xlsx.js für Excel/CSV-Verarbeitung
- **Drag & Drop**: react-dropzone
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📦 Installation

### 1. Repository klonen
```bash
git clone <repository-url>
cd ai-mapping-system
```

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Supabase Setup

#### A. Supabase Projekt erstellen
1. Gehen Sie zu [supabase.com](https://supabase.com)
2. Erstellen Sie ein neues Projekt
3. Notieren Sie sich die Project URL und Anon Key

#### B. Datenbank-Schema einrichten
1. Öffnen Sie die Supabase SQL Editor
2. Führen Sie das Schema aus `supabase/schema.sql` aus
3. Erstellen Sie einen Storage Bucket namens "uploads"

#### C. Environment-Variablen konfigurieren
```bash
cp env.example .env.local
```

Fügen Sie Ihre Supabase-Credentials hinzu:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Entwicklungsserver starten
```bash
npm run dev
```

### 5. Anwendung öffnen
```
http://localhost:3000
```

## 🎯 Verwendung

1. **Datei hochladen**: Ziehen Sie Dateien in die Drop-Zone oder klicken Sie zum Auswählen
2. **Verarbeitung beobachten**: Der Fortschritt wird in Echtzeit angezeigt
3. **Daten anzeigen**: Klicken Sie auf "View Data" um die verarbeiteten Daten zu sehen
4. **Daten herunterladen**: Exportieren Sie die Daten als JSON-Datei
5. **Backend-Speicherung**: Alle Daten werden automatisch in Supabase gespeichert

## 📁 Projektstruktur

```
src/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page component
├── components/
│   ├── ui/
│   │   └── button.tsx       # Reusable button component
│   └── FileUpload.tsx       # File upload component
├── lib/
│   ├── supabase.ts          # Supabase client & types
│   ├── supabase-services.ts # Database service functions
│   └── utils.ts             # Utility functions
├── inputs/                  # Sample input files
│   ├── 1.xlsx              # Sample Excel file
│   └── ...
└── supabase/
    └── schema.sql           # Database schema
```

## 🔧 Konfiguration

### Unterstützte Dateiformate:
- Excel (.xlsx, .xls)
- CSV (.csv)
- JSON (.json)
- PDF (.pdf)
- Text (.txt)

### Dateigrößen-Limits:
- Maximale Dateigröße: 50MB
- Mehrere Dateien gleichzeitig möglich

### Supabase-Konfiguration:
- PostgreSQL-Datenbank mit Row Level Security
- Supabase Storage für Datei-Uploads
- Supabase Auth für Benutzerauthentifizierung
- Real-time Subscriptions für Live-Updates

## 🧪 Testing

Die Anwendung kann mit den bereitgestellten Sample-Dateien getestet werden:

1. **Excel-Datei testen**: Verwenden Sie `src/inputs/1.xlsx`
2. **Verschiedene Formate**: Testen Sie CSV, JSON und andere Formate
3. **Error Cases**: Versuchen Sie nicht unterstützte Dateitypen
4. **Backend-Test**: Überprüfen Sie die Datenbank-Einträge in Supabase

## 🚀 Deployment auf Vercel

### 1. Vercel Setup
1. Gehen Sie zu [vercel.com](https://vercel.com)
2. Verbinden Sie Ihr GitHub-Repository
3. Konfigurieren Sie die Environment-Variablen

### 2. Environment-Variablen in Vercel
Fügen Sie diese Variablen in den Vercel-Projekteinstellungen hinzu:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Deployment
```bash
# Automatisches Deployment bei Git Push
git push origin main
```

## 🔮 Nächste Schritte

Diese Implementierung ist die Grundlage für die weiteren User Stories:

- **User Story 2**: Intelligente Feld-Zuordnung mit AI
- **User Story 3**: Datenqualitäts-Dashboard
- **User Story 4**: Inline-Bearbeitung
- **User Story 5**: Produktname-Generierung

## 📝 Hinweise

- **PDF-Verarbeitung**: Aktuell nur Platzhalter-Implementierung
- **AI-Integration**: Noch nicht implementiert (für User Story 2 geplant)
- **Authentication**: Supabase Auth ist konfiguriert, aber noch nicht in der UI implementiert

## 🤝 Empfehlungen für AI-Tools

Für die nächsten User Stories werden folgende AI-Tools empfohlen:

1. **OpenAI GPT-4o**: Für intelligente Feld-Zuordnung und Produktname-Generierung
2. **Anthropic Claude**: Für komplexe Datenanalyse
3. **Google Gemini**: Für Multimodal-Input (falls PDF-Text-Extraktion benötigt wird)

## 🔒 Sicherheit

- **Row Level Security (RLS)**: Implementiert für alle Tabellen
- **User Isolation**: Benutzer können nur ihre eigenen Daten sehen
- **File Upload Security**: Validierung und Größenbeschränkungen
- **Environment Variables**: Sichere Konfiguration über Umgebungsvariablen

## 📊 Datenbank-Schema

Das System verwendet folgende Tabellen:
- `projects`: Projekt-Informationen
- `field_mappings`: Feld-Zuordnungen
- `product_data`: Produktdaten
- `value_lists`: Value-Listen für Attribute
- `mapping_history`: Mapping-Historie für Learning

---

**Status**: ✅ User Story 1 vollständig implementiert mit Supabase Backend 