export type LangCode = string;

export interface UIStrings {
  // Nav
  thisWeek: string;
  groceries: string;
  pantry: string;
  recipes: string;
  nonnasKitchen: string;
  heritageKitchen?: string;
  specialOccasion: string;
  onTheFly: string;
  somethingSweet: string;
  traditions: string;
  findARecipe: string;
  archive: string;
  settings: string;
  signOut: string;
  // Pages — headings & subtitles
  thisWeekTitle: string;
  thisWeekSubtitle: string;
  groceriesTitle: string;
  groceriesSubtitle: string;
  pantryTitle: string;
  pantrySubtitle: string;
  recipesTitle: string;
  recipesSubtitle: string;
  nonnasKitchenTitle: string;
  nonnasKitchenSubtitle: string;
  specialOccasionTitle: string;
  specialOccasionSubtitle: string;
  onTheFlyTitle: string;
  onTheFlySubtitle: string;
  somethingSweetTitle: string;
  somethingSweetSubtitle: string;
  traditionsTitle: string;
  traditionsSubtitle: string;
  findARecipeTitle: string;
  findARecipeSubtitle: string;
  archiveTitle: string;
  archiveSubtitle: string;
  settingsTitle: string;
  // Common actions
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  print: string;
  back: string;
  loading: string;
  generate: string;
  tryAnother: string;
  saveToRecipes: string;
  saved: string;
}

const en: UIStrings = {
  thisWeek: 'This Week', groceries: 'Groceries', pantry: 'Pantry',
  recipes: 'Recipes', nonnasKitchen: "Nonna's Kitchen", heritageKitchen: 'Heritage Kitchen',
  specialOccasion: 'Special Occasion', onTheFly: 'On the Fly',
  somethingSweet: 'Something Sweet', traditions: 'Traditions',
  findARecipe: 'Find a Recipe',
  archive: 'Archive', settings: 'Settings', signOut: 'Sign out',
  thisWeekTitle: 'This Week', thisWeekSubtitle: "Your family's dinner plan for the week.",
  groceriesTitle: 'Groceries', groceriesSubtitle: 'Your shopping list for the week.',
  pantryTitle: 'Pantry', pantrySubtitle: 'Keep track of what you have at home.',
  recipesTitle: 'My Recipes', recipesSubtitle: 'Your saved family recipes.',
  nonnasKitchenTitle: "Nonna's Kitchen", nonnasKitchenSubtitle: 'Classic recipes from the family archive.',
  specialOccasionTitle: 'Special Occasion', specialOccasionSubtitle: 'Plan a memorable menu and get a personalised day-by-day preparation timeline…',
  onTheFlyTitle: 'On the Fly', onTheFlySubtitle: "Tell us what's in your fridge — we'll make dinner out of it.",
  somethingSweetTitle: 'Something Sweet', somethingSweetSubtitle: 'Desserts, cakes, and bakes — something for every sweet tooth.',
  traditionsTitle: 'Traditions', traditionsSubtitle: 'Explore the culinary heritage of any culture.',
  findARecipeTitle: 'Find a Recipe', findARecipeSubtitle: 'Name a dish or describe what you\'re craving — we\'ll write the recipe.',
  archiveTitle: 'Archive', archiveSubtitle: 'Your past weekly menus.',
  settingsTitle: 'Settings',
  save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', print: 'Print',
  back: 'Back', loading: 'Loading…', generate: 'Generate Recipe',
  tryAnother: 'Try a different recipe', saveToRecipes: 'Save to my recipes', saved: '✓ Saved to recipes',
};

const it: UIStrings = {
  thisWeek: 'Questa settimana', groceries: 'Spesa', pantry: 'Dispensa',
  recipes: 'Ricette', nonnasKitchen: 'La cucina della Nonna',
  specialOccasion: 'Occasione speciale', onTheFly: 'Al volo',
  somethingSweet: 'Dolcezze', traditions: 'Tradizioni', findARecipe: 'Trova una ricetta',
  archive: 'Archivio', settings: 'Impostazioni', signOut: 'Esci',
  thisWeekTitle: 'Questa settimana', thisWeekSubtitle: 'Il piano cene della tua famiglia per questa settimana.',
  groceriesTitle: 'Spesa', groceriesSubtitle: 'La tua lista della spesa per la settimana.',
  pantryTitle: 'Dispensa', pantrySubtitle: 'Tieni traccia di quello che hai a casa.',
  recipesTitle: 'Le mie ricette', recipesSubtitle: 'Le tue ricette di famiglia salvate.',
  nonnasKitchenTitle: 'La cucina della Nonna', nonnasKitchenSubtitle: 'Ricette classiche dall\'archivio di famiglia.',
  specialOccasionTitle: 'Occasione speciale', specialOccasionSubtitle: 'Pianifica un menù memorabile con una timeline giorno per giorno…',
  onTheFlyTitle: 'Al volo', onTheFlySubtitle: 'Dimmi cosa c\'è nel frigo — ci pensiamo noi alla cena.',
  somethingSweetTitle: 'Dolcezze', somethingSweetSubtitle: 'Dolci, torte e lievitati — per ogni voglia di dolce.',
  traditionsTitle: 'Tradizioni', traditionsSubtitle: 'Esplora il patrimonio culinario di ogni cultura.',
  findARecipeTitle: 'Trova una ricetta', findARecipeSubtitle: 'Scrivi il nome di un piatto o descrivi quello che hai voglia di mangiare — ci pensiamo noi.',
  archiveTitle: 'Archivio', archiveSubtitle: 'I tuoi menu settimanali passati.',
  settingsTitle: 'Impostazioni',
  save: 'Salva', cancel: 'Annulla', delete: 'Elimina', edit: 'Modifica', print: 'Stampa',
  back: 'Indietro', loading: 'Caricamento…', generate: 'Genera ricetta',
  tryAnother: 'Prova una ricetta diversa', saveToRecipes: 'Salva nelle mie ricette', saved: '✓ Salvata',
};

const es: UIStrings = {
  thisWeek: 'Esta semana', groceries: 'Compras', pantry: 'Despensa',
  recipes: 'Recetas', nonnasKitchen: 'La cocina de la Abuela',
  specialOccasion: 'Ocasión especial', onTheFly: 'Al instante',
  somethingSweet: 'Algo dulce', traditions: 'Tradiciones', findARecipe: 'Buscar una receta',
  archive: 'Archivo', settings: 'Ajustes', signOut: 'Cerrar sesión',
  thisWeekTitle: 'Esta semana', thisWeekSubtitle: 'El plan de cenas de tu familia para esta semana.',
  groceriesTitle: 'Compras', groceriesSubtitle: 'Tu lista de la compra para la semana.',
  pantryTitle: 'Despensa', pantrySubtitle: 'Lleva un registro de lo que tienes en casa.',
  recipesTitle: 'Mis recetas', recipesSubtitle: 'Tus recetas familiares guardadas.',
  nonnasKitchenTitle: 'La cocina de la Abuela', nonnasKitchenSubtitle: 'Recetas clásicas del archivo familiar.',
  specialOccasionTitle: 'Ocasión especial', specialOccasionSubtitle: 'Planifica un menú memorable con una línea de tiempo día a día…',
  onTheFlyTitle: 'Al instante', onTheFlySubtitle: 'Dinos qué hay en tu nevera — nosotros hacemos la cena.',
  somethingSweetTitle: 'Algo dulce', somethingSweetSubtitle: 'Postres, tartas y repostería — para cada antojo dulce.',
  traditionsTitle: 'Tradiciones', traditionsSubtitle: 'Explora el patrimonio culinario de cualquier cultura.',
  findARecipeTitle: 'Buscar una receta', findARecipeSubtitle: 'Nombra un plato o describe tu antojo — nosotros escribimos la receta.',
  archiveTitle: 'Archivo', archiveSubtitle: 'Tus menús semanales anteriores.',
  settingsTitle: 'Ajustes',
  save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', print: 'Imprimir',
  back: 'Volver', loading: 'Cargando…', generate: 'Generar receta',
  tryAnother: 'Probar otra receta', saveToRecipes: 'Guardar en mis recetas', saved: '✓ Guardada',
};

const fr: UIStrings = {
  thisWeek: 'Cette semaine', groceries: 'Courses', pantry: 'Garde-manger',
  recipes: 'Recettes', nonnasKitchen: 'La cuisine de Nonna',
  specialOccasion: 'Occasion spéciale', onTheFly: 'À la volée',
  somethingSweet: 'Quelque chose de sucré', traditions: 'Traditions', findARecipe: 'Trouver une recette',
  archive: 'Archives', settings: 'Paramètres', signOut: 'Déconnexion',
  thisWeekTitle: 'Cette semaine', thisWeekSubtitle: 'Le plan de dîners de votre famille pour cette semaine.',
  groceriesTitle: 'Courses', groceriesSubtitle: 'Votre liste de courses pour la semaine.',
  pantryTitle: 'Garde-manger', pantrySubtitle: 'Gardez une trace de ce que vous avez à la maison.',
  recipesTitle: 'Mes recettes', recipesSubtitle: 'Vos recettes de famille sauvegardées.',
  nonnasKitchenTitle: 'La cuisine de Nonna', nonnasKitchenSubtitle: 'Recettes classiques de l\'archive familiale.',
  specialOccasionTitle: 'Occasion spéciale', specialOccasionSubtitle: 'Planifiez un menu mémorable avec un calendrier jour par jour…',
  onTheFlyTitle: 'À la volée', onTheFlySubtitle: 'Dites-nous ce qu\'il y a dans votre frigo — on s\'occupe du dîner.',
  somethingSweetTitle: 'Quelque chose de sucré', somethingSweetSubtitle: 'Desserts, gâteaux et pâtisseries — pour chaque envie sucrée.',
  traditionsTitle: 'Traditions', traditionsSubtitle: 'Explorez le patrimoine culinaire de chaque culture.',
  findARecipeTitle: 'Trouver une recette', findARecipeSubtitle: 'Nommez un plat ou décrivez votre envie — nous écrivons la recette.',
  archiveTitle: 'Archives', archiveSubtitle: 'Vos menus hebdomadaires passés.',
  settingsTitle: 'Paramètres',
  save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', print: 'Imprimer',
  back: 'Retour', loading: 'Chargement…', generate: 'Générer une recette',
  tryAnother: 'Essayer une autre recette', saveToRecipes: 'Sauvegarder mes recettes', saved: '✓ Sauvegardée',
};

const pt: UIStrings = {
  thisWeek: 'Esta semana', groceries: 'Compras', pantry: 'Despensa',
  recipes: 'Receitas', nonnasKitchen: 'A cozinha da Avó',
  specialOccasion: 'Ocasião especial', onTheFly: 'Na hora',
  somethingSweet: 'Algo doce', traditions: 'Tradições', findARecipe: 'Encontrar uma receita',
  archive: 'Arquivo', settings: 'Configurações', signOut: 'Sair',
  thisWeekTitle: 'Esta semana', thisWeekSubtitle: 'O plano de jantares da sua família para esta semana.',
  groceriesTitle: 'Compras', groceriesSubtitle: 'A sua lista de compras para a semana.',
  pantryTitle: 'Despensa', pantrySubtitle: 'Mantenha o controlo do que tem em casa.',
  recipesTitle: 'As minhas receitas', recipesSubtitle: 'As suas receitas de família guardadas.',
  nonnasKitchenTitle: 'A cozinha da Avó', nonnasKitchenSubtitle: 'Receitas clássicas do arquivo familiar.',
  specialOccasionTitle: 'Ocasião especial', specialOccasionSubtitle: 'Planeie um menu memorável com um cronograma dia a dia…',
  onTheFlyTitle: 'Na hora', onTheFlySubtitle: 'Diga-nos o que há no seu frigorífico — tratamos do jantar.',
  somethingSweetTitle: 'Algo doce', somethingSweetSubtitle: 'Sobremesas, bolos e pâtisserie — para cada vontade de doce.',
  traditionsTitle: 'Tradições', traditionsSubtitle: 'Explore o património culinário de qualquer cultura.',
  findARecipeTitle: 'Encontrar uma receita', findARecipeSubtitle: 'Diga o nome de um prato ou descreva o que apetece — nós escrevemos a receita.',
  archiveTitle: 'Arquivo', archiveSubtitle: 'Os seus menus semanais anteriores.',
  settingsTitle: 'Configurações',
  save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', print: 'Imprimir',
  back: 'Voltar', loading: 'A carregar…', generate: 'Gerar receita',
  tryAnother: 'Experimentar outra receita', saveToRecipes: 'Guardar nas minhas receitas', saved: '✓ Guardada',
};

const de: UIStrings = {
  thisWeek: 'Diese Woche', groceries: 'Einkauf', pantry: 'Vorratskammer',
  recipes: 'Rezepte', nonnasKitchen: 'Nonnas Küche',
  specialOccasion: 'Besonderer Anlass', onTheFly: 'Spontan',
  somethingSweet: 'Etwas Süßes', traditions: 'Traditionen', findARecipe: 'Rezept finden',
  archive: 'Archiv', settings: 'Einstellungen', signOut: 'Abmelden',
  thisWeekTitle: 'Diese Woche', thisWeekSubtitle: 'Der Dinnerplan Ihrer Familie für diese Woche.',
  groceriesTitle: 'Einkauf', groceriesSubtitle: 'Ihre Einkaufsliste für die Woche.',
  pantryTitle: 'Vorratskammer', pantrySubtitle: 'Behalten Sie den Überblick über Ihre Vorräte.',
  recipesTitle: 'Meine Rezepte', recipesSubtitle: 'Ihre gespeicherten Familienrezepte.',
  nonnasKitchenTitle: 'Nonnas Küche', nonnasKitchenSubtitle: 'Klassische Rezepte aus dem Familienarchiv.',
  specialOccasionTitle: 'Besonderer Anlass', specialOccasionSubtitle: 'Planen Sie ein unvergessliches Menü mit tagesgenauer Vorbereitung…',
  onTheFlyTitle: 'Spontan', onTheFlySubtitle: 'Sagen Sie uns, was im Kühlschrank ist — wir machen das Abendessen.',
  somethingSweetTitle: 'Etwas Süßes', somethingSweetSubtitle: 'Desserts, Kuchen und Backwaren — für jeden Süßhunger.',
  traditionsTitle: 'Traditionen', traditionsSubtitle: 'Entdecken Sie das kulinarische Erbe jeder Kultur.',
  findARecipeTitle: 'Rezept finden', findARecipeSubtitle: 'Nennen Sie ein Gericht oder beschreiben Sie Ihren Hunger — wir schreiben das Rezept.',
  archiveTitle: 'Archiv', archiveSubtitle: 'Ihre vergangenen Wochenmenüs.',
  settingsTitle: 'Einstellungen',
  save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', print: 'Drucken',
  back: 'Zurück', loading: 'Laden…', generate: 'Rezept generieren',
  tryAnother: 'Anderes Rezept versuchen', saveToRecipes: 'In meinen Rezepten speichern', saved: '✓ Gespeichert',
};

const nl: UIStrings = {
  thisWeek: 'Deze week', groceries: 'Boodschappen', pantry: 'Voorraadkast',
  recipes: 'Recepten', nonnasKitchen: "Nonna's keuken",
  specialOccasion: 'Speciale gelegenheid', onTheFly: 'Ad hoc',
  somethingSweet: 'Iets zoets', traditions: 'Tradities', findARecipe: 'Recept zoeken',
  archive: 'Archief', settings: 'Instellingen', signOut: 'Uitloggen',
  thisWeekTitle: 'Deze week', thisWeekSubtitle: 'Het dinerplan van uw gezin voor deze week.',
  groceriesTitle: 'Boodschappen', groceriesSubtitle: 'Uw boodschappenlijst voor de week.',
  pantryTitle: 'Voorraadkast', pantrySubtitle: 'Houd bij wat u thuis heeft.',
  recipesTitle: 'Mijn recepten', recipesSubtitle: 'Uw opgeslagen gezinsrecepten.',
  nonnasKitchenTitle: "Nonna's keuken", nonnasKitchenSubtitle: 'Klassieke recepten uit het gezinsarchief.',
  specialOccasionTitle: 'Speciale gelegenheid', specialOccasionSubtitle: 'Plan een onvergetelijk menu met een dag-voor-dag voorbereiding…',
  onTheFlyTitle: 'Ad hoc', onTheFlySubtitle: 'Vertel ons wat er in de koelkast zit — wij maken het avondeten.',
  somethingSweetTitle: 'Iets zoets', somethingSweetSubtitle: 'Desserts, taarten en gebak — voor elke zoete trek.',
  traditionsTitle: 'Tradities', traditionsSubtitle: 'Ontdek het culinaire erfgoed van elke cultuur.',
  findARecipeTitle: 'Recept zoeken', findARecipeSubtitle: 'Noem een gerecht of beschrijf je zin — wij schrijven het recept.',
  archiveTitle: 'Archief', archiveSubtitle: 'Uw vroegere weekmenu\'s.',
  settingsTitle: 'Instellingen',
  save: 'Opslaan', cancel: 'Annuleren', delete: 'Verwijderen', edit: 'Bewerken', print: 'Afdrukken',
  back: 'Terug', loading: 'Laden…', generate: 'Recept genereren',
  tryAnother: 'Ander recept proberen', saveToRecipes: 'Opslaan in mijn recepten', saved: '✓ Opgeslagen',
};

const ru: UIStrings = {
  thisWeek: 'На этой неделе', groceries: 'Покупки', pantry: 'Кладовая',
  recipes: 'Рецепты', nonnasKitchen: 'Кухня Нонны',
  specialOccasion: 'Особый случай', onTheFly: 'На ходу',
  somethingSweet: 'Что-то сладкое', traditions: 'Традиции', findARecipe: 'Найти рецепт',
  archive: 'Архив', settings: 'Настройки', signOut: 'Выйти',
  thisWeekTitle: 'На этой неделе', thisWeekSubtitle: 'План ужинов вашей семьи на эту неделю.',
  groceriesTitle: 'Покупки', groceriesSubtitle: 'Ваш список покупок на неделю.',
  pantryTitle: 'Кладовая', pantrySubtitle: 'Следите за тем, что есть дома.',
  recipesTitle: 'Мои рецепты', recipesSubtitle: 'Ваши сохранённые семейные рецепты.',
  nonnasKitchenTitle: 'Кухня Нонны', nonnasKitchenSubtitle: 'Классические рецепты из семейного архива.',
  specialOccasionTitle: 'Особый случай', specialOccasionSubtitle: 'Спланируйте незабываемое меню с пошаговой подготовкой…',
  onTheFlyTitle: 'На ходу', onTheFlySubtitle: 'Скажите, что есть в холодильнике — мы придумаем ужин.',
  somethingSweetTitle: 'Что-то сладкое', somethingSweetSubtitle: 'Десерты, торты и выпечка — для любого сладкого желания.',
  traditionsTitle: 'Традиции', traditionsSubtitle: 'Исследуйте кулинарное наследие любой культуры.',
  findARecipeTitle: 'Найти рецепт', findARecipeSubtitle: 'Назовите блюдо или опишите желание — мы напишем рецепт.',
  archiveTitle: 'Архив', archiveSubtitle: 'Ваши прошлые недельные меню.',
  settingsTitle: 'Настройки',
  save: 'Сохранить', cancel: 'Отмена', delete: 'Удалить', edit: 'Изменить', print: 'Печать',
  back: 'Назад', loading: 'Загрузка…', generate: 'Создать рецепт',
  tryAnother: 'Попробовать другой рецепт', saveToRecipes: 'Сохранить в рецепты', saved: '✓ Сохранено',
};

const pl: UIStrings = {
  thisWeek: 'W tym tygodniu', groceries: 'Zakupy', pantry: 'Spiżarnia',
  recipes: 'Przepisy', nonnasKitchen: 'Kuchnia Nony',
  specialOccasion: 'Specjalna okazja', onTheFly: 'Na szybko',
  somethingSweet: 'Coś słodkiego', traditions: 'Tradycje', findARecipe: 'Znajdź przepis',
  archive: 'Archiwum', settings: 'Ustawienia', signOut: 'Wyloguj',
  thisWeekTitle: 'W tym tygodniu', thisWeekSubtitle: 'Plan obiadów Twojej rodziny na ten tydzień.',
  groceriesTitle: 'Zakupy', groceriesSubtitle: 'Twoja lista zakupów na tydzień.',
  pantryTitle: 'Spiżarnia', pantrySubtitle: 'Śledź, co masz w domu.',
  recipesTitle: 'Moje przepisy', recipesSubtitle: 'Twoje zapisane przepisy rodzinne.',
  nonnasKitchenTitle: 'Kuchnia Nony', nonnasKitchenSubtitle: 'Klasyczne przepisy z rodzinnego archiwum.',
  specialOccasionTitle: 'Specjalna okazja', specialOccasionSubtitle: 'Zaplanuj niezapomniany jadłospis z harmonogramem na każdy dzień…',
  onTheFlyTitle: 'Na szybko', onTheFlySubtitle: 'Powiedz nam, co jest w lodówce — my zrobimy kolację.',
  somethingSweetTitle: 'Coś słodkiego', somethingSweetSubtitle: 'Desery, ciasta i wypieki — na każdą słodką ochotę.',
  traditionsTitle: 'Tradycje', traditionsSubtitle: 'Odkryj kulinarne dziedzictwo każdej kultury.',
  findARecipeTitle: 'Znajdź przepis', findARecipeSubtitle: 'Podaj nazwę dania lub opisz ochotę — my piszemy przepis.',
  archiveTitle: 'Archiwum', archiveSubtitle: 'Twoje poprzednie tygodniowe menu.',
  settingsTitle: 'Ustawienia',
  save: 'Zapisz', cancel: 'Anuluj', delete: 'Usuń', edit: 'Edytuj', print: 'Drukuj',
  back: 'Wstecz', loading: 'Ładowanie…', generate: 'Generuj przepis',
  tryAnother: 'Spróbuj innego przepisu', saveToRecipes: 'Zapisz do moich przepisów', saved: '✓ Zapisano',
};

const ja: UIStrings = {
  thisWeek: '今週', groceries: '買い物リスト', pantry: '食料品庫',
  recipes: 'レシピ', nonnasKitchen: 'ノンナのキッチン',
  specialOccasion: '特別な日', onTheFly: 'ひらめきレシピ',
  somethingSweet: '甘いもの', traditions: '伝統料理', findARecipe: 'レシピを探す',
  archive: 'アーカイブ', settings: '設定', signOut: 'ログアウト',
  thisWeekTitle: '今週', thisWeekSubtitle: '今週のご家族の夕食プラン。',
  groceriesTitle: '買い物リスト', groceriesSubtitle: '今週のお買い物リスト。',
  pantryTitle: '食料品庫', pantrySubtitle: '自宅にある食材を管理しましょう。',
  recipesTitle: 'マイレシピ', recipesSubtitle: '保存したご家族のレシピ。',
  nonnasKitchenTitle: 'ノンナのキッチン', nonnasKitchenSubtitle: '家族のアーカイブから定番レシピ。',
  specialOccasionTitle: '特別な日', specialOccasionSubtitle: '忘れられないメニューを計画し、日ごとの準備タイムラインを作成…',
  onTheFlyTitle: 'ひらめきレシピ', onTheFlySubtitle: '冷蔵庫にある食材を教えてください。夕食を作ります。',
  somethingSweetTitle: '甘いもの', somethingSweetSubtitle: 'デザート、ケーキ、焼き菓子 — あらゆる甘い気分に。',
  traditionsTitle: '伝統料理', traditionsSubtitle: 'あらゆる文化の料理の遺産を探索しましょう。',
  findARecipeTitle: 'レシピを探す', findARecipeSubtitle: '料理名か食べたいものを教えてください — レシピを作ります。',
  archiveTitle: 'アーカイブ', archiveSubtitle: '過去の週間メニュー。',
  settingsTitle: '設定',
  save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集', print: '印刷',
  back: '戻る', loading: '読み込み中…', generate: 'レシピを生成',
  tryAnother: '別のレシピを試す', saveToRecipes: 'レシピに保存', saved: '✓ 保存済み',
};

const zhCN: UIStrings = {
  thisWeek: '本周', groceries: '购物清单', pantry: '食品储藏室',
  recipes: '食谱', nonnasKitchen: '奶奶的厨房',
  specialOccasion: '特殊场合', onTheFly: '随手做',
  somethingSweet: '甜点', traditions: '传统美食', findARecipe: '找食谱',
  archive: '档案', settings: '设置', signOut: '退出',
  thisWeekTitle: '本周', thisWeekSubtitle: '您家本周的晚餐计划。',
  groceriesTitle: '购物清单', groceriesSubtitle: '本周的购物清单。',
  pantryTitle: '食品储藏室', pantrySubtitle: '追踪家中的食材。',
  recipesTitle: '我的食谱', recipesSubtitle: '您保存的家庭食谱。',
  nonnasKitchenTitle: '奶奶的厨房', nonnasKitchenSubtitle: '来自家族档案的经典食谱。',
  specialOccasionTitle: '特殊场合', specialOccasionSubtitle: '规划难忘的菜单并获取逐日准备时间表…',
  onTheFlyTitle: '随手做', onTheFlySubtitle: '告诉我们冰箱里有什么——我们来做晚餐。',
  somethingSweetTitle: '甜点', somethingSweetSubtitle: '甜品、蛋糕和烘焙——满足每一种甜蜜心情。',
  traditionsTitle: '传统美食', traditionsSubtitle: '探索任何文化的烹饪遗产。',
  findARecipeTitle: '找食谱', findARecipeSubtitle: '告诉我们菜名或您的口味——我们来写食谱。',
  archiveTitle: '档案', archiveSubtitle: '您过去的每周菜单。',
  settingsTitle: '设置',
  save: '保存', cancel: '取消', delete: '删除', edit: '编辑', print: '打印',
  back: '返回', loading: '加载中…', generate: '生成食谱',
  tryAnother: '尝试不同食谱', saveToRecipes: '保存到我的食谱', saved: '✓ 已保存',
};

const zhTW: UIStrings = {
  thisWeek: '本週', groceries: '購物清單', pantry: '食品儲藏室',
  recipes: '食譜', nonnasKitchen: '奶奶的廚房',
  specialOccasion: '特殊場合', onTheFly: '隨手做',
  somethingSweet: '甜點', traditions: '傳統美食', findARecipe: '找食譜',
  archive: '檔案', settings: '設定', signOut: '登出',
  thisWeekTitle: '本週', thisWeekSubtitle: '您家本週的晚餐計劃。',
  groceriesTitle: '購物清單', groceriesSubtitle: '本週的購物清單。',
  pantryTitle: '食品儲藏室', pantrySubtitle: '追蹤家中的食材。',
  recipesTitle: '我的食譜', recipesSubtitle: '您儲存的家庭食譜。',
  nonnasKitchenTitle: '奶奶的廚房', nonnasKitchenSubtitle: '來自家族檔案的經典食譜。',
  specialOccasionTitle: '特殊場合', specialOccasionSubtitle: '規劃難忘的菜單並獲取逐日準備時間表…',
  onTheFlyTitle: '隨手做', onTheFlySubtitle: '告訴我們冰箱裡有什麼——我們來做晚餐。',
  somethingSweetTitle: '甜點', somethingSweetSubtitle: '甜品、蛋糕和烘焙——滿足每一種甜蜜心情。',
  traditionsTitle: '傳統美食', traditionsSubtitle: '探索任何文化的烹飪遺產。',
  findARecipeTitle: '找食譜', findARecipeSubtitle: '告訴我們菜名或您的口味——我們來寫食譜。',
  archiveTitle: '檔案', archiveSubtitle: '您過去的每週菜單。',
  settingsTitle: '設定',
  save: '儲存', cancel: '取消', delete: '刪除', edit: '編輯', print: '列印',
  back: '返回', loading: '載入中…', generate: '生成食譜',
  tryAnother: '嘗試不同食譜', saveToRecipes: '儲存到我的食譜', saved: '✓ 已儲存',
};

const ko: UIStrings = {
  thisWeek: '이번 주', groceries: '장보기', pantry: '식료품 저장실',
  recipes: '레시피', nonnasKitchen: '논나의 부엌',
  specialOccasion: '특별한 날', onTheFly: '즉흥 요리',
  somethingSweet: '달콤한 것', traditions: '전통 요리', findARecipe: '레시피 찾기',
  archive: '기록', settings: '설정', signOut: '로그아웃',
  thisWeekTitle: '이번 주', thisWeekSubtitle: '이번 주 가족 저녁 식사 계획.',
  groceriesTitle: '장보기', groceriesSubtitle: '이번 주 장볼 목록.',
  pantryTitle: '식료품 저장실', pantrySubtitle: '집에 있는 재료를 관리하세요.',
  recipesTitle: '내 레시피', recipesSubtitle: '저장된 가족 레시피.',
  nonnasKitchenTitle: '논나의 부엌', nonnasKitchenSubtitle: '가족 아카이브의 클래식 레시피.',
  specialOccasionTitle: '특별한 날', specialOccasionSubtitle: '잊을 수 없는 메뉴와 하루하루 준비 타임라인을 계획하세요…',
  onTheFlyTitle: '즉흥 요리', onTheFlySubtitle: '냉장고에 뭐가 있는지 알려주세요 — 저녁을 만들어 드릴게요.',
  somethingSweetTitle: '달콤한 것', somethingSweetSubtitle: '디저트, 케이크, 베이킹 — 모든 달콤한 기분을 위해.',
  traditionsTitle: '전통 요리', traditionsSubtitle: '모든 문화의 요리 유산을 탐험하세요.',
  findARecipeTitle: '레시피 찾기', findARecipeSubtitle: '요리 이름이나 먹고 싶은 것을 알려주세요 — 레시피를 써드릴게요.',
  archiveTitle: '기록', archiveSubtitle: '지난 주간 메뉴.',
  settingsTitle: '설정',
  save: '저장', cancel: '취소', delete: '삭제', edit: '편집', print: '인쇄',
  back: '뒤로', loading: '불러오는 중…', generate: '레시피 생성',
  tryAnother: '다른 레시피 시도', saveToRecipes: '내 레시피에 저장', saved: '✓ 저장됨',
};

const ar: UIStrings = {
  thisWeek: 'هذا الأسبوع', groceries: 'البقالة', pantry: 'المخزن',
  recipes: 'الوصفات', nonnasKitchen: 'مطبخ نونا',
  specialOccasion: 'مناسبة خاصة', onTheFly: 'على الطاير',
  somethingSweet: 'شيء حلو', traditions: 'تقاليد', findARecipe: 'ابحث عن وصفة',
  archive: 'الأرشيف', settings: 'الإعدادات', signOut: 'تسجيل الخروج',
  thisWeekTitle: 'هذا الأسبوع', thisWeekSubtitle: 'خطة عشاء عائلتك لهذا الأسبوع.',
  groceriesTitle: 'البقالة', groceriesSubtitle: 'قائمة التسوق الخاصة بك لهذا الأسبوع.',
  pantryTitle: 'المخزن', pantrySubtitle: 'تتبع ما لديك في المنزل.',
  recipesTitle: 'وصفاتي', recipesSubtitle: 'وصفات عائلتك المحفوظة.',
  nonnasKitchenTitle: 'مطبخ نونا', nonnasKitchenSubtitle: 'وصفات كلاسيكية من أرشيف العائلة.',
  specialOccasionTitle: 'مناسبة خاصة', specialOccasionSubtitle: 'خطط لقائمة لا تُنسى مع جدول زمني يوم بيوم…',
  onTheFlyTitle: 'على الطاير', onTheFlySubtitle: 'أخبرنا بما في ثلاجتك — سنعد العشاء.',
  somethingSweetTitle: 'شيء حلو', somethingSweetSubtitle: 'الحلويات والكيك والمعجنات — لكل رغبة في الحلاوة.',
  traditionsTitle: 'تقاليد', traditionsSubtitle: 'استكشف الموروث الطهوي لأي ثقافة.',
  findARecipeTitle: 'ابحث عن وصفة', findARecipeSubtitle: 'اذكر اسم طبق أو صف ما تشتهيه — سنكتب الوصفة.',
  archiveTitle: 'الأرشيف', archiveSubtitle: 'قوائمك الأسبوعية السابقة.',
  settingsTitle: 'الإعدادات',
  save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', print: 'طباعة',
  back: 'رجوع', loading: 'جارٍ التحميل…', generate: 'توليد وصفة',
  tryAnother: 'جرب وصفة مختلفة', saveToRecipes: 'حفظ في وصفاتي', saved: '✓ تم الحفظ',
};

// Map from the stored language value to its translations
const TRANSLATION_MAP: Record<string, UIStrings> = {
  'English': en,
  'Italian': it,
  'Spanish': es,
  'French': fr,
  'Portuguese': pt,
  'German': de,
  'Dutch': nl,
  'Russian': ru,
  'Polish': pl,
  'Japanese': ja,
  'Chinese (Simplified)': zhCN,
  'Chinese (Traditional)': zhTW,
  'Korean': ko,
  'Arabic': ar,
};

// Maps legacy stored values (old button labels) to current clean English keys
const LEGACY_MAP: Record<string, string> = {
  'Español': 'Spanish', 'Italiano': 'Italian', 'Français': 'French',
  'Português': 'Portuguese', 'Deutsch': 'German', 'Nederlands': 'Dutch',
  '日本語': 'Japanese', '中文': 'Chinese (Simplified)',
  'العربية': 'Arabic', 'Русский': 'Russian',
  // handle any "Native (English)" format from old dropdown
  'Italiano (Italian)': 'Italian', 'Español (Spanish)': 'Spanish',
  'Français (French)': 'French', 'Português (Portuguese)': 'Portuguese',
  'Deutsch (German)': 'German', 'Nederlands (Dutch)': 'Dutch',
  '日本語 (Japanese)': 'Japanese', '中文 (Chinese Simplified)': 'Chinese (Simplified)',
  'العربية (Arabic)': 'Arabic',
};

export function normalizeLanguage(language?: string): string {
  if (!language) return 'English';
  return LEGACY_MAP[language] ?? language;
}

export function getTranslations(language?: string): UIStrings {
  if (!language) return en;
  return TRANSLATION_MAP[normalizeLanguage(language)] ?? en;
}

// RTL languages
const RTL_LANGUAGES = new Set(['Arabic', 'Persian', 'Urdu', 'Hebrew', 'Pashto', 'Sindhi', 'Yiddish']);
export function isRTL(language?: string): boolean {
  return !!language && RTL_LANGUAGES.has(language);
}
