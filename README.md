# AI-Supported Data Mapping System

Ein intelligentes System zur automatisierten Zuordnung von Datenfeldern mit KI-Unterstützung für E-Commerce-Produktdaten.

## 🚀 Features

### 📁 Multi-Format File Import
- **Excel (.xlsx)**: Vollständige Unterstützung mit Duplikatserkennung und Beschreibungsextraktion
- **CSV**: Automatische Delimiter-Erkennung und Parsing
- **PDF/TXT**: Grundlegende Unterstützung mit manueller Verarbeitungsanleitung
- **Duplikat-Handling**: Erkennung und Auswahl bei doppelten Feldnamen in Excel-Dateien

### 🤖 KI-Powered Field Mapping
- **Google Gemini Integration**: Intelligente Feldzuordnung mit hoher Genauigkeit
- **Fallback-System**: String-Ähnlichkeits-Mapping bei KI-Ausfall
- **Smart Classification**: Automatische Kategorisierung als Required/Optional
- **Exact Match Detection**: 100%ige Zuordnung bei exakten Feldnamen-Übereinstimmungen

### 🎯 Interactive Mapping Interface
- **Drag & Drop Upload**: Benutzerfreundliche Datei-Upload-Oberfläche
- **Real-time Preview**: Sofortige Anzeige der erkannten Felder und Werte
- **Editable Mappings**: Änderung von Zuordnungen vor dem Speichern
- **Custom Target Fields**: Eingabe eigener Zielfeld-Namen für optionale Felder
- **Duplicate Detection**: Visuelle Hervorhebung von Duplikaten in der Mapping-UI

### 📊 Quality Dashboard
- **Data Quality Metrics**: Übersicht über Vollständigkeit und Qualität der Daten
- **Interactive Filtering**: Filter nach Status (Complete, Missing, Critical, Duplicate)
- **Inline Editing**: Direkte Bearbeitung von Werten im Dashboard
- **Field Management**: Verschiebung zwischen Required/Optional und Entfernung von Feldern
- **Value Lists Integration**: Dropdown-Auswahl für vordefinierte Attributwerte

### 🏷️ AI Product Name Generation
- **Smart Naming**: KI-generierte Produktnamen basierend auf Daten
- **Consistent Format**: "Brand + Description + Key Attributes" Schema
- **Confidence Scoring**: Bewertung der Namensqualität
- **Manual Adjustment**: Möglichkeit zur nachträglichen Anpassung

### 💾 Database Integration
- **Supabase Backend**: PostgreSQL-Datenbank mit Real-time Features
- **Project Management**: Organisierung von Mapping-Projekten
- **History Tracking**: Verfolgung von Änderungen und Versionen
- **File Storage**: Sichere Speicherung hochgeladener Dateien

## 🛠️ Tech Stack

### Frontend
- **Next.js 15**: React-Framework mit App Router
- **TypeScript**: Typsichere Entwicklung
- **Tailwind CSS**: Utility-first CSS Framework
- **Shadcn/UI**: Moderne UI-Komponenten
- **Lucide React**: Icon-Bibliothek

### Backend & Database
- **Supabase**: PostgreSQL-Datenbank mit Real-time Features
- **Row Level Security (RLS)**: Sichere Datenzugriffe
- **File Storage**: Supabase Storage für Datei-Upload

### AI & Processing
- **Google Gemini API**: Large Language Model für intelligente Zuordnungen
- **XLSX**: Excel-Datei-Verarbeitung
- **React Dropzone**: File-Upload-Interface

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm oder yarn
- Supabase Account
- Google Gemini API Key

### Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/GiuGiglio/ai-supported-data-mapping-system.git
   cd ai-supported-data-mapping-system
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Environment Variables konfigurieren**
   
   Erstellen Sie eine `.env.local` Datei:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Supabase Database Setup**
   
   Führen Sie die SQL-Skripte in Ihrer Supabase-Instanz aus:
   ```sql
   -- Erstellen Sie die notwendigen Tabellen
   -- (SQL-Skripte sind im Repository verfügbar)
   ```

5. **Development Server starten**
   ```bash
   npm run dev
   ```

   Die Anwendung ist nun unter `http://localhost:3000` verfügbar.

## 📋 Usage

### 1. Datei Upload
- Ziehen Sie eine Excel/CSV-Datei in den Upload-Bereich
- Das System erkennt automatisch Felder und extrahiert Beschreibungen
- Bei Duplikaten werden alle Werte zur Auswahl angezeigt

### 2. Field Mapping
- Die KI schlägt automatisch Zuordnungen vor
- Überprüfen und anpassen Sie die Mappings nach Bedarf
- Ändern Sie Required/Optional-Status oder entfernen Sie Felder
- Bearbeiten Sie Quellwerte direkt in der Oberfläche

### 3. Quality Dashboard
- Überprüfen Sie die Datenqualität in der Dashboard-Ansicht
- Filtern Sie nach verschiedenen Qualitätsstatus
- Bearbeiten Sie Werte inline und verwalten Sie Feldtypen
- Nutzen Sie Value Lists für konsistente Attributwerte

### 4. Product Name Generation
- Generieren Sie konsistente Produktnamen mit KI
- Bewerten Sie die Qualität anhand des Confidence Scores
- Kopieren Sie generierte Namen zur weiteren Verwendung

## 🏗️ Architecture

### Database Schema
- **projects**: Projekt-Management und Metadaten
- **field_mappings**: Gespeicherte Feld-Zuordnungen
- **optional_fields**: Optionale Felder und deren Werte
- **target_fields**: Vordefinierte Zielfeld-Definitionen
- **value_lists**: Kontrollierte Vokabulare für Attribute

### AI Integration
- **Gemini Pro Model**: Intelligente Feldzuordnung
- **JSON Response Parsing**: Robuste Verarbeitung von KI-Antworten
- **Fallback Mechanisms**: Levenshtein-Distanz bei KI-Ausfall

### File Processing Pipeline
1. **Upload & Validation**: Dateityp-Erkennung und Validierung
2. **Parsing**: Format-spezifische Datenextraktion
3. **Field Detection**: Automatische Felderkennung und -bereinigung
4. **Duplicate Handling**: Erkennung und Verwaltung von Duplikaten
5. **AI Mapping**: Intelligente Feldzuordnung
6. **Quality Assessment**: Bewertung der Datenqualität

## 🔧 Configuration

### Supabase Setup
1. Erstellen Sie ein neues Supabase-Projekt
2. Führen Sie die SQL-Migrationsskripte aus
3. Konfigurieren Sie Row Level Security (RLS)
4. Richten Sie File Storage Buckets ein

### Gemini API Setup
1. Erstellen Sie ein Google Cloud-Projekt
2. Aktivieren Sie die Gemini API
3. Generieren Sie einen API-Schlüssel
4. Fügen Sie den Schlüssel zu Ihren Environment Variables hinzu

## 🚀 Deployment

### Vercel (Empfohlen)
1. Verknüpfen Sie Ihr GitHub-Repository mit Vercel
2. Konfigurieren Sie die Environment Variables in Vercel
3. Deploy automatisch bei Git-Push

### Environment Variables für Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

## 🧪 Testing

```bash
# Linting
npm run lint

# Type checking
npm run build

# Development server
npm run dev
```

## 📝 API Documentation

### AI Field Mapping Service
```typescript
interface FieldMappingRequest {
  sourceFields: string[]
  targetFields?: TargetField[]
  fieldDescriptions?: Record<string, string>
}

interface FieldMappingResult {
  sourceField: string
  targetField: string
  confidence: number
  reason: string
  isRequired: boolean
  isOptional: boolean
}
```

### Supabase Services
- `projectService`: Projekt-Management
- `targetFieldService`: Zielfeld-Verwaltung
- `valueListService`: Value List-Management
- `fileUploadService`: Datei-Upload und -Speicherung

## 🤝 Contributing

1. Fork das Repository
2. Erstellen Sie einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add amazing feature'`)
4. Pushen Sie zum Branch (`git push origin feature/amazing-feature`)
5. Öffnen Sie einen Pull Request

## 📄 License

Dieses Projekt steht unter der MIT-Lizenz. Siehe `LICENSE` Datei für Details.

## 🆘 Support

Bei Fragen oder Problemen:
- Öffnen Sie ein Issue im GitHub-Repository
- Kontaktieren Sie das Entwicklungsteam
- Konsultieren Sie die Dokumentation

## 🔄 Roadmap

### Geplante Features
- [ ] Batch-Processing für mehrere Dateien
- [ ] Advanced Data Validation Rules
- [ ] Custom AI Model Training
- [ ] API-Integration für externe Systeme
- [ ] Multi-Language Support
- [ ] Advanced Analytics Dashboard

### Verbesserungen
- [ ] Performance-Optimierungen für große Dateien
- [ ] Enhanced Error Handling
- [ ] Improved UI/UX
- [ ] Mobile Responsiveness
- [ ] Accessibility Improvements

---
