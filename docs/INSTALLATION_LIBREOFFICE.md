# Installation de LibreOffice pour la Conversion DOCX → PDF

## 🎯 Pourquoi LibreOffice ?

LibreOffice offre une **conversion fidèle** du DOCX vers PDF, équivalente à faire "Fichier > Exporter en PDF" dans Microsoft Word. Cette méthode préserve :

- ✅ Les images de fond et leur positionnement
- ✅ Le positionnement absolu du texte
- ✅ Les zones de texte superposées
- ✅ Les polices et styles complexes
- ✅ Les tableaux et mises en forme avancées

## 📥 Installation par Système d'Exploitation

### Windows

#### Option 1 : Téléchargement Officiel (Recommandé)

1. Téléchargez LibreOffice depuis : https://www.libreoffice.org/download/
2. Exécutez l'installateur téléchargé
3. Suivez les instructions d'installation
4. **Important :** Cochez l'option "Ajouter au PATH" si disponible

#### Option 2 : Via Chocolatey

Si vous avez Chocolatey installé :

```powershell
choco install libreoffice
```

#### Vérification de l'Installation (Windows)

```powershell
# Ouvrir PowerShell et tester :
soffice --version
```

Si la commande fonctionne, LibreOffice est correctement installé !

#### Ajout Manuel au PATH (Windows)

Si `soffice --version` ne fonctionne pas :

1. Ouvrir les **Variables d'environnement système**
2. Éditer la variable `Path`
3. Ajouter : `C:\Program Files\LibreOffice\program`
4. Cliquer sur OK
5. **Redémarrer le terminal/serveur Node.js**

### macOS

#### Option 1 : Via Homebrew (Recommandé)

```bash
brew install --cask libreoffice
```

#### Option 2 : Téléchargement Officiel

1. Téléchargez LibreOffice depuis : https://www.libreoffice.org/download/
2. Ouvrez le fichier `.dmg` téléchargé
3. Glissez LibreOffice dans Applications

#### Vérification de l'Installation (macOS)

```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y libreoffice
```

#### Linux (Fedora/RHEL/CentOS)

```bash
sudo dnf install libreoffice
```

#### Linux (Arch)

```bash
sudo pacman -S libreoffice-fresh
```

#### Vérification de l'Installation (Linux)

```bash
libreoffice --version
```

## 🐳 Docker / Environnements de Production

### Dockerfile Exemple

```dockerfile
FROM node:20-slim

# Installer LibreOffice et ses dépendances
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    # Fonts pour un meilleur rendu
    fonts-liberation \
    fonts-dejavu-core \
    # Dépendances pour l'exécution headless
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Copier l'application
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build si nécessaire
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### docker-compose.yml Exemple

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
    volumes:
      - ./uploads:/app/uploads
    # Augmenter la mémoire pour LibreOffice
    mem_limit: 2g
```

### Notes pour Docker

- LibreOffice nécessite **~500 MB d'espace**
- Prévoir **1-2 GB de RAM** pour les conversions
- Les conversions peuvent prendre **2-5 secondes** par document

## ⚙️ Configuration de l'Application

### Méthode Automatique (Recommandé)

L'application détecte automatiquement LibreOffice et l'utilise si disponible :

```typescript
// Aucune configuration nécessaire !
const pdfBuffer = await convertDOCXToPDFWithStyles(docxBuffer)
// Utilise LibreOffice si disponible, sinon fallback vers Puppeteer
```

### Forcer une Méthode Spécifique

```typescript
// Forcer LibreOffice
const pdfBuffer = await convertDOCXToPDFWithStyles(docxBuffer, {
  method: 'libreoffice',
})

// Forcer Puppeteer (ancienne méthode)
const pdfBuffer = await convertDOCXToPDFWithStyles(docxBuffer, {
  method: 'puppeteer',
})
```

### Variable d'Environnement (Optionnel)

Vous pouvez définir une variable d'environnement pour forcer une méthode :

```env
# .env
DOCX_TO_PDF_METHOD=libreoffice  # ou 'puppeteer'
```

## 🧪 Tester l'Installation

### Test Simple en Ligne de Commande

```bash
# Créer un fichier de test
echo "Test" > test.txt

# Sur Linux/macOS
libreoffice --headless --convert-to pdf test.txt

# Sur Windows
soffice --headless --convert-to pdf test.txt

# Si un fichier test.pdf est créé, ça fonctionne ! ✅
ls -l test.pdf
```

### Test dans l'Application

1. **Démarrer l'application :**
   ```bash
   npm run dev
   ```

2. **Regarder les logs au démarrage :**
   ```
   ✅ LibreOffice trouvé avec: libreoffice --version
   ```

3. **Générer un document DOCX → PDF**
   - Uploader un template DOCX
   - Générer en format PDF
   - Vérifier les logs :
     ```
     📄 Conversion DOCX → PDF avec LibreOffice (fidèle à Word)
     🔄 Conversion avec LibreOffice: ...
     ✅ Conversion LibreOffice réussie
     ```

## 🐛 Résolution de Problèmes

### Erreur : "LibreOffice n'est pas installé"

**Cause :** LibreOffice n'est pas dans le PATH

**Solution Windows :**
1. Vérifier l'installation : `C:\Program Files\LibreOffice\program\soffice.exe`
2. Ajouter au PATH (voir section ci-dessus)
3. Redémarrer le terminal/serveur

**Solution Linux/macOS :**
```bash
which libreoffice
# Si vide, réinstaller LibreOffice
```

### Erreur : "Permission denied"

**Cause :** Problèmes de permissions sur les fichiers temporaires

**Solution Linux/macOS :**
```bash
# Vérifier les permissions du dossier temp
ls -la /tmp
chmod 1777 /tmp
```

**Solution Docker :**
```dockerfile
# Donner les bonnes permissions
RUN chmod -R 755 /tmp
```

### Erreur : "Conversion timeout"

**Cause :** Document trop complexe ou serveur surchargé

**Solutions :**
1. Augmenter le timeout dans le code
2. Allouer plus de RAM au conteneur Docker
3. Simplifier le document source

### Erreur : "Font not found"

**Cause :** Polices manquantes

**Solution Linux/Docker :**
```bash
sudo apt-get install -y \
  fonts-liberation \
  fonts-dejavu-core \
  ttf-mscorefonts-installer
```

### L'Application Utilise Puppeteer au lieu de LibreOffice

**Vérifier les logs :**
```
⚠️ LibreOffice non disponible, utilisation de Puppeteer
```

**Causes possibles :**
1. LibreOffice non installé → Installer LibreOffice
2. LibreOffice pas dans le PATH → Ajouter au PATH
3. Serveur Node.js pas redémarré → Redémarrer le serveur

## 📊 Comparaison des Méthodes

| Critère | LibreOffice | Puppeteer (mammoth) |
|---------|-------------|---------------------|
| Fidélité au DOCX | ⭐⭐⭐⭐⭐ Parfaite | ⭐⭐⭐ Approximative |
| Images de fond | ✅ Préservées | ❌ Souvent perdues |
| Positionnement | ✅ Exact | ⚠️ Approximatif |
| Polices complexes | ✅ Supportées | ⚠️ Limitées |
| Vitesse | ⭐⭐⭐⭐ Rapide (2-3s) | ⭐⭐⭐⭐ Rapide (2-3s) |
| Mémoire requise | ~500 MB | ~300 MB |
| Installation | Requiert LibreOffice | Déjà inclus |

## 🚀 Recommandations de Production

### Pour un Hébergement Cloud

**AWS EC2 / Azure VM / Google Compute Engine :**
```bash
# Installer LibreOffice sur le serveur
sudo apt-get update
sudo apt-get install -y libreoffice

# Redémarrer l'application
pm2 restart app
```

**Vercel / Netlify / Heroku :**
- Ces plateformes ne supportent généralement pas LibreOffice
- L'application utilisera automatiquement Puppeteer en fallback
- **Alternative :** Utiliser un service de conversion externe (CloudConvert, etc.)

### Pour Docker Production

```dockerfile
# Utiliser une image avec LibreOffice pré-installé
FROM ubuntu:22.04

# Installer Node.js et LibreOffice
RUN apt-get update && apt-get install -y \
    curl \
    libreoffice \
    libreoffice-writer \
    fonts-liberation \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Reste de la configuration...
```

### Pour Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oxygen-document
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: your-image:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        # LibreOffice est inclus dans l'image
```

## 📞 Support

### Logs de Debugging

Activez les logs détaillés :

```typescript
// Dans votre code
console.log('Test LibreOffice:')
const available = await isLibreOfficeAvailable()
console.log('LibreOffice disponible:', available)
```

### Documentation LibreOffice

- Site officiel : https://www.libreoffice.org/
- Documentation technique : https://help.libreoffice.org/
- Mode headless : https://wiki.documentfoundation.org/Faq/General/015

### Alternatives si LibreOffice ne Fonctionne Pas

1. **unoconv** (basé sur LibreOffice)
   ```bash
   sudo apt-get install unoconv
   unoconv -f pdf document.docx
   ```

2. **pandoc** (pour documents simples)
   ```bash
   sudo apt-get install pandoc
   pandoc document.docx -o document.pdf
   ```

3. **Services cloud** (payants)
   - CloudConvert API
   - Zamzar API
   - ConvertAPI

---

**Dernière mise à jour :** 2 Novembre 2025  
**Version :** 2.1  
**Auteur :** Assistant IA

