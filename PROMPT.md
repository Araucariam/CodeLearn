[LearnApp] Créer une application mobile formation programmation en html, css, js avec un sidebar hamburger, la bibliothèque matérial outlined icônes et un thème de 3 couleurs oklch avec le mode dark. cette application doit être responsive pour desktop et mobile qui est destinée comme modèle pour intégrer des formations (didactitiels, tutos, apprentissages,...) sur les langages de programmations html, css, js, Go, Rust,... etc , comment utiliser l'AI, docker, éditeur de code,.. il faut prévoir le css pour les balises pre et code. Si tu as d'autres idées de fonctionnalités à intégrer ! je vais créer un dossier avec tous les cours et doivent être accessibles facilement ( pour m'y retrouver). fais moi des suggestions pour gérer le site (application). J'ai besoin d'une structure scalable, les cours data.json, pas de cours dans le fichier app.js je te donne une suggestion de structure que tu peux améliorer. CodeLearn/
├── index.html
├── css/
│   ├── si besoin d'autres fichiers ici
│   └── style.css
├── js/
│   ├── data.json
│   └── app.js  fichier pas trop volumineux 
├── courses/
│   ├── html/
│   │   ├── 01-introduction.html
│   │   ├── 02-balises.html
│   │   ├── 03-semantique.html
│   │   ├── 04-formulaires.html
│   │   └── 05-media.html
│   ├── css/
│   │   ├── 01-introduction.html
│   │   ├── 02-selecteurs.html
│   │   ├── 03-box-model.html
│   │   ├── 04-flexbox.html
│   │   ├── 05-grid.html
│   │   └── 06-responsive.html
│   ├── javascript/
│   │   ├── 01-introduction.html
│   │   ├── 02-variables.html
│   │   ├── 03-fonctions.html
│   │   ├── 04-dom.html
│   │   └── 05-async.html
│   ├── go/
│   │   ├── 01-introduction.html
│   │   ├── 02-syntaxe.html
│   │   └── 03-goroutines.html
│   ├── rust/
│   │   ├── 01-introduction.html
│   │   └── 02-ownership.html
│   ├── docker/
│   │   ├── 01-introduction.html
│   │   ├── 02-images.html
│   │   └── 03-compose.html
│   ├── git/
│   │   ├── 01-introduction.html
│   │   └── 02-bases.html
│   ├── editors/
│   │   ├── 01-vscode.html
│   │   └── 02-extensions.html
│   └── ai/
│       ├── 01-introduction.html
│       ├── 02-copilot.html
│       ├── 03-prompt-basics.html
│       └── 04-prompt-advanced.html
└── assets/  une structure solide et professionnelle, scalable tu peux adapter mais les fichiers de cours pas de html-head  juste le contenu  les fichiers avec l'extension (html) 01-introduction.html on peut utiliser l'extension *.js



<!--============  1  ==============-->

📋 Suggestions pour gérer le site / l'application
Voici mes recommandations pour une gestion optimale :

🏗️ Organisation des cours
text

Conventions de nommage :
─────────────────────────
• Fichiers : XX-nom-cours.html (numérotation à 2 chiffres)
• Dossiers : nom-en-minuscule (slug)  
• Ajouter un cours = 1 fichier + 1 entrée dans data.json
• Réorganiser = changer les numéros + mettre à jour data.json
🔧 Pour ajouter un nouveau cours
      Créer le fichier dans courses/categorie/XX-titre.html
      Ajouter l'entrée dans js/data.json
      C'est tout ! Le sidebar, la recherche, la progression se mettent à jour automatiquement.
      
📦 Pour ajouter une nouvelle catégorie
      Créer le dossier dans courses/
      Ajouter la catégorie dans data.json avec id, name, icon, color, lessons
      Les icônes disponibles : fonts.google.com/icons (Material Symbols Outlined)
      
🚀 Fonctionnalités incluses
      Fonctionnalité	      Description
    🔍 Recherche globale	    Ctrl+K pour chercher dans tous les cours
    📊 Progression	          Suivi par leçon et global avec localStorage
    🌙 Mode sombre	          Détection auto + toggle + persistance
    📑 Table des matières	  Générée automatiquement depuis les h2/h3
    📋 Copier le code	      Bouton sur chaque bloc de code
    🔖 Favoris	              Bookmark des leçons
    📱 Responsive	          Mobile-first avec sidebar hamburger
    ⌨️ Raccourcis	          Ctrl+K (recherche), Esc (fermer)
    🔤 Taille police	        Réglable A-/A+
    🖨️ Impression	          CSS print optimisé
    📜 Historique	          Reprendre où vous étiez
    ↔️ Navigation	            Précédent/Suivant entre leçons
    
    💡 Idées d'améliorations futures
      Quiz interactifs à la fin de chaque leçon
      Éditeur de code en ligne (intégrer CodeMirror ou Monaco)
      Export PDF des cours
      Mode hors-ligne avec Service Worker
      Tags/filtres par niveau (Débutant, Intermédiaire, Avancé)
      Système de notes personnelles par leçon
      Highlight.js ou Prism.js pour la coloration syntaxique automatique


🔧 Corrections et Améliorations
Problèmes identifiés et solutions
Bouton Copier : navigator.clipboard est undefined sans HTTPS/localhost → fallback execCommand
Ajout : Éditeur de code intégré avec tabs HTML/CSS/JS + preview live
Ajout : Système de notes personnelles par leçon
Ajout : Indicateur de temps de lecture estimé

css/ajout.css (ajouter à la fin)
index.html (ajouter après scrollTop, avant le search-modal)
HTML

    <!-- READING PROGRESS BAR -->
    <div class="reading-progress-bar" id="readingProgressBar" style="display:none;">
        <div class="reading-progress-fill" id="readingProgressFill"></div>
    </div>



Comment utiliser l'éditeur dans vos cours
Pour intégrer un éditeur dans n'importe quel fichier de cours, ajoutez simplement :

HTML

<!-- Éditeur avec les 3 tabs (HTML, CSS, JS) -->
<div class="editor-placeholder"
     data-html="&lt;h1&gt;Titre&lt;/h1&gt;&lt;p&gt;Contenu&lt;/p&gt;"
     data-css="h1 { color: blue; }"
     data-js="console.log('Hello');">
</div>
Note : Le contenu des attributs data-* doit être encodé en entités HTML (&lt; pour <, &gt; pour >, &amp; pour &).


Résumé des corrections et ajouts
Élément	Avant	Après
Bouton Copier	❌ navigator.clipboard.writeText crash sur file://	✅ Fonction copyToClipboard() avec fallback execCommand + textarea
Éditeur de code	❌ Absent	✅ LiveEditor avec tabs HTML/CSS/JS, preview iframe srcdoc, Tab key, Reset
Notes personnelles	❌ Absent	✅ Section pliable par leçon, auto-save debounce, badge "Sauvegardé"
Barre de lecture	❌ Absent	✅ Progress bar en haut qui suit le scroll
Sécurité clipboard	❌ Crash sans HTTPS	✅ Détection window.isSecureContext + double fallback

