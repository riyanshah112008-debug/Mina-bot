// ==========================================
// 🌐 STARRY CORE MULTILINGUAL LOCALIZATION ENGINE (i18n)
// File Path: src/utils/i18n.js
// 14 Global Languages • Instant In-Memory Cache • Zero-Latency Lookups
// ==========================================

const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// 1. Supported Languages Catalog
const SUPPORTED_LANGUAGES = {
    'en': {
        code: 'en',
        name: 'English',
        native: 'English',
        flag: '🇬🇧',
        locale: 'en-US',
        description: 'English (United Kingdom / United States)'
    },
    'es': {
        code: 'es',
        name: 'Spanish',
        native: 'Español',
        flag: '🇪🇸',
        locale: 'es-ES',
        description: 'Español (España y Latinoamérica)'
    },
    'pt': {
        code: 'pt',
        name: 'Portuguese',
        native: 'Português',
        flag: '🇧🇷',
        locale: 'pt-BR',
        description: 'Português (Brasil e Portugal)'
    },
    'ja': {
        code: 'ja',
        name: 'Japanese',
        native: '日本語',
        flag: '🇯🇵',
        locale: 'ja-JP',
        description: '日本語 (日本)'
    },
    'hi': {
        code: 'hi',
        name: 'Hindi',
        native: 'हिन्दी',
        flag: '🇮🇳',
        locale: 'hi-IN',
        description: 'हिन्दी (भारत)'
    },
    'fr': {
        code: 'fr',
        name: 'French',
        native: 'Français',
        flag: '🇫🇷',
        locale: 'fr-FR',
        description: 'Français (France et Canada)'
    },
    'de': {
        code: 'de',
        name: 'German',
        native: 'Deutsch',
        flag: '🇩🇪',
        locale: 'de-DE',
        description: 'Deutsch (Deutschland und Österreich)'
    },
    'ru': {
        code: 'ru',
        name: 'Russian',
        native: 'Русский',
        flag: '🇷🇺',
        locale: 'ru-RU',
        description: 'Русский (Россия)'
    },
    'id': {
        code: 'id',
        name: 'Indonesian',
        native: 'Bahasa Indonesia',
        flag: '🇮🇩',
        locale: 'id-ID',
        description: 'Bahasa Indonesia (Indonesia)'
    },
    'it': {
        code: 'it',
        name: 'Italian',
        native: 'Italiano',
        flag: '🇮🇹',
        locale: 'it-IT',
        description: 'Italiano (Italia)'
    },
    'vi': {
        code: 'vi',
        name: 'Vietnamese',
        native: 'Tiếng Việt',
        flag: '🇻🇳',
        locale: 'vi-VN',
        description: 'Tiếng Việt (Việt Nam)'
    },
    'tr': {
        code: 'tr',
        name: 'Turkish',
        native: 'Türkçe',
        flag: '🇹🇷',
        locale: 'tr-TR',
        description: 'Türkçe (Türkiye)'
    },
    'ar': {
        code: 'ar',
        name: 'Arabic',
        native: 'العربية',
        flag: '🇸🇦',
        locale: 'ar-SA',
        description: 'العربية (الشرق الأوسط)'
    },
    'ko': {
        code: 'ko',
        name: 'Korean',
        native: '한국어',
        flag: '🇰🇷',
        locale: 'ko-KR',
        description: '한국어 (대한민국)'
    }
};

// Aliases mapping (accepts names, codes, flag emojis)
const LANGUAGE_ALIASES = {
    'en': 'en', 'eng': 'en', 'english': 'en', '🇬🇧': 'en', '🇺🇸': 'en',
    'es': 'es', 'esp': 'es', 'espanol': 'es', 'español': 'es', 'spanish': 'es', '🇪🇸': 'es',
    'pt': 'pt', 'por': 'pt', 'portugues': 'pt', 'português': 'pt', 'portuguese': 'pt', '🇧🇷': 'pt', '🇵🇹': 'pt',
    'ja': 'ja', 'jp': 'ja', 'japanese': 'ja', 'nihongo': 'ja', '日本語': 'ja', '🇯🇵': 'ja',
    'hi': 'hi', 'hin': 'hi', 'hindi': 'hi', 'हिन्दी': 'hi', 'हिंदी': 'hi', '🇮🇳': 'hi',
    'fr': 'fr', 'fra': 'fr', 'french': 'fr', 'francais': 'fr', 'français': 'fr', '🇫🇷': 'fr',
    'de': 'de', 'ger': 'de', 'deu': 'de', 'german': 'de', 'deutsch': 'de', '🇩🇪': 'de',
    'ru': 'ru', 'rus': 'ru', 'russian': 'ru', 'русский': 'ru', '🇷🇺': 'ru',
    'id': 'id', 'ind': 'id', 'indonesian': 'id', 'bahasa': 'id', 'bahasa indonesia': 'id', '🇮🇩': 'id',
    'it': 'it', 'ita': 'it', 'italian': 'it', 'italiano': 'it', '🇮🇹': 'it',
    'vi': 'vi', 'vie': 'vi', 'vietnamese': 'vi', 'tieng viet': 'vi', 'tiếng việt': 'vi', '🇻🇳': 'vi',
    'tr': 'tr', 'tur': 'tr', 'turkish': 'tr', 'turkce': 'tr', 'türkçe': 'tr', '🇹🇷': 'tr',
    'ar': 'ar', 'ara': 'ar', 'arabic': 'ar', 'العربية': 'ar', '🇸🇦': 'ar',
    'ko': 'ko', 'kor': 'ko', 'korean': 'ko', 'hangul': 'ko', '한국어': 'ko', '🇰🇷': 'ko'
};

function resolveLanguageCode(input) {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim().toLowerCase();
    return LANGUAGE_ALIASES[clean] || (SUPPORTED_LANGUAGES[clean] ? clean : null);
}

// 2. High-Performance In-Memory Cache for 0ms synchronous lookups
const guildLanguageCache = new Map();

// 3. Translation Dictionaries for All 14 Languages
const TRANSLATIONS = {
    // 🇬🇧 ENGLISH (Default)
    en: {
        'setup.welcome_title': '🌟 Welcome to Starry!',
        'setup.welcome_desc': 'Thank you for adding **Starry** to **{guild}**!\n\nTo ensure the best experience for your community, please select your server language and run the setup wizard below.\n\n🌐 **Step 1:** Select your server\'s language from the dropdown.\n🧠 **Step 2:** Click **Sync & Setup** to automatically link channels, security, and economy.',
        'setup.select_lang_title': '🌐 Select Server Language',
        'setup.select_lang_desc': 'Choose the primary language for Starry commands, setup wizards, and automatic responses.',
        'setup.select_lang_placeholder': 'Choose your server language...',
        'setup.sync_title': '🧠 Starry Master Configuration Engine',
        'setup.sync_desc': '**Initiate Global Server Sync?**\n\nMy brain will scan your channels and automatically configure:\n🛡️ **Security:** Verification & Logs\n👋 **Community:** Welcomes, Starboard & Suggestions\n🎫 **Support:** Tickets, Appeals & Applications\n🎁 **Economy:** Loot Chests & Boosts\n\n*This will wire internal systems directly into your server layout.*',
        'setup.btn_sync': 'SYNC SERVER',
        'setup.btn_cancel': 'CANCEL',
        'setup.btn_lang': 'CHANGE LANGUAGE',
        'setup.btn_setup': 'START SETUP',
        'setup.scanning': '🧠 **SCANNING NEURAL NETWORK (CHANNELS)...**',
        'setup.complete_title': '✅ Neural Sync Complete',
        'setup.complete_desc': 'I have successfully scanned the server, identified channel purposes, and linked all systems!',
        'setup.aborted': '🚫 Master sync aborted.',
        'setup.timeout': '⚠️ Command timed out or encountered an error. Setup aborted.',
        'setup.lang_updated_title': '✅ Server Language Configured',
        'setup.lang_updated_desc': 'The server language has been successfully set to **{lang}** {flag}!\nYou can now proceed with the server setup.',
        'lang.current': 'ℹ️ Current server language is: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*To change it, use `{prefix}setlanguage <code/name>` or select an option from the menu below.*',
        'lang.updated_title': '✅ Language Updated',
        'lang.updated_desc': 'Server language successfully switched to **{lang}** {flag}!\nAll automated responses and setup wizards will now be presented in {native}.',
        'lang.invalid': '❌ Invalid language selection. Please choose a valid language from the list below.',
        'lang.no_permission': '❌ **Access Denied:** You need the **Manage Server** or **Administrator** permission to change server language.',
        'common.access_denied': '❌ **Access Denied:** Only Administrators can execute this action.',
        'common.server_only': '❌ This command can only be used inside a Discord server.',
        'common.success': 'Success',
        'common.error': 'Error'
    },

    // 🇪🇸 SPANISH (Español)
    es: {
        'setup.welcome_title': '🌟 ¡Bienvenido a Starry!',
        'setup.welcome_desc': '¡Gracias por añadir a **Starry** a **{guild}**!\n\nPara garantizar la mejor experiencia para tu comunidad, selecciona el idioma del servidor e inicia la configuración a continuación.\n\n🌐 **Paso 1:** Selecciona el idioma de tu servidor en el menú desplegable.\n🧠 **Paso 2:** Haz clic en **Sincronizar y Configurar** para vincular canales, seguridad y economía.',
        'setup.select_lang_title': '🌐 Seleccionar Idioma del Servidor',
        'setup.select_lang_desc': 'Elige el idioma principal para los comandos, configuraciones y respuestas automáticas de Starry.',
        'setup.select_lang_placeholder': 'Elige el idioma de tu servidor...',
        'setup.sync_title': '🧠 Motor de Configuración Maestro de Starry',
        'setup.sync_desc': '**¿Iniciar Sincronización Global del Servidor?**\n\nMi sistema escaneará tus canales y configurará automáticamente:\n🛡️ **Seguridad:** Verificación y Registros\n👋 **Comunidad:** Bienvenidas, Starboard y Sugerencias\n🎫 **Soporte:** Tickets, Apelaciones y Postulaciones\n🎁 **Economía:** Cofres de Botín y Boosts\n\n*Esto conectará los sistemas internos directamente con el diseño de tu servidor.*',
        'setup.btn_sync': 'SINCRONIZAR SERVIDOR',
        'setup.btn_cancel': 'CANCELAR',
        'setup.btn_lang': 'CAMBIAR IDIOMA',
        'setup.btn_setup': 'INICIAR CONFIGURACIÓN',
        'setup.scanning': '🧠 **ESCANEANDO RED NEURONAL (CANALES)...**',
        'setup.complete_title': '✅ Sincronización Neuronal Completada',
        'setup.complete_desc': '¡He escaneado con éxito el servidor, identificado el propósito de cada canal y vinculado todos los sistemas!',
        'setup.aborted': '🚫 Sincronización maestra cancelada.',
        'setup.timeout': '⚠️ El comando expiró o encontró un error. Configuración abortada.',
        'setup.lang_updated_title': '✅ Idioma del Servidor Configurado',
        'setup.lang_updated_desc': '¡El idioma del servidor se ha configurado con éxito en **{lang}** {flag}!\nAhora puedes proceder con la sincronización del servidor.',
        'lang.current': 'ℹ️ El idioma actual del servidor es: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Para cambiarlo, usa `{prefix}setlanguage <código/nombre>` o selecciona una opción del menú de abajo.*',
        'lang.updated_title': '✅ Idioma Actualizado',
        'lang.updated_desc': '¡El idioma del servidor se ha cambiado a **{lang}** {flag}!\nTodas las respuestas automáticas y asistentes ahora se mostrarán en {native}.',
        'lang.invalid': '❌ Selección de idioma inválida. Por favor elige un idioma válido del menú.',
        'lang.no_permission': '❌ **Acceso Denegado:** Necesitas el permiso de **Administrar Servidor** o **Administrador** para cambiar el idioma.',
        'common.access_denied': '❌ **Acceso Denegado:** Solo los Administradores pueden ejecutar esta acción.',
        'common.server_only': '❌ Este comando solo se puede usar dentro de un servidor de Discord.',
        'common.success': 'Éxito',
        'common.error': 'Error'
    },

    // 🇧🇷 PORTUGUESE (Português)
    pt: {
        'setup.welcome_title': '🌟 Bem-vindo ao Starry!',
        'setup.welcome_desc': 'Obrigado por adicionar o **Starry** ao **{guild}**!\n\nPara garantir a melhor experiência na sua comunidade, selecione o idioma do servidor e inicie o assistente de configuração abaixo.\n\n🌐 **Passo 1:** Escolha o idioma no menu suspenso.\n🧠 **Passo 2:** Clique em **Sincronizar Servidor** para mapear canais, segurança e economia.',
        'setup.select_lang_title': '🌐 Selecionar Idioma do Servidor',
        'setup.select_lang_desc': 'Escolha o idioma principal para os comandos, assistentes e respostas automáticas do Starry.',
        'setup.select_lang_placeholder': 'Escolha o idioma do servidor...',
        'setup.sync_title': '🧠 Motor de Configuração Mestre do Starry',
        'setup.sync_desc': '**Iniciar Sincronização Global do Servidor?**\n\nMeu sistema irá escanear seus canais e configurar automaticamente:\n🛡️ **Segurança:** Verificação e Logs\n👋 **Comunidade:** Boas-vindas, Starboard e Sugestões\n🎫 **Suporte:** Tickets, Apelações e Formulários\n🎁 **Economia:** Baús de Recompensa e Boosts\n\n*Isso conectará os sistemas internos diretamente à estrutura do seu servidor.*',
        'setup.btn_sync': 'SINCRONIZAR SERVIDOR',
        'setup.btn_cancel': 'CANCELAR',
        'setup.btn_lang': 'ALTERAR IDIOMA',
        'setup.btn_setup': 'INICIAR CONFIGURAÇÃO',
        'setup.scanning': '🧠 **ESCANEANDO REDE NEURAL (CANAIS)...**',
        'setup.complete_title': '✅ Sincronização Concluída',
        'setup.complete_desc': 'Escaneei o servidor com sucesso, identifiquei a função de cada canal e conectei todos os módulos!',
        'setup.aborted': '🚫 Sincronização cancelada.',
        'setup.timeout': '⚠️ Tempo limite esgotado. Configuração cancelada.',
        'setup.lang_updated_title': '✅ Idioma do Servidor Configurado',
        'setup.lang_updated_desc': 'O idioma do servidor foi definido para **{lang}** {flag}!\nVocê pode agora prosseguir com a configuração.',
        'lang.current': 'ℹ️ O idioma atual do servidor é: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Para alterar, use `{prefix}setlanguage <código/nome>` ou selecione no menu abaixo.*',
        'lang.updated_title': '✅ Idioma Atualizado',
        'lang.updated_desc': 'O idioma do servidor foi alterado para **{lang}** {flag}!\nTodas as respostas automáticas agora serão em {native}.',
        'lang.invalid': '❌ Idioma inválido. Escolha um idioma válido da lista abaixo.',
        'lang.no_permission': '❌ **Acesso Negado:** Você precisa de permissão de **Gerenciar Servidor** ou **Administrador** para alterar o idioma.',
        'common.access_denied': '❌ **Acesso Negado:** Apenas Administradores podem executar esta ação.',
        'common.server_only': '❌ Este comando só pode ser usado dentro de um servidor Discord.',
        'common.success': 'Sucesso',
        'common.error': 'Erro'
    },

    // 🇯🇵 JAPANESE (日本語)
    ja: {
        'setup.welcome_title': '🌟 Starryへようこそ！',
        'setup.welcome_desc': '**{guild}** に **Starry** を導入していただき、ありがとうございます！\n\nコミュニティで最高の体験を提供するために、サーバーの言語を選択してセットアップを開始してください。\n\n🌐 **ステップ 1:** ドロップダウンメニューから言語を選択します。\n🧠 **ステップ 2:** **サーバーを同期** をクリックして、チャンネルやセキュリティを自動設定します。',
        'setup.select_lang_title': '🌐 サーバー言語の選択',
        'setup.select_lang_desc': 'Starryのコマンド、セットアップウィザード、自動応答の主要言語を選択してください。',
        'setup.select_lang_placeholder': 'サーバーの言語を選択してください...',
        'setup.sync_title': '🧠 Starry マスター構成エンジン',
        'setup.sync_desc': '**グローバルサーバー同期を開始しますか？**\n\nチャンネルを自動スキャンし、以下を設定します：\n🛡️ **セキュリティ:** 認証＆ログ監視\n👋 **コミュニティ:** ようこそ、スターボード、提案\n🎫 **サポート:** チケット、異議申し立て、申請\n🎁 **経済:** 宝箱ドロップ＆ブースト追跡\n\n*サーバーの構造に合わせてシステムを自動連携します。*',
        'setup.btn_sync': 'サーバーを同期',
        'setup.btn_cancel': 'キャンセル',
        'setup.btn_lang': '言語を変更',
        'setup.btn_setup': '設定を開始',
        'setup.scanning': '🧠 **チャンネルネットワークをスキャン中...**',
        'setup.complete_title': '✅ 同期が完了しました',
        'setup.complete_desc': 'サーバーのスキャンが完了し、各チャンネルの役割を識別してシステムをリンクしました！',
        'setup.aborted': '🚫 マスター同期が中止されました。',
        'setup.timeout': '⚠️ タイムアウトまたはエラーが発生しました。設定を中止しました。',
        'setup.lang_updated_title': '✅ サーバー言語を設定しました',
        'setup.lang_updated_desc': 'サーバーの言語を **{lang}** {flag} に設定しました！\nこのままサーバー設定を続行できます。',
        'lang.current': 'ℹ️ 現在のサーバー言語: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*変更するには `{prefix}setlanguage <コード/名前>` を入力するか、下のメニューから選択してください。*',
        'lang.updated_title': '✅ 言語を更新しました',
        'lang.updated_desc': 'サーバー言語が **{lang}** {flag} に変更されました！\n自動応答やウィザードは {native} で表示されます。',
        'lang.invalid': '❌ 無効な言語が選択されました。リストから有効な言語を選択してください。',
        'lang.no_permission': '❌ **アクセス拒否:** 言語を変更するには **サーバーの管理** または **管理者** 権限が必要です。',
        'common.access_denied': '❌ **アクセス拒否:** 管理者のみがこのアクションを実行できます。',
        'common.server_only': '❌ このコマンドはDiscordサーバー内でのみ使用できます。',
        'common.success': '成功',
        'common.error': 'エラー'
    },

    // 🇮🇳 HINDI (हिन्दी)
    hi: {
        'setup.welcome_title': '🌟 Starry में आपका स्वागत है!',
        'setup.welcome_desc': '**{guild}** में **Starry** जोड़ने के लिए धन्यवाद!\n\nअपने सर्वर के लिए बेहतरीन अनुभव सुनिश्चित करने के लिए, नीचे सर्वर की भाषा चुनें और सेटअप शुरू करें।\n\n🌐 **स्टेप 1:** ड्रॉपडाउन मेनू से अपने सर्वर की भाषा चुनें।\n🧠 **स्टेप 2:** चैनल्स, सुरक्षा और अर्थव्यवस्था को ऑटो-लिंक करने के लिए **सर्वर सिंक करें** पर क्लिक करें।',
        'setup.select_lang_title': '🌐 सर्वर की भाषा चुनें',
        'setup.select_lang_desc': 'Starry कमांड्स, सेटअप और स्वचालित संदेशों के लिए प्राथमिक भाषा चुनें।',
        'setup.select_lang_placeholder': 'सर्वर की भाषा चुनें...',
        'setup.sync_title': '🧠 Starry मास्टर कॉन्फ़िगरेशन इंजन',
        'setup.sync_desc': '**क्या आप ग्लोबल सर्वर सिंक शुरू करना चाहते हैं?**\n\nबॉट आपके चैनल्स को स्कैन करेगा और स्वचालित रूप से कॉन्फ़िगर करेगा:\n🛡️ **सुरक्षा:** वेरिफिकेशन और लॉग्स\n👋 **कम्युनिटी:** वेलकम, स्टारबोर्ड और सुझाव\n🎫 **सपोर्ट:** टिकट्स, अपील और आवेदन\n🎁 **इकॉनमी:** लूट चेस्ट्स और बूस्ट्स\n\n*यह बॉट के सभी सिस्टम्स को आपके सर्वर लेआउट से जोड़ देगा।*',
        'setup.btn_sync': 'सर्वर सिंक करें',
        'setup.btn_cancel': 'रद्द करें',
        'setup.btn_lang': 'भाषा बदलें',
        'setup.btn_setup': 'सेटअप शुरू करें',
        'setup.scanning': '🧠 **चैनल्स को स्कैन किया जा रहा है...**',
        'setup.complete_title': '✅ न्यूरल सिंक पूरा हुआ',
        'setup.complete_desc': 'मैंने सफलतापूर्वक सर्वर को स्कैन कर लिया है और सभी सिस्टम्स को लिंक कर दिया है!',
        'setup.aborted': '🚫 मास्टर सिंक रद्द कर दिया गया।',
        'setup.timeout': '⚠️ कमांड का समय समाप्त हो गया। सेटअप रद्द किया गया।',
        'setup.lang_updated_title': '✅ सर्वर भाषा सेट हो गई',
        'setup.lang_updated_desc': 'सर्वर भाषा सफलतापूर्वक **{lang}** {flag} पर सेट कर दी गई है!\nअब आप सर्वर सेटअप जारी रख सकते हैं।',
        'lang.current': 'ℹ️ वर्तमान सर्वर भाषा है: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*बदलने के लिए `{prefix}setlanguage <कोड/नाम>` का उपयोग करें या नीचे दिए गए मेनू से चुनें।*',
        'lang.updated_title': '✅ भाषा अपडेट हो गई',
        'lang.updated_desc': 'सर्वर भाषा बदलकर **{lang}** {flag} कर दी गई है!\nअब बॉट के संदेश {native} में दिखाई देंगे।',
        'lang.invalid': '❌ अमान्य भाषा चयन। कृपया नीचे दी गई सूची में से एक मान्य भाषा चुनें।',
        'lang.no_permission': '❌ **अनुमति अस्वीकृत:** भाषा बदलने के लिए आपके पास **Manage Server** या **Administrator** की अनुमति होनी चाहिए।',
        'common.access_denied': '❌ **अनुमति अस्वीकृत:** केवल एडमिनिस्ट्रेटर ही यह कार्रवाई कर सकते हैं।',
        'common.server_only': '❌ यह कमांड केवल डिस्कॉर्ड सर्वर के अंदर उपयोग किया जा सकता है।',
        'common.success': 'सफल',
        'common.error': 'त्रुटि'
    },

    // 🇫🇷 FRENCH (Français)
    fr: {
        'setup.welcome_title': '🌟 Bienvenue sur Starry !',
        'setup.welcome_desc': 'Merci d\'avoir ajouté **Starry** à **{guild}** !\n\nPour offrir la meilleure expérience à votre communauté, veuillez sélectionner la langue du serveur et lancer l\'assistant de configuration ci-dessous.\n\n🌐 **Étape 1 :** Sélectionnez la langue dans le menu déroulant.\n🧠 **Étape 2 :** Cliquez sur **Synchroniser le Serveur** pour configurer vos canaux automatiquement.',
        'setup.select_lang_title': '🌐 Choisir la Langue du Serveur',
        'setup.select_lang_desc': 'Choisissez la langue principale pour les commandes, configurations et réponses automatiques de Starry.',
        'setup.select_lang_placeholder': 'Choisissez la langue du serveur...',
        'setup.sync_title': '🧠 Moteur de Configuration Maître de Starry',
        'setup.sync_desc': '**Lancer la synchronisation globale du serveur ?**\n\nLe système scannera vos canaux et configurera automatiquement :\n🛡️ **Sécurité :** Vérification & Journaux\n👋 **Communauté :** Bienvenues, Starboard & Suggestions\n🎫 **Support :** Tickets & Candidatures\n🎁 **Économie :** Coffres de Butin & Boosts',
        'setup.btn_sync': 'SYNCHRONISER LE SERVEUR',
        'setup.btn_cancel': 'ANNULER',
        'setup.btn_lang': 'CHANGER DE LANGUE',
        'setup.btn_setup': 'DÉMARRER LA CONFIGURATION',
        'setup.scanning': '🧠 **SCAN DES CANAUX EN COURS...**',
        'setup.complete_title': '✅ Synchronisation Réussie',
        'setup.complete_desc': 'J\'ai scanné le serveur avec succès et lié tous les systèmes aux canaux correspondants !',
        'setup.aborted': '🚫 Synchronisation annulée.',
        'setup.timeout': '⚠️ Délai expiré. Configuration annulée.',
        'setup.lang_updated_title': '✅ Langue du Serveur Configurée',
        'setup.lang_updated_desc': 'La langue du serveur a été configurée sur **{lang}** {flag} !\nVous pouvez maintenant procéder à la configuration.',
        'lang.current': 'ℹ️ La langue actuelle du serveur est : **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Pour la changer, utilisez `{prefix}setlanguage <code/nom>` ou le menu ci-dessous.*',
        'lang.updated_title': '✅ Langue Mise à Jour',
        'lang.updated_desc': 'La langue du serveur est désormais **{lang}** {flag} !\nToutes les réponses automatiques seront en {native}.',
        'lang.invalid': '❌ Choix de langue invalide.',
        'lang.no_permission': '❌ **Accès Refusé :** Vous avez besoin de la permission **Gérer le serveur** ou **Administrateur**.',
        'common.access_denied': '❌ **Accès Refusé :** Seuls les Administrateurs peuvent effectuer cette action.',
        'common.server_only': '❌ Cette commande ne peut être utilisée que dans un serveur Discord.',
        'common.success': 'Succès',
        'common.error': 'Erreur'
    },

    // 🇩🇪 GERMAN (Deutsch)
    de: {
        'setup.welcome_title': '🌟 Willkommen bei Starry!',
        'setup.welcome_desc': 'Vielen Dank, dass du **Starry** zu **{guild}** hinzugefügt hast!\n\nWähle bitte die Sprache des Servers und starte den Einrichtungsassistenten unten.\n\n🌐 **Schritt 1:** Wähle deine Serversprache aus dem Menü.\n🧠 **Schritt 2:** Klicke auf **Server Synchronisieren**, um Kanäle und Sicherheit automatisch zu verknüpfen.',
        'setup.select_lang_title': '🌐 Serversprache Auswählen',
        'setup.select_lang_desc': 'Wähle die Hauptsprache für Starry-Befehle und automatische Antworten.',
        'setup.select_lang_placeholder': 'Serversprache auswählen...',
        'setup.sync_title': '🧠 Starry Master Konfigurations-Engine',
        'setup.sync_desc': '**Globale Server-Synchronisierung starten?**\n\nDas System scannt deine Kanäle und konfiguriert automatisch:\n🛡️ **Sicherheit:** Verifizierung & Logs\n👋 **Community:** Willkommen, Starboard & Vorschläge\n🎫 **Support:** Tickets & Bewerbungen\n🎁 **Wirtschaft:** Beutetruhen & Boosts',
        'setup.btn_sync': 'SERVER SYNCHRONISIEREN',
        'setup.btn_cancel': 'ABBRECHEN',
        'setup.btn_lang': 'SPRACHE ÄNDERN',
        'setup.btn_setup': 'EINRICHTUNG STARTEN',
        'setup.scanning': '🧠 **KANÄLE WERDEN GESCANNT...**',
        'setup.complete_title': '✅ Synchronisierung Abgeschlossen',
        'setup.complete_desc': 'Der Server wurde erfolgreich gescannt und alle Systeme wurden verknüpft!',
        'setup.aborted': '🚫 Synchronisierung abgebrochen.',
        'setup.timeout': '⚠️ Zeitüberschreitung. Einrichtung abgebrochen.',
        'setup.lang_updated_title': '✅ Serversprache Gespeichert',
        'setup.lang_updated_desc': 'Serversprache wurde erfolgreich auf **{lang}** {flag} eingestellt!',
        'lang.current': 'ℹ️ Aktuelle Serversprache ist: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Zum Ändern nutze `{prefix}setlanguage <Code/Name>` oder das Menü unten.*',
        'lang.updated_title': '✅ Sprache Aktualisiert',
        'lang.updated_desc': 'Die Serversprache wurde auf **{lang}** {flag} umgestellt!\nAntworten erfolgen nun auf {native}.',
        'lang.invalid': '❌ Ungültige Sprachauswahl.',
        'lang.no_permission': '❌ **Zugriff Verweigert:** Du benötigst die Berechtigung **Server verwalten** oder **Administrator**.',
        'common.access_denied': '❌ **Zugriff Verweigert:** Nur Administratoren können diese Aktion ausführen.',
        'common.server_only': '❌ Dieser Befehl kann nur auf einem Discord-Server verwendet werden.',
        'common.success': 'Erfolg',
        'common.error': 'Fehler'
    },

    // 🇷🇺 RUSSIAN (Русский)
    ru: {
        'setup.welcome_title': '🌟 Добро пожаловать в Starry!',
        'setup.welcome_desc': 'Спасибо за добавление **Starry** на сервер **{guild}**!\n\nПожалуйста, выберите язык сервера и запустите мастер первоначальной настройки ниже.\n\n🌐 **Шаг 1:** Выберите язык сервера из выпадающего списка.\n🧠 **Шаг 2:** Нажмите **Синхронизировать**, чтобы автоматически связать каналы и модули.',
        'setup.select_lang_title': '🌐 Выбор Языка Сервера',
        'setup.select_lang_desc': 'Выберите основной язык для команд, настроек и системных сообщений Starry.',
        'setup.select_lang_placeholder': 'Выберите язык сервера...',
        'setup.sync_title': '🧠 Главный Движок Настройки Starry',
        'setup.sync_desc': '**Запустить глобальную синхронизацию сервера?**\n\nБот просканирует каналы и автоматически настроит:\n🛡️ **Безопасность:** Верификация и Журналы\n👋 **Сообщество:** Приветствия, Starboard и Идеи\n🎫 **Поддержка:** Тикеты и Заявки\n🎁 **Экономика:** Сундуки и Отслеживание Бустов',
        'setup.btn_sync': 'СИНХРОНИЗИРОВАТЬ',
        'setup.btn_cancel': 'ОТМЕНА',
        'setup.btn_lang': 'ИЗМЕНИТЬ ЯЗЫК',
        'setup.btn_setup': 'НАЧАТЬ НАСТРОЙКУ',
        'setup.scanning': '🧠 **СКАНИРОВАНИЕ КАНАЛОВ...**',
        'setup.complete_title': '✅ Синхронизация Завершена',
        'setup.complete_desc': 'Сервер успешно просканирован, назначения каналов определены и системы подключены!',
        'setup.aborted': '🚫 Синхронизация отменена.',
        'setup.timeout': '⚠️ Время ожидания истекло. Настройка отменена.',
        'setup.lang_updated_title': '✅ Язык Сервера Установлен',
        'setup.lang_updated_desc': 'Язык сервера успешно установлен на **{lang}** {flag}!\nТеперь вы можете продолжить настройку.',
        'lang.current': 'ℹ️ Текущий язык сервера: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Чтобы изменить, введите `{prefix}setlanguage <код/название>` или выберите в меню ниже.*',
        'lang.updated_title': '✅ Язык Обновлен',
        'lang.updated_desc': 'Язык сервера успешно переключен на **{lang}** {flag}!\nВсе системные сообщения будут на {native}.',
        'lang.invalid': '❌ Недопустимый выбор языка.',
        'lang.no_permission': '❌ **Доступ Запрещен:** Требуются права **Управление сервером** или **Администратор**.',
        'common.access_denied': '❌ **Доступ Запрещен:** Только Администраторы могут выполнять это действие.',
        'common.server_only': '❌ Эту команду можно использовать только внутри сервера Discord.',
        'common.success': 'Успешно',
        'common.error': 'Ошибка'
    },

    // 🇮🇩 INDONESIAN (Bahasa Indonesia)
    id: {
        'setup.welcome_title': '🌟 Selamat Datang di Starry!',
        'setup.welcome_desc': 'Terima kasih telah menambahkan **Starry** ke **{guild}**!\n\nPilih bahasa server Anda dan jalankan panduan pengaturan di bawah ini.\n\n🌐 **Langkah 1:** Pilih bahasa server dari menu dropdown.\n🧠 **Langkah 2:** Klik **Sinkronkan Server** untuk menghubungkan channel, keamanan, dan ekonomi secara otomatis.',
        'setup.select_lang_title': '🌐 Pilih Bahasa Server',
        'setup.select_lang_desc': 'Pilih bahasa utama untuk perintah, wizard pengaturan, dan respons otomatis Starry.',
        'setup.select_lang_placeholder': 'Pilih bahasa server Anda...',
        'setup.sync_title': '🧠 Mesin Konfigurasi Utama Starry',
        'setup.sync_desc': '**Mulai Sinkronisasi Server Global?**\n\nSistem akan memindai channel dan mengonfigurasi otomatis:\n🛡️ **Keamanan:** Verifikasi & Log\n👋 **Komunitas:** Sambutan, Starboard & Saran\n🎫 **Dukungan:** Tiket, Banding & Lamaran\n🎁 **Ekonomi:** Peti Hadiah & Pelacak Boost',
        'setup.btn_sync': 'SINKRONKAN SERVER',
        'setup.btn_cancel': 'BATAL',
        'setup.btn_lang': 'GANTI BAHASA',
        'setup.btn_setup': 'MULAI PENGATURAN',
        'setup.scanning': '🧠 **MEMINDAI SALURAN SERVER...**',
        'setup.complete_title': '✅ Sinkronisasi Selesai',
        'setup.complete_desc': 'Berhasil memindai server, mengenali fungsi channel, dan menghubungkan seluruh sistem!',
        'setup.aborted': '🚫 Sinkronisasi dibatalkan.',
        'setup.timeout': '⚠️ Waktu habis. Pengaturan dibatalkan.',
        'setup.lang_updated_title': '✅ Bahasa Server Ditetapkan',
        'setup.lang_updated_desc': 'Bahasa server berhasil diatur ke **{lang}** {flag}!',
        'lang.current': 'ℹ️ Bahasa server saat ini: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Gunakan `{prefix}setlanguage <kode/nama>` atau menu di bawah untuk mengubahnya.*',
        'lang.updated_title': '✅ Bahasa Diperbarui',
        'lang.updated_desc': 'Bahasa server telah diubah ke **{lang}** {flag}!\nSemua respons sekarang dalam {native}.',
        'lang.invalid': '❌ Pilihan bahasa tidak valid.',
        'lang.no_permission': '❌ **Akses Ditolak:** Anda membutuhkan izin **Kelola Server** atau **Administrator**.',
        'common.access_denied': '❌ **Akses Ditolak:** Hanya Administrator yang dapat menjalankan aksi ini.',
        'common.server_only': '❌ Perintah ini hanya dapat digunakan di dalam server Discord.',
        'common.success': 'Berhasil',
        'common.error': 'Kesalahan'
    },

    // 🇮🇹 ITALIAN (Italiano)
    it: {
        'setup.welcome_title': '🌟 Benvenuto su Starry!',
        'setup.welcome_desc': 'Grazie per aver aggiunto **Starry** a **{guild}**!\n\nSeleziona la lingua del server e avvia la configurazione qui sotto.\n\n🌐 **Passo 1:** Scegli la lingua dal menu a tendina.\n🧠 **Passo 2:** Clicca su **Sincronizza Server** per collegare automaticamente canali e sicurezza.',
        'setup.select_lang_title': '🌐 Seleziona Lingua Server',
        'setup.select_lang_desc': 'Scegli la lingua principale per i comandi, le configurazioni e le risposte di Starry.',
        'setup.select_lang_placeholder': 'Scegli la lingua del tuo server...',
        'setup.sync_title': '🧠 Motore di Configurazione Starry',
        'setup.sync_desc': '**Avviare la sincronizzazione globale del server?**\n\nIl sistema analizzerà i canali e configurerà automaticamente:\n🛡️ **Sicurezza:** Verifica e Log\n👋 **Community:** Benvenuti, Starboard e Suggerimenti\n🎫 **Supporto:** Ticket e Candidature\n🎁 **Economia:** Casse e Boost',
        'setup.btn_sync': 'SINCRONIZZA SERVER',
        'setup.btn_cancel': 'ANNULLA',
        'setup.btn_lang': 'CAMBIA LINGUA',
        'setup.btn_setup': 'INIZIA CONFIGURAZIONE',
        'setup.scanning': '🧠 **SCANSIONE DEI CANALI IN CORSO...**',
        'setup.complete_title': '✅ Sincronizzazione Completata',
        'setup.complete_desc': 'Server analizzato con successo e sistemi collegati correttamente!',
        'setup.aborted': '🚫 Sincronizzazione annullata.',
        'setup.timeout': '⚠️ Timeout scaduto. Configurazione annullata.',
        'setup.lang_updated_title': '✅ Lingua del Server Impostata',
        'setup.lang_updated_desc': 'La lingua del server è stata impostata su **{lang}** {flag}!',
        'lang.current': 'ℹ️ La lingua attuale del server è: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Per cambiarla, usa `{prefix}setlanguage <codice/nome>` o il menu sottostante.*',
        'lang.updated_title': '✅ Lingua Aggiornata',
        'lang.updated_desc': 'La lingua del server è stata cambiata in **{lang}** {flag}!\nI messaggi automatici saranno in {native}.',
        'lang.invalid': '❌ Lingua non valida.',
        'lang.no_permission': '❌ **Accesso Negato:** Devi disporre dell\'autorizzazione **Gestisci server** o **Amministratore**.',
        'common.access_denied': '❌ **Accesso Negato:** Solo gli Amministratori possono eseguire questa azione.',
        'common.server_only': '❌ Questo comando può essere utilizzato solo all\'interno di un server Discord.',
        'common.success': 'Successo',
        'common.error': 'Errore'
    },

    // 🇻🇳 VIETNAMESE (Tiếng Việt)
    vi: {
        'setup.welcome_title': '🌟 Chào mừng đến với Starry!',
        'setup.welcome_desc': 'Cảm ơn bạn đã thêm **Starry** vào **{guild}**!\n\nVui lòng chọn ngôn ngữ máy chủ và bắt đầu cài đặt bên dưới.\n\n🌐 **Bước 1:** Chọn ngôn ngữ máy chủ từ danh sách.\n🧠 **Bước 2:** Nhấn **Đồng bộ máy chủ** để tự động kết nối các kênh và hệ thống.',
        'setup.select_lang_title': '🌐 Chọn Ngôn Ngữ Máy Chủ',
        'setup.select_lang_desc': 'Chọn ngôn ngữ chính cho lệnh, trình hướng dẫn và phản hồi tự động của Starry.',
        'setup.select_lang_placeholder': 'Chọn ngôn ngữ máy chủ...',
        'setup.sync_title': '🧠 Bộ Cấu Hình Tự Động Starry',
        'setup.sync_desc': '**Bắt đầu đồng bộ hóa máy chủ toàn diện?**\n\nStarry sẽ quét các kênh và cấu hình tự động:\n🛡️ **Bảo mật:** Xác minh & Nhật ký (Logs)\n👋 **Cộng đồng:** Lời chào, Starboard & Gợi ý\n🎫 **Hỗ trợ:** Vé (Tickets) & Đơn ứng tuyển\n🎁 **Kinh tế:** Rương kho báu & Theo dõi Boost',
        'setup.btn_sync': 'ĐỒNG BỘ MÁY CHỦ',
        'setup.btn_cancel': 'HỦY BỎ',
        'setup.btn_lang': 'ĐỔI NGÔN NGỮ',
        'setup.btn_setup': 'BẮT ĐẦU CÀI ĐẶT',
        'setup.scanning': '🧠 **ĐANG QUÉT MẠNG LƯỚI KÊNH...**',
        'setup.complete_title': '✅ Đồng Bộ Hoàn Tất',
        'setup.complete_desc': 'Đã quét máy chủ thành công, xác định mục đích các kênh và liên kết toàn bộ hệ thống!',
        'setup.aborted': '🚫 Đã hủy đồng bộ.',
        'setup.timeout': '⚠️ Hết thời gian chờ. Đã hủy cài đặt.',
        'setup.lang_updated_title': '✅ Đã Cài Đặt Ngôn Ngữ',
        'setup.lang_updated_desc': 'Ngôn ngữ máy chủ đã được đổi sang **{lang}** {flag}!',
        'lang.current': 'ℹ️ Ngôn ngữ máy chủ hiện tại: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Dùng lệnh `{prefix}setlanguage <mã/tên>` hoặc chọn từ menu bên dưới để đổi.*',
        'lang.updated_title': '✅ Đã Cập Nhật Ngôn Ngữ',
        'lang.updated_desc': 'Ngôn ngữ máy chủ đã đổi sang **{lang}** {flag}!\nTất cả phản hồi sẽ hiển thị bằng {native}.',
        'lang.invalid': '❌ Ngôn ngữ không hợp lệ.',
        'lang.no_permission': '❌ **Truy Cập Bị Từ Chối:** Bạn cần quyền **Quản lý máy chủ** hoặc **Quản trị viên**.',
        'common.access_denied': '❌ **Từ Chối:** Chỉ Quản trị viên mới có thể thực hiện thao tác này.',
        'common.server_only': '❌ Lệnh này chỉ có thể sử dụng trong máy chủ Discord.',
        'common.success': 'Thành công',
        'common.error': 'Lỗi'
    },

    // 🇹🇷 TURKISH (Türkçe)
    tr: {
        'setup.welcome_title': '🌟 Starry\'ye Hoş Geldiniz!',
        'setup.welcome_desc': '**Starry**\'yi **{guild}** sunucusuna eklediğiniz için teşekkür ederiz!\n\nLütfen sunucu dilini seçin ve kurulum sihirbazını başlatın.\n\n🌐 **Adım 1:** Açılır menüden sunucu dilinizi seçin.\n🧠 **Adım 2:** Kanalları ve güvenliği bağlamak için **Sunucuyu Senkronize Et** butonuna tıklayın.',
        'setup.select_lang_title': '🌐 Sunucu Dilini Seçin',
        'setup.select_lang_desc': 'Komutlar ve otomatik yanıtlar için birincil sunucu dilini seçin.',
        'setup.select_lang_placeholder': 'Sunucu dilinizi seçin...',
        'setup.sync_title': '🧠 Starry Ana Yapılandırma Motoru',
        'setup.sync_desc': '**Küresel Sunucu Senkronizasyonu Başlatılsın mı?**\n\nSistem kanalları tarayacak ve otomatik olarak ayarlayacaktır:\n🛡️ **Güvenlik:** Doğrulama & Günlükler\n👋 **Topluluk:** Karşılama, Starboard & Öneriler\n🎫 **Destek:** Destek Talepleri & Başvurular\n🎁 **Ekonomi:** Sandıklar & Takviye Takibi',
        'setup.btn_sync': 'SUNUCUYU SENKRONİZE ET',
        'setup.btn_cancel': 'İPTAL',
        'setup.btn_lang': 'DİLİ DEĞİŞTİR',
        'setup.btn_setup': 'KURULUMU BAŞLAT',
        'setup.scanning': '🧠 **KANALLAR TARANIYOR...**',
        'setup.complete_title': '✅ Senkronizasyon Tamamlandı',
        'setup.complete_desc': 'Sunucu başarıyla tarandı ve sistemler eşleştirildi!',
        'setup.aborted': '🚫 Senkronizasyon iptal edildi.',
        'setup.timeout': '⚠️ Zaman aşımı. Kurulum iptal edildi.',
        'setup.lang_updated_title': '✅ Sunucu Dili Ayarlandı',
        'setup.lang_updated_desc': 'Sunucu dili başarıyla **{lang}** {flag} olarak ayarlandı!',
        'lang.current': 'ℹ️ Geçerli sunucu dili: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*Değiştirmek için `{prefix}setlanguage <kod/ad>` kullanın veya menüden seçin.*',
        'lang.updated_title': '✅ Dil Güncellendi',
        'lang.updated_desc': 'Sunucu dili **{lang}** {flag} olarak değiştirildi!\nMesajlar artık {native} dilinde gösterilecek.',
        'lang.invalid': '❌ Geçersiz dil seçimi.',
        'lang.no_permission': '❌ **Erişim Reddedildi:** Dili değiştirmek için **Sunucuyu Yönet** veya **Yönetici** yetkisi gereklidir.',
        'common.access_denied': '❌ **Erişim Reddedildi:** Yalnızca Yöneticiler bu işlemi yapabilir.',
        'common.server_only': '❌ Bu komut yalnızca Discord sunucularında kullanılabilir.',
        'common.success': 'Başarılı',
        'common.error': 'Hata'
    },

    // 🇸🇦 ARABIC (العربية)
    ar: {
        'setup.welcome_title': '🌟 مرحبًا بك في Starry!',
        'setup.welcome_desc': 'شكرًا لإضافة **Starry** إلى **{guild}**!\n\nلضمان أفضل تجربة لمجتمعك، يرجى اختيار لغة السيرفر وبدء الإعداد أدناه.\n\n🌐 **الخطوة 1:** اختر لغة السيرفر من القائمة أدناه.\n🧠 **الخطوة 2:** انقر فوق **مزامنة السيرفر** لربط القنوات والأمان والاقتصاد تلقائيًا.',
        'setup.select_lang_title': '🌐 اختيار لغة السيرفر',
        'setup.select_lang_desc': 'اختر اللغة الأساسية لأوامر Starry وإعداداته والردود التلقائية.',
        'setup.select_lang_placeholder': 'اختر لغة السيرفر...',
        'setup.sync_title': '🧠 محرك إعدادات Starry الرئيسي',
        'setup.sync_desc': '**بدء المزامنة الشاملة للسيرفر؟**\n\nسيقوم البوت بمسح قنواتك وتهيئة الآتي تلقائيًا:\n🛡️ **الأمان:** التحقق وسجلات المراقبة\n👋 **المجتمع:** الترحيب، لوحة النجوم والاقتراحات\n🎫 **الدعم:** التذاكر والتقديمات\n🎁 **الاقتصاد:** صناديق المكافآت ومتتبع البوست',
        'setup.btn_sync': 'مزامنة السيرفر',
        'setup.btn_cancel': 'إلغاء',
        'setup.btn_lang': 'تغيير اللغة',
        'setup.btn_setup': 'بدء الإعداد',
        'setup.scanning': '🧠 **جاري مسح القنوات وتوصيل الأنظمة...**',
        'setup.complete_title': '✅ تمت المزامنة بنجاح',
        'setup.complete_desc': 'تم مسح السيرفر بنجاح وربط جميع الأنظمة بالقنوات المخصصة لها!',
        'setup.aborted': '🚫 تم إلغاء المزامنة.',
        'setup.timeout': '⚠️ انتهت المهلة أو حدث خطأ. تم إلغاء الإعداد.',
        'setup.lang_updated_title': '✅ تم تعيين لغة السيرفر',
        'setup.lang_updated_desc': 'تم ضبط لغة السيرفر بنجاح على **{lang}** {flag}!\nيمكنك الآن المتابعة في إعداد السيرفر.',
        'lang.current': 'ℹ️ لغة السيرفر الحالية هي: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*لتغييرها، استخدم `{prefix}setlanguage <الرمز/الاسم>` أو اختر من القائمة أدناه.*',
        'lang.updated_title': '✅ تم تحديث اللغة',
        'lang.updated_desc': 'تم تغيير لغة السيرفر إلى **{lang}** {flag}!\nستظهر الآن جميع الردود باللغة {native}.',
        'lang.invalid': '❌ اختيار غير صالح للغة.',
        'lang.no_permission': '❌ **تم رفض الوصول:** تحتاج إلى صلاحية **إدارة السيرفر** أو **مسؤول** لتغيير اللغة.',
        'common.access_denied': '❌ **تم رفض الوصول:** المسؤولون فقط هم من يمكنهم تنفيذ هذا الإجراء.',
        'common.server_only': '❌ لا يمكن استخدام هذا الأمر إلا داخل سيرفر ديسكورد.',
        'common.success': 'نجاح',
        'common.error': 'خطأ'
    },

    // 🇰🇷 KOREAN (한국어)
    ko: {
        'setup.welcome_title': '🌟 Starry에 오신 것을 환영합니다!',
        'setup.welcome_desc': '**{guild}** 서버에 **Starry**를 추가해 주셔서 감사합니다!\n\n커뮤니티를 위한 최상의 경험을 위해 서버 언어를 선택하고 설정 마법사를 시작하세요.\n\n🌐 **1단계:** 드롭다운 메뉴에서 서버 언어를 선택합니다.\n🧠 **2단계:** **서버 동기화**를 클릭하여 채널, 보안 및 경제 시스템을 자동으로 연결합니다.',
        'setup.select_lang_title': '🌐 서버 언어 선택',
        'setup.select_lang_desc': 'Starry 명령어, 설정 마법사 및 자동 응답에 사용할 기본 언어를 선택하세요.',
        'setup.select_lang_placeholder': '서버 언어를 선택하세요...',
        'setup.sync_title': '🧠 Starry 마스터 구성 엔진',
        'setup.sync_desc': '**글로벌 서버 동기화를 시작하시겠습니까?**\n\n채널을 자동으로 스캔하여 다음 항목을 설정합니다:\n🛡️ **보안:** 인증 및 로그 모니터링\n👋 **커뮤니티:** 환영 인사, 스타보드 및 제안\n🎫 **지원:** 티켓 및 신청서\n🎁 **경제:** 전리품 상자 및 부스트 추적',
        'setup.btn_sync': '서버 동기화',
        'setup.btn_cancel': '취소',
        'setup.btn_lang': '언어 변경',
        'setup.btn_setup': '설정 시작',
        'setup.scanning': '🧠 **채널 네트워크 스캔 중...**',
        'setup.complete_title': '✅ 동기화 완료',
        'setup.complete_desc': '서버 스캔을 완료하고 각 채널의 역할에 맞게 시스템을 성공적으로 연결했습니다!',
        'setup.aborted': '🚫 마스터 동기화가 취소되었습니다.',
        'setup.timeout': '⚠️ 시간이 초과되었습니다. 설정이 취소되었습니다.',
        'setup.lang_updated_title': '✅ 서버 언어 설정 완료',
        'setup.lang_updated_desc': '서버 언어가 **{lang}** {flag}로 성공적으로 설정되었습니다!\n이제 서버 설정을 계속 진행할 수 있습니다.',
        'lang.current': 'ℹ️ 현재 서버 언어: **{lang}** ({code}) {flag}',
        'lang.change_hint': '*변경하려면 `{prefix}setlanguage <코드/이름>`을 입력하거나 아래 메뉴에서 선택하세요.*',
        'lang.updated_title': '✅ 언어 변경 완료',
        'lang.updated_desc': '서버 언어가 **{lang}** {flag}로 변경되었습니다!\n이제 모든 자동 메시지가 {native}로 표시됩니다.',
        'lang.invalid': '❌ 유효하지 않은 언어입니다.',
        'lang.no_permission': '❌ **접근 거부:** 언어를 변경하려면 **서버 관리** 또는 **관리자** 권한이 필요합니다.',
        'common.access_denied': '❌ **접근 거부:** 관리자만 이 작업을 실행할 수 있습니다.',
        'common.server_only': '❌ 이 명령어는 디스코드 서버 내에서만 사용할 수 있습니다.',
        'common.success': '성공',
        'common.error': '오류'
    }
};

// 3B. Extended Multi-Language Dictionaries (Welcome, Music, Setup, Trivia, UI)
const EXTENDED_TRANSLATIONS = {
    en: {
        'welcome.title': '✨ WELCOME TO {server} ✨',
        'welcome.desc': '💖 Hello {user}! We are so overjoyed to have you join our family! Make sure to read the guidelines and have an amazing time here. 🌟',
        'welcome.ping': '💫 Welcome {user}! Grab a seat and enjoy your stay! 🥂',
        'welcome.footer': '✨ Enjoy your stellar journey in {server}! ✨',
        'welcome.member_field': '🌸 Community Member',
        'welcome.member_count': 'You are our precious member **#{count}**! 🎉',
        'welcome.created_field': '✨ Account Created',
        'music.controller_title': 'Music Controller',
        'music.waiting_music': 'Waiting for music...\nSend the name or link of a music',
        'music.queue_ended': '👎 The queue has ended. Use {play_cmd} to queue more music!',
        'music.btn_down': 'Down',
        'music.btn_prev': 'Previous',
        'music.btn_pause': 'Pause',
        'music.btn_resume': 'Resume',
        'music.btn_skip': 'Skip',
        'music.btn_up': 'Up',
        'music.btn_shuffle': 'Shuffle',
        'music.btn_autoplay': 'AutoPlay',
        'music.btn_stop': 'Stop',
        'music.btn_dashboard': 'Dashboard',
        'music.btn_queue': 'Queue',
        'music.btn_like': 'Like',
        'music.btn_dislike': 'Not for me',
        'music.btn_block': 'Block',
        'music.btn_next_up': "What's next?",
        'music.btn_connect': 'Connect Bot',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Vote',
        'music.filter_placeholder': '🎧 Select Audio Filter / Sound FX...',
        'avatar.title': 'Avatar for {user}',
        'banner.title': 'Banner for {user}',
        'common.open_in_browser': 'Open in Browser',
        'trivia.win_title': '🎉 Brilliant! Correct Answer!',
        'trivia.win_desc': 'You correctly identified **{answer}**!\n\n✨ **Earned:** `+$150 Stardust Credits`',
        'trivia.lose_title': '❌ Not Quite!',
        'trivia.lose_desc': 'The correct answer was **{answer}**!\nBetter luck on the next question!',
        'setname.success': '✅ Success! My trigger word for this server has been changed to **{name}**!',
        'verify.btn': 'I am Human (Verify)',
        'setup.report.identity': '⚙️ **Identity:** Trigger word set to `{name}`',
        'setup.report.welcome': '👋 **Welcomes:** Linked to <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Linked to <#{channel}>',
        'setup.report.suggestions': '💡 **Suggestions:** Linked to <#{channel}>',
        'setup.report.verify': '🛡️ **Verification:** Mapped to <#{channel}>',
        'setup.report.logging': '🗂️ **Smart Logging:** Successfully mapped **{count}** distinct log channels.',
        'setup.report.tickets': '🎫 **Tickets:** Bound to `{open}` & `{closed}`',
        'setup.report.apps': '📝 **Applications:** Bound to category `{category}`',
        'setup.report.boost': '🚀 **Boost Tracker:** Linked to <#{channel}>',
        'setup.report.loot': '🎁 **Loot Engine:** Activated in **{count}** chat channels'
    },
    es: {
        'welcome.title': '✨ ¡BIENVENIDO A {server}! ✨',
        'welcome.desc': '💖 ¡Hola {user}! ¡Estamos muy felices de que te unas a nuestra familia! Asegúrate de leer las normas y disfrutar tu estancia. 🌟',
        'welcome.ping': '💫 ¡Bienvenido {user}! ¡Ponte cómodo y disfruta! 🥂',
        'welcome.footer': '✨ ¡Disfruta tu viaje estelar en {server}! ✨',
        'welcome.member_field': '🌸 Miembro de la Comunidad',
        'welcome.member_count': '¡Eres nuestro preciado miembro **#{count}**! 🎉',
        'welcome.created_field': '✨ Cuenta Creada',
        'music.controller_title': 'Controlador de Música',
        'music.waiting_music': 'Esperando música...\nEnvía el nombre o enlace de una canción',
        'music.queue_ended': '👎 La cola ha terminado. ¡Usa {play_cmd} para añadir más canciones!',
        'music.btn_down': 'Bajar',
        'music.btn_prev': 'Anterior',
        'music.btn_pause': 'Pausar',
        'music.btn_resume': 'Reanudar',
        'music.btn_skip': 'Saltar',
        'music.btn_up': 'Subir',
        'music.btn_shuffle': 'Aleatorio',
        'music.btn_autoplay': 'AutoReproducir',
        'music.btn_stop': 'Detener',
        'music.btn_dashboard': 'Panel Web',
        'music.btn_queue': 'Cola',
        'music.btn_like': 'Me gusta',
        'music.btn_dislike': 'No me gusta',
        'music.btn_block': 'Bloquear',
        'music.btn_next_up': '¿Qué sigue?',
        'music.btn_connect': 'Conectar Bot',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Votar',
        'music.filter_placeholder': '🎧 Seleccionar Filtro de Audio / Efectos...',
        'avatar.title': 'Avatar de {user}',
        'banner.title': 'Banner de {user}',
        'common.open_in_browser': 'Abrir en el Navegador',
        'trivia.win_title': '🎉 ¡Genial! ¡Respuesta Correcta!',
        'trivia.win_desc': '¡Identificaste correctamente **{answer}**!\n\n✨ **Ganaste:** `+$150 Créditos de Polvo Estelar`',
        'trivia.lose_title': '❌ ¡Casi!',
        'trivia.lose_desc': '¡La respuesta correcta era **{answer}**!\n¡Más suerte en la próxima pregunta!',
        'setname.success': '✅ ¡Éxito! Mi palabra de activación para este servidor se ha cambiado a **{name}**!',
        'verify.btn': 'Soy Humano (Verificar)',
        'setup.report.identity': '⚙️ **Identidad:** Palabra de activación establecida en `{name}`',
        'setup.report.welcome': '👋 **Bienvenidas:** Vinculado a <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Vinculado a <#{channel}>',
        'setup.report.suggestions': '💡 **Sugerencias:** Vinculado a <#{channel}>',
        'setup.report.verify': '🛡️ **Verificación:** Asignado a <#{channel}>',
        'setup.report.logging': '🗂️ **Registro Inteligente:** Mapeados con éxito **{count}** canales de logs.',
        'setup.report.tickets': '🎫 **Tickets:** Vinculado a `{open}` y `{closed}`',
        'setup.report.apps': '📝 **Postulaciones:** Vinculado a la categoría `{category}`',
        'setup.report.boost': '🚀 **Rastreador de Boosts:** Vinculado a <#{channel}>',
        'setup.report.loot': '🎁 **Motor de Botín:** Activado en **{count}** canales de chat'
    },
    pt: {
        'welcome.title': '✨ BEM-VINDO(A) A {server}! ✨',
        'welcome.desc': '💖 Olá {user}! Estamos radiantes por você se juntar à nossa família! Não deixe de ler as regras e aproveite sua estadia. 🌟',
        'welcome.ping': '💫 Boas-vindas {user}! Puxe uma cadeira e fique à vontade! 🥂',
        'welcome.footer': '✨ Aproveite sua jornada estelar em {server}! ✨',
        'welcome.member_field': '🌸 Membro da Comunidade',
        'welcome.member_count': 'Você é o nosso membro número **#{count}**! 🎉',
        'welcome.created_field': '✨ Conta Criada',
        'music.controller_title': 'Controlador de Música',
        'music.waiting_music': 'Aguardando música...\nEnvie o nome ou link de uma música',
        'music.queue_ended': '👎 A fila terminou. Use {play_cmd} para tocar mais músicas!',
        'music.btn_down': 'Diminuir',
        'music.btn_prev': 'Anterior',
        'music.btn_pause': 'Pausar',
        'music.btn_resume': 'Retomar',
        'music.btn_skip': 'Pular',
        'music.btn_up': 'Aumentar',
        'music.btn_shuffle': 'Aleatório',
        'music.btn_autoplay': 'AutoTocar',
        'music.btn_stop': 'Parar',
        'music.btn_dashboard': 'Painel Web',
        'music.btn_queue': 'Fila',
        'music.btn_like': 'Gostei',
        'music.btn_dislike': 'Não gostei',
        'music.btn_block': 'Bloquear',
        'music.btn_next_up': 'O que vem a seguir?',
        'music.btn_connect': 'Conectar Bot',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Votar',
        'music.filter_placeholder': '🎧 Selecionar Filtro de Áudio / Efeitos...',
        'avatar.title': 'Avatar de {user}',
        'banner.title': 'Banner de {user}',
        'common.open_in_browser': 'Abrir no Navegador',
        'trivia.win_title': '🎉 Incrível! Resposta Correta!',
        'trivia.win_desc': 'Você identificou corretamente **{answer}**!\n\n✨ **Ganhou:** `+$150 Créditos de Poeira Estelar`',
        'trivia.lose_title': '❌ Não foi dessa vez!',
        'trivia.lose_desc': 'A resposta correta era **{answer}**!\nMais sorte na próxima pergunta!',
        'setname.success': '✅ Sucesso! Minha palavra de ativação para este servidor foi alterada para **{name}**!',
        'verify.btn': 'Sou Humano (Verificar)',
        'setup.report.identity': '⚙️ **Identidade:** Palavra de ativação definida para `{name}`',
        'setup.report.welcome': '👋 **Boas-vindas:** Vinculado a <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Vinculado a <#{channel}>',
        'setup.report.suggestions': '💡 **Sugestões:** Vinculado a <#{channel}>',
        'setup.report.verify': '🛡️ **Verificação:** Mapeado para <#{channel}>',
        'setup.report.logging': '🗂️ **Logs Inteligentes:** Mapeados com sucesso **{count}** canais de log.',
        'setup.report.tickets': '🎫 **Tickets:** Vinculado a `{open}` e `{closed}`',
        'setup.report.apps': '📝 **Formulários:** Vinculado à categoria `{category}`',
        'setup.report.boost': '🚀 **Rastreador de Boosts:** Vinculado a <#{channel}>',
        'setup.report.loot': '🎁 **Motor de Recompensas:** Ativado em **{count}** canais de bate-papo'
    },
    ja: {
        'welcome.title': '✨ {server} へようこそ！ ✨',
        'welcome.desc': '💖 こんにちは {user} さん！私たちのサーバーへ参加していただき、とても嬉しいです！ルールを確認して、楽しい時間をお過ごしください。🌟',
        'welcome.ping': '💫 ようこそ {user} さん！ゆっくりしていってくださいね！🥂',
        'welcome.footer': '✨ {server} での素晴らしい旅をお楽しみください！ ✨',
        'welcome.member_field': '🌸 サーバーメンバー',
        'welcome.member_count': 'あなたは大切な **#{count}** 番目のメンバーです！🎉',
        'welcome.created_field': '✨ アカウント作成日',
        'music.controller_title': '音楽コントローラー',
        'music.waiting_music': '音楽の待機中...\n曲名またはリンクを送信してください',
        'music.queue_ended': '👎 キューが終了しました。さらに再生するには {play_cmd} を使ってください！',
        'music.btn_down': '音量下げる',
        'music.btn_prev': '前の曲',
        'music.btn_pause': '一時停止',
        'music.btn_resume': '再生',
        'music.btn_skip': 'スキップ',
        'music.btn_up': '音量上げる',
        'music.btn_shuffle': 'シャッフル',
        'music.btn_autoplay': '自動再生',
        'music.btn_stop': '停止',
        'music.btn_dashboard': 'ダッシュボード',
        'music.btn_queue': 'キュー',
        'music.btn_like': '高評価',
        'music.btn_dislike': '低評価',
        'music.btn_block': 'ブロック',
        'music.btn_next_up': '次は？',
        'music.btn_connect': 'ボット接続',
        'music.btn_premium': 'プレミアム',
        'music.btn_vote': '投票',
        'music.filter_placeholder': '🎧 オーディオフィルター / 効果音を選択...',
        'avatar.title': '{user} のアバター',
        'banner.title': '{user} のバナー',
        'common.open_in_browser': 'ブラウザで開く',
        'trivia.win_title': '🎉 正解です！素晴らしい！',
        'trivia.win_desc': '正解の **{answer}** を見事当てました！\n\n✨ **獲得:** `+150 スターダストクレジット`',
        'trivia.lose_title': '❌ 不正解です！',
        'trivia.lose_desc': '正解は **{answer}** でした！\n次の問題でリベンジしましょう！',
        'setname.success': '✅ 成功！このサーバーでのトリガーワードを **{name}** に変更しました！',
        'verify.btn': '認証する (私は人間です)',
        'setup.report.identity': '⚙️ **識別:** トリガーワードを `{name}` に設定しました',
        'setup.report.welcome': '👋 **ようこそ:** <#{channel}> にリンクしました',
        'setup.report.starboard': '⭐ **スターボード:** <#{channel}> にリンクしました',
        'setup.report.suggestions': '💡 **提案:** <#{channel}> にリンクしました',
        'setup.report.verify': '🛡️ **認証:** <#{channel}> に設定しました',
        'setup.report.logging': '🗂️ **スマートログ:** **{count}** 個のログチャンネルをマッピングしました。',
        'setup.report.tickets': '🎫 **チケット:** `{open}` と `{closed}` にバインドしました',
        'setup.report.apps': '📝 **申請:** カテゴリ `{category}` にバインドしました',
        'setup.report.boost': '🚀 **ブースト追跡:** <#{channel}> にリンクしました',
        'setup.report.loot': '🎁 **戦利品エンジン:** **{count}** 個のチャットで有効化されました'
    },
    hi: {
        'welcome.title': '✨ {server} में आपका स्वागत है! ✨',
        'welcome.desc': '💖 नमस्ते {user}! हमारे परिवार में आपका स्वागत है! कृपया नियमों को पढ़ें और अपने समय का आनंद लें। 🌟',
        'welcome.ping': '💫 स्वागत है {user}! आराम से बैठें और मज़ा लें! 🥂',
        'welcome.footer': '✨ {server} में अपनी शानदार यात्रा का आनंद लें! ✨',
        'welcome.member_field': '🌸 कम्युनिटी सदस्य',
        'welcome.member_count': 'आप हमारे अनमोल **#{count}**वें सदस्य हैं! 🎉',
        'welcome.created_field': '✨ खाता निर्माण',
        'music.controller_title': 'म्यूजिक कंट्रोलर',
        'music.waiting_music': 'संगीत की प्रतीक्षा है...\nगाने का नाम या लिंक भेजें',
        'music.queue_ended': '👎 कतार समाप्त हो गई है। और संगीत जोड़ने के लिए {play_cmd} का उपयोग करें!',
        'music.btn_down': 'धीमा करें',
        'music.btn_prev': 'पिछला',
        'music.btn_pause': 'रोकें',
        'music.btn_resume': 'जारी रखें',
        'music.btn_skip': 'आगे बढ़ाएं',
        'music.btn_up': 'तेज़ करें',
        'music.btn_shuffle': 'शफ़ल',
        'music.btn_autoplay': 'ऑटो-प्ले',
        'music.btn_stop': 'बंद करें',
        'music.btn_dashboard': 'डैशबोर्ड',
        'music.btn_queue': 'कतार',
        'music.btn_like': 'पसंद',
        'music.btn_dislike': 'नापसंद',
        'music.btn_block': 'ब्लॉक',
        'music.btn_next_up': 'आगे क्या है?',
        'music.btn_connect': 'बॉट कनेक्ट करें',
        'music.btn_premium': 'प्रीमियम',
        'music.btn_vote': 'वोट करें',
        'music.filter_placeholder': '🎧 ऑडियो फ़िल्टर / ध्वनि प्रभाव चुनें...',
        'avatar.title': '{user} का अवतार',
        'banner.title': '{user} का बैनर',
        'common.open_in_browser': 'ब्राउज़र में खोलें',
        'trivia.win_title': '🎉 शानदार! बिल्कुल सही उत्तर!',
        'trivia.win_desc': 'आपने सही उत्तर दिया: **{answer}**!\n\n✨ **कमाई:** `+$150 स्टारडस्ट क्रेडिट्स`',
        'trivia.lose_title': '❌ गलत जवाब!',
        'trivia.lose_desc': 'सही उत्तर था: **{answer}**!\nअगले प्रश्न में शुभकामनाएँ!',
        'setname.success': '✅ सफल! इस सर्वर के लिए मेरा ट्रिगर शब्द बदलकर **{name}** कर दिया गया है!',
        'verify.btn': 'मैं इंसान हूँ (वेरिफाई)',
        'setup.report.identity': '⚙️ **पहचान:** ट्रिगर शब्द को `{name}` पर सेट किया गया',
        'setup.report.welcome': '👋 **स्वागत:** <#{channel}> से जोड़ा गया',
        'setup.report.starboard': '⭐ **स्टारबोर्ड:** <#{channel}> से जोड़ा गया',
        'setup.report.suggestions': '💡 **सुझाव:** <#{channel}> से जोड़ा गया',
        'setup.report.verify': '🛡️ **वेरिफिकेशन:** <#{channel}> से जोड़ा गया',
        'setup.report.logging': '🗂️ **स्मार्ट लॉगिंग:** सफलतापूर्वक **{count}** लॉग चैनल मैप किए गए।',
        'setup.report.tickets': '🎫 **टिकट्स:** `{open}` और `{closed}` से जुड़े',
        'setup.report.apps': '📝 **आवेदन:** श्रेणी `{category}` से जुड़े',
        'setup.report.boost': '🚀 **बूस्ट ट्रैकर:** <#{channel}> से जोड़ा गया',
        'setup.report.loot': '🎁 **लूट इंजन:** **{count}** चैट चैनलों में सक्रिय किया गया'
    },
    fr: {
        'welcome.title': '✨ BIENVENUE SUR {server} ! ✨',
        'welcome.desc': '💖 Bonjour {user} ! Nous sommes ravis de vous accueillir dans notre famille ! Lisez les règles et passez un moment magique. 🌟',
        'welcome.ping': '💫 Bienvenue {user} ! Installez-vous et profitez de votre séjour ! 🥂',
        'welcome.footer': '✨ Profitez de votre voyage stellaire sur {server} ! ✨',
        'welcome.member_field': '🌸 Membre de la communauté',
        'welcome.member_count': 'Vous êtes notre précieux membre **#{count}** ! 🎉',
        'welcome.created_field': '✨ Compte créé',
        'music.controller_title': 'Contrôleur Musical',
        'music.waiting_music': 'En attente de musique...\nEnvoyez le nom ou le lien d\'une musique',
        'music.queue_ended': '👎 La file d\'attente est terminée. Utilisez {play_cmd} pour ajouter plus de musique !',
        'music.btn_down': 'Baisser',
        'music.btn_prev': 'Précédent',
        'music.btn_pause': 'Pause',
        'music.btn_resume': 'Reprendre',
        'music.btn_skip': 'Passer',
        'music.btn_up': 'Monter',
        'music.btn_shuffle': 'Aléatoire',
        'music.btn_autoplay': 'Lecture Auto',
        'music.btn_stop': 'Arrêter',
        'music.btn_dashboard': 'Tableau de bord',
        'music.btn_queue': 'File',
        'music.btn_like': 'J\'aime',
        'music.btn_dislike': 'Pas pour moi',
        'music.btn_block': 'Bloquer',
        'music.btn_next_up': 'La suite ?',
        'music.btn_connect': 'Connecter Bot',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Voter',
        'music.filter_placeholder': '🎧 Sélectionner un filtre audio / effets...',
        'avatar.title': 'Avatar de {user}',
        'banner.title': 'Bannière de {user}',
        'common.open_in_browser': 'Ouvrir dans le navigateur',
        'trivia.win_title': '🎉 Brillant ! Bonne réponse !',
        'trivia.win_desc': 'Vous avez correctement identifié **{answer}** !\n\n✨ **Gagné :** `+150 Crédits Stardust`',
        'trivia.lose_title': '❌ Pas tout à fait !',
        'trivia.lose_desc': 'La bonne réponse était **{answer}** !\nPlus de chance à la prochaine question !',
        'setname.success': '✅ Succès ! Mon mot déclencheur pour ce serveur est désormais **{name}** !',
        'verify.btn': 'Je suis un humain (Vérifier)',
        'setup.report.identity': '⚙️ **Identité :** Mot déclencheur défini sur `{name}`',
        'setup.report.welcome': '👋 **Bienvenue :** Lié à <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard :** Lié à <#{channel}>',
        'setup.report.suggestions': '💡 **Suggestions :** Lié à <#{channel}>',
        'setup.report.verify': '🛡️ **Vérification :** Mappé sur <#{channel}>',
        'setup.report.logging': '🗂️ **Logs Intelligents :** **{count}** salons de logs identifiés.',
        'setup.report.tickets': '🎫 **Tickets :** Lié à `{open}` et `{closed}`',
        'setup.report.apps': '📝 **Candidatures :** Lié à la catégorie `{category}`',
        'setup.report.boost': '🚀 **Suivi Boost :** Lié à <#{channel}>',
        'setup.report.loot': '🎁 **Moteur de Butin :** Activé dans **{count}** salons'
    },
    de: {
        'welcome.title': '✨ WILLKOMMEN AUF {server}! ✨',
        'welcome.desc': '💖 Hallo {user}! Wir freuen uns riesig, dich in unserer Familie begrüßen zu dürfen! Lies die Regeln und hab eine tolle Zeit. 🌟',
        'welcome.ping': '💫 Willkommen {user}! Nimm Platz und genieße deinen Aufenthalt! 🥂',
        'welcome.footer': '✨ Genieße deine Reise auf {server}! ✨',
        'welcome.member_field': '🌸 Community-Mitglied',
        'welcome.member_count': 'Du bist unser geschätztes Mitglied **#{count}**! 🎉',
        'welcome.created_field': '✨ Account erstellt',
        'music.controller_title': 'Musik-Controller',
        'music.waiting_music': 'Warte auf Musik...\nSende den Namen oder Link eines Songs',
        'music.queue_ended': '👎 Die Warteschlange ist beendet. Verwende {play_cmd}, um weitere Musik hinzuzufügen!',
        'music.btn_down': 'Leiser',
        'music.btn_prev': 'Zurück',
        'music.btn_pause': 'Pause',
        'music.btn_resume': 'Fortsetzen',
        'music.btn_skip': 'Überspringen',
        'music.btn_up': 'Lauter',
        'music.btn_shuffle': 'Zufall',
        'music.btn_autoplay': 'Autoplay',
        'music.btn_stop': 'Stopp',
        'music.btn_dashboard': 'Dashboard',
        'music.btn_queue': 'Warteschlange',
        'music.btn_like': 'Gefällt mir',
        'music.btn_dislike': 'Gefällt mir nicht',
        'music.btn_block': 'Blockieren',
        'music.btn_next_up': 'Was kommt als Nächstes?',
        'music.btn_connect': 'Bot verbinden',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Abstimmen',
        'music.filter_placeholder': '🎧 Audiofilter / Effekte wählen...',
        'avatar.title': 'Avatar von {user}',
        'banner.title': 'Banner von {user}',
        'common.open_in_browser': 'Im Browser öffnen',
        'trivia.win_title': '🎉 Genial! Richtige Antwort!',
        'trivia.win_desc': 'Du hast **{answer}** richtig erkannt!\n\n✨ **Belohnung:** `+150 Sternenstaub-Credits`',
        'trivia.lose_title': '❌ Leider falsch!',
        'trivia.lose_desc': 'Die richtige Antwort war **{answer}**!\nViel Glück bei der nächsten Frage!',
        'setname.success': '✅ Erfolg! Mein Auslöserwort für diesen Server wurde auf **{name}** geändert!',
        'verify.btn': 'Ich bin ein Mensch (Verifizieren)',
        'setup.report.identity': '⚙️ **Identität:** Auslöserwort auf `{name}` gesetzt',
        'setup.report.welcome': '👋 **Willkommen:** Verknüpft mit <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Verknüpft mit <#{channel}>',
        'setup.report.suggestions': '💡 **Vorschläge:** Verknüpft mit <#{channel}>',
        'setup.report.verify': '🛡️ **Verifizierung:** Verknüpft mit <#{channel}>',
        'setup.report.logging': '🗂️ **Smart Logging:** **{count}** Log-Kanäle erfolgreich erfasst.',
        'setup.report.tickets': '🎫 **Tickets:** Gebunden an `{open}` & `{closed}`',
        'setup.report.apps': '📝 **Bewerbungen:** Gebunden an Kategorie `{category}`',
        'setup.report.boost': '🚀 **Boost-Tracker:** Verknüpft mit <#{channel}>',
        'setup.report.loot': '🎁 **Beute-Engine:** In **{count}** Textkanälen aktiviert'
    },
    ru: {
        'welcome.title': '✨ ДОБРО ПОЖАЛОВАТЬ НА {server}! ✨',
        'welcome.desc': '💖 Привет, {user}! Мы очень рады, что ты присоединился к нашей семье! Ознакомься с правилами и приятного отдыха. 🌟',
        'welcome.ping': '💫 Добро пожаловать, {user}! Располагайся поудобнее! 🥂',
        'welcome.footer': '✨ Приятного путешествия по {server}! ✨',
        'welcome.member_field': '🌸 Участник сообщества',
        'welcome.member_count': 'Ты наш драгоценный участник **#{count}**! 🎉',
        'welcome.created_field': '✨ Аккаунт создан',
        'music.controller_title': 'Музыкальный Контроллер',
        'music.waiting_music': 'Ожидание музыки...\nОтправьте название или ссылку на трек',
        'music.queue_ended': '👎 Очередь воспроизведения завершена. Используйте {play_cmd}, чтобы добавить музыку!',
        'music.btn_down': 'Тише',
        'music.btn_prev': 'Назад',
        'music.btn_pause': 'Пауза',
        'music.btn_resume': 'Играть',
        'music.btn_skip': 'Пропуск',
        'music.btn_up': 'Громче',
        'music.btn_shuffle': 'Перемешать',
        'music.btn_autoplay': 'Автоповтор',
        'music.btn_stop': 'Стоп',
        'music.btn_dashboard': 'Панель',
        'music.btn_queue': 'Очередь',
        'music.btn_like': 'Нравится',
        'music.btn_dislike': 'Не нравится',
        'music.btn_block': 'Блок',
        'music.btn_next_up': 'Что дальше?',
        'music.btn_connect': 'Подключить бота',
        'music.btn_premium': 'Премиум',
        'music.btn_vote': 'Голосовать',
        'music.filter_placeholder': '🎧 Выберите фильтр звука / эффекты...',
        'avatar.title': 'Аватар пользователя {user}',
        'banner.title': 'Баннер пользователя {user}',
        'common.open_in_browser': 'Открыть в браузере',
        'trivia.win_title': '🎉 Превосходно! Правильный ответ!',
        'trivia.win_desc': 'Вы правильно ответили: **{answer}**!\n\n✨ **Получено:** `+150 кредитов звёздной пыли`',
        'trivia.lose_title': '❌ Не совсем!',
        'trivia.lose_desc': 'Правильный ответ был: **{answer}**!\nУдачи в следующем вопросе!',
        'setname.success': '✅ Успешно! Моё слово-триггер для этого сервера изменено на **{name}**!',
        'verify.btn': 'Я человек (Верификация)',
        'setup.report.identity': '⚙️ **Идентификация:** Слово-триггер установлено на `{name}`',
        'setup.report.welcome': '👋 **Приветствия:** Привязано к <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Привязано к <#{channel}>',
        'setup.report.suggestions': '💡 **Предложения:** Привязано к <#{channel}>',
        'setup.report.verify': '🛡️ **Верификация:** Привязано к <#{channel}>',
        'setup.report.logging': '🗂️ **Умное логирование:** Успешно обнаружено **{count}** каналов логов.',
        'setup.report.tickets': '🎫 **Тикеты:** Привязаны к `{open}` и `{closed}`',
        'setup.report.apps': '📝 **Заявки:** Привязаны к категории `{category}`',
        'setup.report.boost': '🚀 **Трекер бустов:** Привязано к <#{channel}>',
        'setup.report.loot': '🎁 **Сундуки с добычей:** Активировано в **{count}** чатах'
    },
    id: {
        'welcome.title': '✨ SELAMAT DATANG DI {server}! ✨',
        'welcome.desc': '💖 Halo {user}! Kami sangat gembira menyambut Anda di keluarga kami! Pastikan untuk membaca peraturan dan nikmati waktu Anda di sini. 🌟',
        'welcome.ping': '💫 Selamat datang {user}! Silakan duduk santai dan nikmati waktu Anda! 🥂',
        'welcome.footer': '✨ Nikmati perjalanan luar biasa Anda di {server}! ✨',
        'welcome.member_field': '🌸 Anggota Komunitas',
        'welcome.member_count': 'Anda adalah anggota berharga kami yang ke-**#{count}**! 🎉',
        'welcome.created_field': '✨ Akun Dibuat',
        'music.controller_title': 'Pengontrol Musik',
        'music.waiting_music': 'Menunggu musik...\nKirimkan judul atau tautan musik',
        'music.queue_ended': '👎 Antrean telah selesai. Gunakan {play_cmd} untuk memutar musik lagi!',
        'music.btn_down': 'Kecilkan',
        'music.btn_prev': 'Sebelumnya',
        'music.btn_pause': 'Jeda',
        'music.btn_resume': 'Lanjutkan',
        'music.btn_skip': 'Lewati',
        'music.btn_up': 'Keraskan',
        'music.btn_shuffle': 'Acak',
        'music.btn_autoplay': 'Putar Otomatis',
        'music.btn_stop': 'Berhenti',
        'music.btn_dashboard': 'Dasbor Web',
        'music.btn_queue': 'Antrean',
        'music.btn_like': 'Suka',
        'music.btn_dislike': 'Bukan untuk saya',
        'music.btn_block': 'Blokir',
        'music.btn_next_up': 'Berikutnya?',
        'music.btn_connect': 'Hubungkan Bot',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Beri Suara',
        'music.filter_placeholder': '🎧 Pilih Filter Audio / Efek Suara...',
        'avatar.title': 'Avatar untuk {user}',
        'banner.title': 'Banner untuk {user}',
        'common.open_in_browser': 'Buka di Browser',
        'trivia.win_title': '🎉 Luar biasa! Jawaban Benar!',
        'trivia.win_desc': 'Anda berhasil menjawab **{answer}**!\n\n✨ **Hadiah:** `+150 Kredit Debu Bintang`',
        'trivia.lose_title': '❌ Kurang Tepat!',
        'trivia.lose_desc': 'Jawaban yang benar adalah **{answer}**!\nSemoga beruntung di pertanyaan berikutnya!',
        'setname.success': '✅ Berhasil! Kata pemicu saya untuk server ini telah diubah menjadi **{name}**!',
        'verify.btn': 'Saya Manusia (Verifikasi)',
        'setup.report.identity': '⚙️ **Identitas:** Kata pemicu diatur ke `{name}`',
        'setup.report.welcome': '👋 **Penyambutan:** Ditautkan ke <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Ditautkan ke <#{channel}>',
        'setup.report.suggestions': '💡 **Saran:** Ditautkan ke <#{channel}>',
        'setup.report.verify': '🛡️ **Verifikasi:** Dipetakan ke <#{channel}>',
        'setup.report.logging': '🗂️ **Pencatatan Cerdas:** Berhasil memetakan **{count}** saluran log.',
        'setup.report.tickets': '🎫 **Tiket:** Terikat ke `{open}` & `{closed}`',
        'setup.report.apps': '📝 **Pendaftaran:** Terikat ke kategori `{category}`',
        'setup.report.boost': '🚀 **Pelacak Boost:** Ditautkan ke <#{channel}>',
        'setup.report.loot': '🎁 **Peti Hadiah:** Diaktifkan di **{count}** saluran obrolan'
    },
    it: {
        'welcome.title': '✨ BENVENUTO SU {server}! ✨',
        'welcome.desc': '💖 Ciao {user}! Siamo felicissimi di averti nella nostra famiglia! Assicurati di leggere le regole e divertiti. 🌟',
        'welcome.ping': '💫 Benvenuto {user}! Mettiti comodo e goditi il soggiorno! 🥂',
        'welcome.footer': '✨ Goditi il tuo viaggio stellare su {server}! ✨',
        'welcome.member_field': '🌸 Membro della Community',
        'welcome.member_count': 'Sei il nostro prezioso membro n. **#{count}**! 🎉',
        'welcome.created_field': '✨ Account Creato',
        'music.controller_title': 'Controller Musicale',
        'music.waiting_music': 'In attesa di musica...\nInvia il nome o il link di un brano',
        'music.queue_ended': '👎 La coda è terminata. Usa {play_cmd} per aggiungere altri brani!',
        'music.btn_down': 'Abbassa',
        'music.btn_prev': 'Precedente',
        'music.btn_pause': 'Pausa',
        'music.btn_resume': 'Riprendi',
        'music.btn_skip': 'Salta',
        'music.btn_up': 'Alza',
        'music.btn_shuffle': 'Casuale',
        'music.btn_autoplay': 'Riproduzione Auto',
        'music.btn_stop': 'Stop',
        'music.btn_dashboard': 'Pannello Web',
        'music.btn_queue': 'Coda',
        'music.btn_like': 'Mi piace',
        'music.btn_dislike': 'Non fa per me',
        'music.btn_block': 'Blocca',
        'music.btn_next_up': 'Cosa c\'è dopo?',
        'music.btn_connect': 'Connetti Bot',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Vota',
        'music.filter_placeholder': '🎧 Seleziona filtro audio / effetti...',
        'avatar.title': 'Avatar di {user}',
        'banner.title': 'Banner di {user}',
        'common.open_in_browser': 'Apri nel Browser',
        'trivia.win_title': '🎉 Fantastico! Risposta Corretta!',
        'trivia.win_desc': 'Hai identificato correttamente **{answer}**!\n\n✨ **Guadagnato:** `+150 Crediti Polvere di Stelle`',
        'trivia.lose_title': '❌ Non esattamente!',
        'trivia.lose_desc': 'La risposta corretta era **{answer}**!\nBuona fortuna per la prossima domanda!',
        'setname.success': '✅ Successo! La mia parola di attivazione per questo server è ora **{name}**!',
        'verify.btn': 'Sono un essere umano (Verifica)',
        'setup.report.identity': '⚙️ **Identità:** Parola di attivazione impostata su `{name}`',
        'setup.report.welcome': '👋 **Benvenuto:** Collegato a <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Collegato a <#{channel}>',
        'setup.report.suggestions': '💡 **Suggerimenti:** Collegato a <#{channel}>',
        'setup.report.verify': '🛡️ **Verifica:** Mappato su <#{channel}>',
        'setup.report.logging': '🗂️ **Registri Intelligenti:** Mappati **{count}** canali di registro.',
        'setup.report.tickets': '🎫 **Ticket:** Collegati a `{open}` e `{closed}`',
        'setup.report.apps': '📝 **Candidature:** Collegate alla categoria `{category}`',
        'setup.report.boost': '🚀 **Tracciatore Boost:** Collegato a <#{channel}>',
        'setup.report.loot': '🎁 **Motore Bottino:** Attivato in **{count}** canali di testo'
    },
    vi: {
        'welcome.title': '✨ CHÀO MỪNG ĐẾN VỚI {server}! ✨',
        'welcome.desc': '💖 Xin chào {user}! Chúng tôi rất vui mừng khi bạn tham gia gia đình chúng tôi! Hãy đọc quy định và có khoảng thời gian tuyệt vời nhé. 🌟',
        'welcome.ping': '💫 Chào mừng {user}! Hãy ngồi xuống và tận hưởng nhé! 🥂',
        'welcome.footer': '✨ Chúc bạn có chuyến hành trình tuyệt vời tại {server}! ✨',
        'welcome.member_field': '🌸 Thành viên cộng đồng',
        'welcome.member_count': 'Bạn là thành viên quý giá thứ **#{count}** của chúng tôi! 🎉',
        'welcome.created_field': '✨ Tài khoản được tạo',
        'music.controller_title': 'Trình Điều Khiển Âm Nhạc',
        'music.waiting_music': 'Đang chờ nhạc...\nGửi tên bài hát hoặc liên kết',
        'music.queue_ended': '👎 Danh sách phát đã kết thúc. Dùng {play_cmd} để thêm bài hát!',
        'music.btn_down': 'Giảm âm',
        'music.btn_prev': 'Bài trước',
        'music.btn_pause': 'Tạm dừng',
        'music.btn_resume': 'Tiếp tục',
        'music.btn_skip': 'Bỏ qua',
        'music.btn_up': 'Tăng âm',
        'music.btn_shuffle': 'Xáo trộn',
        'music.btn_autoplay': 'Tự động phát',
        'music.btn_stop': 'Dừng lại',
        'music.btn_dashboard': 'Bảng điều khiển',
        'music.btn_queue': 'Hàng đợi',
        'music.btn_like': 'Thích',
        'music.btn_dislike': 'Không thích',
        'music.btn_block': 'Chặn',
        'music.btn_next_up': 'Bài tiếp theo?',
        'music.btn_connect': 'Kết nối Bot',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Bình chọn',
        'music.filter_placeholder': '🎧 Chọn bộ lọc âm thanh / hiệu ứng...',
        'avatar.title': 'Ảnh đại diện của {user}',
        'banner.title': 'Banner của {user}',
        'common.open_in_browser': 'Mở trong trình duyệt',
        'trivia.win_title': '🎉 Xuất sắc! Câu trả lời chính xác!',
        'trivia.win_desc': 'Bạn đã xác định đúng **{answer}**!\n\n✨ **Nhận được:** `+150 Điểm Bụi Sao`',
        'trivia.lose_title': '❌ Chưa chính xác!',
        'trivia.lose_desc': 'Đáp án đúng là **{answer}**!\nChúc bạn may mắn ở câu hỏi tiếp theo!',
        'setname.success': '✅ Thành công! Từ kích hoạt của tôi cho máy chủ này đã được đổi thành **{name}**!',
        'verify.btn': 'Tôi là con người (Xác minh)',
        'setup.report.identity': '⚙️ **Nhận diện:** Từ kích hoạt được đặt thành `{name}`',
        'setup.report.welcome': '👋 **Chào mừng:** Đã liên kết với <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** Đã liên kết với <#{channel}>',
        'setup.report.suggestions': '💡 **Góp ý:** Đã liên kết với <#{channel}>',
        'setup.report.verify': '🛡️ **Xác minh:** Đã ánh xạ tới <#{channel}>',
        'setup.report.logging': '🗂️ **Nhật ký thông minh:** Đã ánh xạ **{count}** kênh nhật ký.',
        'setup.report.tickets': '🎫 **Vé hỗ trợ:** Liên kết với `{open}` & `{closed}`',
        'setup.report.apps': '📝 **Đơn ứng tuyển:** Liên kết với danh mục `{category}`',
        'setup.report.boost': '🚀 **Theo dõi Boost:** Đã liên kết với <#{channel}>',
        'setup.report.loot': '🎁 **Hệ thống Rương:** Kích hoạt tại **{count}** kênh trò chuyện'
    },
    tr: {
        'welcome.title': '✨ {server} SUNUCUSUNA HOŞ GELDİNİZ! ✨',
        'welcome.desc': '💖 Merhaba {user}! Ailemize katıldığın için çok mutluyuz! Kuralları okumayı ve harika vakit geçirmeyi unutma. 🌟',
        'welcome.ping': '💫 Hoş geldin {user}! Rahatına bak ve keyfini çıkar! 🥂',
        'welcome.footer': '✨ {server} sunucusundaki yolculuğunun tadını çıkar! ✨',
        'welcome.member_field': '🌸 Topluluk Üyesi',
        'welcome.member_count': 'Değerli **#{count}**. üyemiz oldun! 🎉',
        'welcome.created_field': '✨ Hesap Açılışı',
        'music.controller_title': 'Müzik Denetleyicisi',
        'music.waiting_music': 'Müzik bekleniyor...\nBir şarkı adı veya bağlantısı gönderin',
        'music.queue_ended': '👎 Sıra bitti. Daha fazla şarkı eklemek için {play_cmd} komutunu kullanın!',
        'music.btn_down': 'Kıs',
        'music.btn_prev': 'Önceki',
        'music.btn_pause': 'Duraklat',
        'music.btn_resume': 'Devam Et',
        'music.btn_skip': 'Atla',
        'music.btn_up': 'Arttır',
        'music.btn_shuffle': 'Karıştır',
        'music.btn_autoplay': 'Otomatik Çal',
        'music.btn_stop': 'Durdur',
        'music.btn_dashboard': 'Web Paneli',
        'music.btn_queue': 'Sıra',
        'music.btn_like': 'Beğendim',
        'music.btn_dislike': 'Bana göre değil',
        'music.btn_block': 'Engelle',
        'music.btn_next_up': 'Sırada ne var?',
        'music.btn_connect': 'Botu Bağla',
        'music.btn_premium': 'Premium',
        'music.btn_vote': 'Oy Ver',
        'music.filter_placeholder': '🎧 Ses Filtresi / Efekt Seçin...',
        'avatar.title': '{user} Kullanıcısının Profil Fotoğrafı',
        'banner.title': '{user} Kullanıcısının Başlığı',
        'common.open_in_browser': 'Tarayıcıda Aç',
        'trivia.win_title': '🎉 Harika! Doğru Cevap!',
        'trivia.win_desc': '**{answer}** cevabını doğru bildin!\n\n✨ **Kazanılan:** `+150 Yıldız Tozu Kredisi`',
        'trivia.lose_title': '❌ Tam olarak değil!',
        'trivia.lose_desc': 'Doğru cevap **{answer}** idi!\nBir sonraki soruda bol şans!',
        'setname.success': '✅ Başarılı! Bu sunucu için tetikleyici kelimem **{name}** olarak değiştirildi!',
        'verify.btn': 'İnsanım (Doğrula)',
        'setup.report.identity': '⚙️ **Kimlik:** Tetikleyici kelime `{name}` olarak ayarlandı',
        'setup.report.welcome': '👋 **Karşılamalar:** <#{channel}> kanalına bağlandı',
        'setup.report.starboard': '⭐ **Starboard:** <#{channel}> kanalına bağlandı',
        'setup.report.suggestions': '💡 **Öneriler:** <#{channel}> kanalına bağlandı',
        'setup.report.verify': '🛡️ **Doğrulama:** <#{channel}> ile eşlendi',
        'setup.report.logging': '🗂️ **Akıllı Günlükler:** **{count}** kayıt kanalı eşlendi.',
        'setup.report.tickets': '🎫 **Destek Talepleri:** `{open}` ve `{closed}` ile eşlendi',
        'setup.report.apps': '📝 **Başvurular:** `{category}` kategorisine bağlandı',
        'setup.report.boost': '🚀 **Takviye Takipçisi:** <#{channel}> kanalına bağlandı',
        'setup.report.loot': '🎁 **Ganimet Motoru:** **{count}** sohbet kanalında etkinleştirildi'
    },
    ar: {
        'welcome.title': '✨ مرحبًا بك في {server}! ✨',
        'welcome.desc': '💖 أهلاً بك {user}! يسعدنا جدًا انضمامك إلى عائلتنا! تأكد من قراءة القوانين واستمتع بإقامتك معنا. 🌟',
        'welcome.ping': '💫 مرحبًا {user}! تفضل بالجلوس واستمتع بوقتك! 🥂',
        'welcome.footer': '✨ استمتع برحلتك الرائعة في {server}! ✨',
        'welcome.member_field': '🌸 عضو المجتمع',
        'welcome.member_count': 'أنت العضو المميز رقم **#{count}** لدينا! 🎉',
        'welcome.created_field': '✨ تاريخ إنشاء الحساب',
        'music.controller_title': 'وحدة التحكم بالموسيقى',
        'music.waiting_music': 'في انتظار الموسيقى...\nأرسل اسم أو رابط الأغنية',
        'music.queue_ended': '👎 انتهت قائمة الانتظار. استخدم {play_cmd} لإضافة المزيد من الموسيقى!',
        'music.btn_down': 'خفض',
        'music.btn_prev': 'السابق',
        'music.btn_pause': 'إيقاف مؤقت',
        'music.btn_resume': 'استئناف',
        'music.btn_skip': 'تخطي',
        'music.btn_up': 'رفع',
        'music.btn_shuffle': 'عشوائي',
        'music.btn_autoplay': 'تشغيل تلقائي',
        'music.btn_stop': 'إيقاف',
        'music.btn_dashboard': 'لوحة التحكم',
        'music.btn_queue': 'القائمة',
        'music.btn_like': 'إعجاب',
        'music.btn_dislike': 'لا يعجبني',
        'music.btn_block': 'حظر',
        'music.btn_next_up': 'ما التالي؟',
        'music.btn_connect': 'اتصال البوت',
        'music.btn_premium': 'بريميوم',
        'music.btn_vote': 'تصويت',
        'music.filter_placeholder': '🎧 اختر فلتر الصوت / المؤثرات...',
        'avatar.title': 'الصورة الرمزية لـ {user}',
        'banner.title': 'بانر {user}',
        'common.open_in_browser': 'فتح في المتصفح',
        'trivia.win_title': '🎉 رائع! إجابة صحيحة!',
        'trivia.win_desc': 'لقد حددت الإجابة الصحيحة **{answer}**!\n\n✨ **المكافأة:** `+150 رصيد غبار النجوم`',
        'trivia.lose_title': '❌ للأسف غير صحيح!',
        'trivia.lose_desc': 'الإجابة الصحيحة كانت **{answer}**!\nحظًا أوفر في السؤال القادم!',
        'setname.success': '✅ تم بنجاح! تم تغيير كلمة التشغيل الخاصة بي في هذا السيرفر إلى **{name}**!',
        'verify.btn': 'أنا لست روبوت (تحقق)',
        'setup.report.identity': '⚙️ **الهوية:** تم تعيين كلمة التشغيل على `{name}`',
        'setup.report.welcome': '👋 **الترحيب:** مرتبط بـ <#{channel}>',
        'setup.report.starboard': '⭐ **Starboard:** مرتبط بـ <#{channel}>',
        'setup.report.suggestions': '💡 **الاقتراحات:** مرتبط بـ <#{channel}>',
        'setup.report.verify': '🛡️ **التحقق:** مربوط بـ <#{channel}>',
        'setup.report.logging': '🗂️ **السجلات الذكية:** تم ربط **{count}** قنوات سجلات بنجاح.',
        'setup.report.tickets': '🎫 **التذاكر:** مربوطة بـ `{open}` و `{closed}`',
        'setup.report.apps': '📝 **التقديمات:** مربوطة بقسم `{category}`',
        'setup.report.boost': '🚀 **متتبع البوست:** مرتبط بـ <#{channel}>',
        'setup.report.loot': '🎁 **محرك الغنائم:** تم تفعيله في **{count}** قنوات دردشة'
    },
    ko: {
        'welcome.title': '✨ {server}에 오신 것을 환영합니다! ✨',
        'welcome.desc': '💖 안녕하세요 {user}님! 저희 가족이 되신 것을 진심으로 환영합니다! 규칙을 확인하시고 즐거운 시간 보내세요. 🌟',
        'welcome.ping': '💫 {user}님 환영합니다! 편안히 즐기세요! 🥂',
        'welcome.footer': '✨ {server}에서 즐거운 여행 되세요! ✨',
        'welcome.member_field': '🌸 커뮤니티 멤버',
        'welcome.member_count': '소중한 **#{count}**번째 멤버이십니다! 🎉',
        'welcome.created_field': '✨ 계정 생성일',
        'music.controller_title': '음악 컨트롤러',
        'music.waiting_music': '음악 대기 중...\n노래 제목이나 링크를 전송하세요',
        'music.queue_ended': '👎 대기열이 종료되었습니다. 음악을 더 추가하려면 {play_cmd} 명령어를 사용하세요!',
        'music.btn_down': '볼륨 낮춤',
        'music.btn_prev': '이전 곡',
        'music.btn_pause': '일시정지',
        'music.btn_resume': '재생',
        'music.btn_skip': '건너뛰기',
        'music.btn_up': '볼륨 높임',
        'music.btn_shuffle': '셔플',
        'music.btn_autoplay': '자동재생',
        'music.btn_stop': '정지',
        'music.btn_dashboard': '대시보드',
        'music.btn_queue': '대기열',
        'music.btn_like': '좋아요',
        'music.btn_dislike': '별로예요',
        'music.btn_block': '차단',
        'music.btn_next_up': '다음 곡은?',
        'music.btn_connect': '봇 연결',
        'music.btn_premium': '프리미엄',
        'music.btn_vote': '투표',
        'music.filter_placeholder': '🎧 오디오 필터 / 사운드 효과 선택...',
        'avatar.title': '{user}님의 아바타',
        'banner.title': '{user}님의 배너',
        'common.open_in_browser': '브라우저에서 열기',
        'trivia.win_title': '🎉 훌륭합니다! 정답입니다!',
        'trivia.win_desc': '정답인 **{answer}**을(를) 맞히셨습니다!\n\n✨ **획득:** `+150 스타더스트 크레딧`',
        'trivia.lose_title': '❌ 아쉽네요!',
        'trivia.lose_desc': '정답은 **{answer}**였습니다!\n다음 질문에서 도전해보세요!',
        'setname.success': '✅ 성공! 이 서버의 호출어가 **{name}**(으)로 변경되었습니다!',
        'verify.btn': '사람입니다 (인증)',
        'setup.report.identity': '⚙️ **식별:** 트리거 단어가 `{name}`(으)로 설정되었습니다',
        'setup.report.welcome': '👋 **환영:** <#{channel}> 채널에 연결됨',
        'setup.report.starboard': '⭐ **스타보드:** <#{channel}> 채널에 연결됨',
        'setup.report.suggestions': '💡 **제안:** <#{channel}> 채널에 연결됨',
        'setup.report.verify': '🛡️ **인증:** <#{channel}> 채널에 매핑됨',
        'setup.report.logging': '🗂️ **스마트 로깅:** **{count}**개 로그 채널 매핑 완료.',
        'setup.report.tickets': '🎫 **티켓:** `{open}` 및 `{closed}` 카테고리에 연결됨',
        'setup.report.apps': '📝 **신청서:** `{category}` 카테고리에 연결됨',
        'setup.report.boost': '🚀 **부스트 추적:** <#{channel}> 채널에 연결됨',
        'setup.report.loot': '🎁 **전리품 상자:** **{count}**개 채팅 채널에서 활성화됨'
    }
};

// Merge extended translations into main catalog
for (const [lang, dict] of Object.entries(EXTENDED_TRANSLATIONS)) {
    if (TRANSLATIONS[lang]) {
        Object.assign(TRANSLATIONS[lang], dict);
    }
}

const ADDITIONAL_TRANSLATIONS = {
    en: {
        "music.btn_loop": "Loop",
        "music.btn_voldown": "Vol -",
        "music.btn_volup": "Vol +",
        "music.btn_lockvc": "Lock VC",
        "music.btn_unlockvc": "Unlock VC",
        "music.now_playing_desc_hint": "Use the interactive controls below to manage your audio session.",
        "banner.no_banner": "{user} does not have a custom profile banner.",
        "trivia.timeout_title": "⌛ Time Expired!",
        "trivia.timeout_desc": "Time ran out! The correct answer was **{answer}**.",
        "goodbye.preview_title": "🥀 FAREWELL, TRAVELER (Preview) 🥀",
        "goodbye.title": "🥀 FAREWELL, TRAVELER 🥀",
        "goodbye.desc": "👋 **{user}** has departed from **{server}**. We wish you the absolute best on your future adventures! 🌠",
        "goodbye.preview_content": "🕊️ Goodbye **{user}**! Until we meet again... *(Setup Preview)*",
        "goodbye.content": "🕊️ Goodbye **{user}**! Wishing you the best on your journey.",
        "goodbye.census_field": "📊 Server Census",
        "goodbye.census_value": "We are now down to **{count}** members.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Safe travels!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Setup Preview Mode",
        "goodbye.setup_success": "✅ **Success!** Aesthetic goodbye cards will now be sent to {channel}!",
        "setup.report.goodbye": "• 🥀 **Goodbye / Farewell:** Linked to <#{channel}>",
        "welcome.control_panel_title": "🎨 Welcome Customizer & Manager | {guild}",
        "welcome.btn_text": "Edit Title & Text",
        "welcome.btn_media": "Edit Banner & Thumb",
        "welcome.btn_style": "Edit Style & Footer",
        "welcome.btn_ping": "Edit Ping Header",
        "welcome.btn_preview": "Test Preview Card",
        "welcome.setup_success": "✅ **Welcome channel set to {channel}!** Use the Embed Manager below to customize layout:"
    },
    es: {
        "music.btn_loop": "Bucle",
        "music.btn_voldown": "Vol -",
        "music.btn_volup": "Vol +",
        "music.btn_lockvc": "Bloquear VC",
        "music.btn_unlockvc": "Desbloquear VC",
        "music.now_playing_desc_hint": "Usa los controles interactivos a continuación para gestionar tu sesión de audio.",
        "banner.no_banner": "{user} no tiene un banner de perfil personalizado.",
        "trivia.timeout_title": "⌛ ¡Tiempo Agotado!",
        "trivia.timeout_desc": "¡Se acabó el tiempo! La respuesta correcta era **{answer}**.",
        "goodbye.preview_title": "🥀 HASTA PRONTO, VIAJERO (Vista previa) 🥀",
        "goodbye.title": "🥀 HASTA PRONTO, VIAJERO 🥀",
        "goodbye.desc": "👋 **{user}** ha partido de **{server}**. ¡Te deseamos lo mejor en tus futuras aventuras! 🌠",
        "goodbye.preview_content": "🕊️ ¡Adiós **{user}**! Hasta que nos volvamos a encontrar... *(Vista previa)*",
        "goodbye.content": "🕊️ ¡Adiós **{user}**! Te deseamos lo mejor en tu viaje.",
        "goodbye.census_field": "📊 Censo del Servidor",
        "goodbye.census_value": "Ahora somos **{count}** miembros.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • ¡Buen viaje!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Modo de vista previa de configuración",
        "goodbye.setup_success": "✅ **¡Éxito!** ¡Las tarjetas de despedida se enviarán a {channel}!",
        "setup.report.goodbye": "• 🥀 **Despedidas:** Vinculado a <#{channel}>",
        "welcome.control_panel_title": "🎨 Personalizador y Administrador de Bienvenidas | {guild}",
        "welcome.btn_text": "Editar título y texto",
        "welcome.btn_media": "Editar banner y miniatura",
        "welcome.btn_style": "Editar estilo y pie de página",
        "welcome.btn_ping": "Editar encabezado de mención",
        "welcome.btn_preview": "Probar tarjeta de vista previa",
        "welcome.setup_success": "✅ **¡Canal de bienvenida configurado en {channel}!** Usa el gestor a continuación para personalizarlo:"
    },
    pt: {
        "music.btn_loop": "Repetir",
        "music.btn_voldown": "Vol -",
        "music.btn_volup": "Vol +",
        "music.btn_lockvc": "Bloquear VC",
        "music.btn_unlockvc": "Desbloquear VC",
        "music.now_playing_desc_hint": "Use os controles interativos abaixo para gerenciar sua sessão de áudio.",
        "banner.no_banner": "{user} não possui um banner de perfil personalizado.",
        "trivia.timeout_title": "⌛ Tempo Esgotado!",
        "trivia.timeout_desc": "O tempo acabou! A resposta correta era **{answer}**.",
        "goodbye.preview_title": "🥀 ADEUS, VIAJANTE (Pré-visualização) 🥀",
        "goodbye.title": "🥀 ADEUS, VIAJANTE 🥀",
        "goodbye.desc": "👋 **{user}** partiu de **{server}**. Desejamos tudo de bom em suas futuras aventuras! 🌠",
        "goodbye.preview_content": "🕊️ Adeus **{user}**! Até nos encontrarmos novamente... *(Pré-visualização)*",
        "goodbye.content": "🕊️ Adeus **{user}**! Desejamos o melhor em sua jornada.",
        "goodbye.census_field": "📊 Censo do Servidor",
        "goodbye.census_value": "Agora temos **{count}** membros.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Boa viagem!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Modo de pré-visualização",
        "goodbye.setup_success": "✅ **Sucesso!** Os cartões de despedida serão enviados para {channel}!",
        "setup.report.goodbye": "• 🥀 **Despedidas:** Vinculado a <#{channel}>",
        "welcome.control_panel_title": "🎨 Personalizador e Gerenciador de Boas-Vindas | {guild}",
        "welcome.btn_text": "Editar título e texto",
        "welcome.btn_media": "Editar banner e miniatura",
        "welcome.btn_style": "Editar estilo e rodapé",
        "welcome.btn_ping": "Editar cabeçalho de menção",
        "welcome.btn_preview": "Testar cartão de pré-visualização",
        "welcome.setup_success": "✅ **Canal de boas-vindas definido para {channel}!** Use o painel abaixo para personalizar:"
    },
    ja: {
        "music.btn_loop": "ループ",
        "music.btn_voldown": "音量 -",
        "music.btn_volup": "音量 +",
        "music.btn_lockvc": "VCをロック",
        "music.btn_unlockvc": "VCロック解除",
        "music.now_playing_desc_hint": "下のボタンを使って音楽セッションを操作してください。",
        "banner.no_banner": "{user}はカスタムプロフィールバナーを設定していません。",
        "trivia.timeout_title": "⌛ 時間切れ！",
        "trivia.timeout_desc": "時間切れです！ 正解は **{answer}** でした。",
        "goodbye.preview_title": "🥀 さようなら、旅人よ (プレビュー) 🥀",
        "goodbye.title": "🥀 さようなら、旅人よ 🥀",
        "goodbye.desc": "👋 **{user}** が **{server}** から旅立ちました。今後の冒険での幸運を心より祈っています！🌠",
        "goodbye.preview_content": "🕊️ さようなら **{user}**！また会う日まで... *(セットアッププレビュー)*",
        "goodbye.content": "🕊️ さようなら **{user}**！旅路の無事を祈っています。",
        "goodbye.census_field": "📊 サーバーの住民数",
        "goodbye.census_value": "メンバー数は **{count}** 人になりました。",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • 良い旅を！",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • セットアッププレビューモード",
        "goodbye.setup_success": "✅ **成功！** お別れカードが {channel} に送信されるようになりました！",
        "setup.report.goodbye": "• 🥀 **お別れメッセージ:** <#{channel}> にリンクされました",
        "welcome.control_panel_title": "🎨 ウェルカムカスタマイザー＆マネージャー | {guild}",
        "welcome.btn_text": "タイトルとテキストを編集",
        "welcome.btn_media": "バナーとサムネイルを編集",
        "welcome.btn_style": "スタイルとフッターを編集",
        "welcome.btn_ping": "メンションヘッダーを編集",
        "welcome.btn_preview": "プレビューカードをテスト",
        "welcome.setup_success": "✅ **ウェルカムチャンネルを {channel} に設定しました！** 下のボタンでカスタマイズしてください："
    },
    hi: {
        "music.btn_loop": "लूप",
        "music.btn_voldown": "आवाज़ -",
        "music.btn_volup": "आवाज़ +",
        "music.btn_lockvc": "VC लॉक करें",
        "music.btn_unlockvc": "VC अनलॉक करें",
        "music.now_playing_desc_hint": "अपने ऑडियो सत्र को नियंत्रित करने के लिए नीचे दिए गए बटनों का उपयोग करें।",
        "banner.no_banner": "{user} के पास कोई कस्टम प्रोफ़ाइल बैनर नहीं है।",
        "trivia.timeout_title": "⌛ समय समाप्त!",
        "trivia.timeout_desc": "समय समाप्त हो गया! सही उत्तर **{answer}** था।",
        "goodbye.preview_title": "🥀 अलविदा, यात्री (पूर्वावलोकन) 🥀",
        "goodbye.title": "🥀 अलविदा, यात्री 🥀",
        "goodbye.desc": "👋 **{user}** ने **{server}** छोड़ दिया है। हम आपकी आगे की यात्रा के लिए शुभकामनाएं देते हैं! 🌠",
        "goodbye.preview_content": "🕊️ अलविदा **{user}**! फिर मिलेंगे... *(सेटअप पूर्वावलोकन)*",
        "goodbye.content": "🕊️ अलविदा **{user}**! आपकी यात्रा मंगलमय हो।",
        "goodbye.census_field": "📊 सर्वर जनगणना",
        "goodbye.census_value": "अब हमारे पास **{count}** सदस्य बचे हैं।",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • यात्रा मंगलमय हो!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • सेटअप पूर्वावलोकन मोड",
        "goodbye.setup_success": "✅ **सफलता!** विदाई कार्ड अब {channel} में भेजे जाएंगे!",
        "setup.report.goodbye": "• 🥀 **अलविदा / विदाई:** <#{channel}> से लिंक किया गया",
        "welcome.control_panel_title": "🎨 स्वागत कस्टमाइज़र और प्रबंधक | {guild}",
        "welcome.btn_text": "शीर्षक और पाठ संपादित करें",
        "welcome.btn_media": "बैनर और थंबनेल संपादित करें",
        "welcome.btn_style": "शैली और पाद लेख संपादित करें",
        "welcome.btn_ping": "पिंग हेडर संपादित करें",
        "welcome.btn_preview": "पूर्वावलोकन कार्ड का परीक्षण करें",
        "welcome.setup_success": "✅ **स्वागत चैनल {channel} पर सेट किया गया!** नीचे दिए गए बटनों से कस्टमाइज़ करें:"
    },
    fr: {
        "music.btn_loop": "Boucle",
        "music.btn_voldown": "Vol -",
        "music.btn_volup": "Vol +",
        "music.btn_lockvc": "Verrouiller VC",
        "music.btn_unlockvc": "Déverrouiller VC",
        "music.now_playing_desc_hint": "Utilisez les commandes interactives ci-dessous pour gérer votre session audio.",
        "banner.no_banner": "{user} n'a pas de bannière de profil personnalisée.",
        "trivia.timeout_title": "⌛ Temps Écoulé !",
        "trivia.timeout_desc": "Le temps est écoulé ! La bonne réponse était **{answer}**.",
        "goodbye.preview_title": "🥀 ADIEU, VOYAGEUR (Aperçu) 🥀",
        "goodbye.title": "🥀 ADIEU, VOYAGEUR 🥀",
        "goodbye.desc": "👋 **{user}** a quitté **{server}**. Nous vous souhaitons le meilleur pour vos futures aventures ! 🌠",
        "goodbye.preview_content": "🕊️ Au revoir **{user}** ! Jusqu'à ce que nous nous revoyions... *(Aperçu)*",
        "goodbye.content": "🕊️ Au revoir **{user}** ! En vous souhaitant le meilleur dans votre voyage.",
        "goodbye.census_field": "📊 Recensement du serveur",
        "goodbye.census_value": "Nous sommes désormais **{count}** membres.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Bon voyage !",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Mode aperçu de configuration",
        "goodbye.setup_success": "✅ **Succès !** Les cartes d'adieu seront désormais envoyées dans {channel} !",
        "setup.report.goodbye": "• 🥀 **Adieux / Départs :** Lié à <#{channel}>",
        "welcome.control_panel_title": "🎨 Personnalisation et gestion de bienvenue | {guild}",
        "welcome.btn_text": "Modifier titre et texte",
        "welcome.btn_media": "Modifier bannière et miniature",
        "welcome.btn_style": "Modifier style et pied de page",
        "welcome.btn_ping": "Modifier l'en-tête de mention",
        "welcome.btn_preview": "Tester la carte d'aperçu",
        "welcome.setup_success": "✅ **Salon de bienvenue défini sur {channel} !** Utilisez les boutons ci-dessous pour personnaliser :"
    },
    de: {
        "music.btn_loop": "Schleife",
        "music.btn_voldown": "Lautstärke -",
        "music.btn_volup": "Lautstärke +",
        "music.btn_lockvc": "VC Sperren",
        "music.btn_unlockvc": "VC Entsperren",
        "music.now_playing_desc_hint": "Verwende die interaktiven Steuerelemente unten, um deine Audiositzung zu verwalten.",
        "banner.no_banner": "{user} hat kein benutzerdefiniertes Profilbanner.",
        "trivia.timeout_title": "⌛ Zeit Abgelaufen!",
        "trivia.timeout_desc": "Die Zeit ist um! Die richtige Antwort war **{answer}**.",
        "goodbye.preview_title": "🥀 LEBE WOHL, REISENDER (Vorschau) 🥀",
        "goodbye.title": "🥀 LEBE WOHL, REISENDER 🥀",
        "goodbye.desc": "👋 **{user}** hat **{server}** verlassen. Wir wünschen dir das Beste für deine zukünftigen Abenteuer! 🌠",
        "goodbye.preview_content": "🕊️ Auf Wiedersehen **{user}**! Bis wir uns wiedersehen... *(Vorschau)*",
        "goodbye.content": "🕊️ Auf Wiedersehen **{user}**! Wir wünschen dir das Beste auf deiner Reise.",
        "goodbye.census_field": "📊 Server-Zensus",
        "goodbye.census_value": "Wir sind jetzt auf **{count}** Mitglieder geschrumpft.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Gute Reise!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Einrichtungs-Vorschau-Modus",
        "goodbye.setup_success": "✅ **Erfolg!** Abschiedskarten werden nun an {channel} gesendet!",
        "setup.report.goodbye": "• 🥀 **Abschiede:** Verknüpft mit <#{channel}>",
        "welcome.control_panel_title": "🎨 Willkommens-Customizer & Manager | {guild}",
        "welcome.btn_text": "Titel und Text bearbeiten",
        "welcome.btn_media": "Banner und Miniaturansicht bearbeiten",
        "welcome.btn_style": "Stil und Fußzeile bearbeiten",
        "welcome.btn_ping": "Ping-Header bearbeiten",
        "welcome.btn_preview": "Vorschau-Karte testen",
        "welcome.setup_success": "✅ **Willkommenskanal auf {channel} festgelegt!** Nutze die Schaltflächen unten zum Anpassen:"
    },
    ru: {
        "music.btn_loop": "Повтор",
        "music.btn_voldown": "Громк -",
        "music.btn_volup": "Громк +",
        "music.btn_lockvc": "Закрыть VC",
        "music.btn_unlockvc": "Открыть VC",
        "music.now_playing_desc_hint": "Используйте кнопки ниже для управления воспроизведением.",
        "banner.no_banner": "У {user} нет пользовательского баннера профиля.",
        "trivia.timeout_title": "⌛ Время вышло!",
        "trivia.timeout_desc": "Время вышло! Правильный ответ был **{answer}**.",
        "goodbye.preview_title": "🥀 ПРОЩАЙ, ПУТНИК (Предпросмотр) 🥀",
        "goodbye.title": "🥀 ПРОЩАЙ, ПУТНИК 🥀",
        "goodbye.desc": "👋 **{user}** покинул **{server}**. Желаем всего наилучшего в будущих приключениях! 🌠",
        "goodbye.preview_content": "🕊️ Прощай, **{user}**! До новых встреч... *(Предпросмотр)*",
        "goodbye.content": "🕊️ Прощай, **{user}**! Желаем легкого пути.",
        "goodbye.census_field": "📊 Перепись сервера",
        "goodbye.census_value": "Теперь нас **{count}** участников.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Счастливого пути!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Режим предпросмотра настройки",
        "goodbye.setup_success": "✅ **Успешно!** Прощальные карточки теперь будут отправляться в {channel}!",
        "setup.report.goodbye": "• 🥀 **Прощания:** Привязано к <#{channel}>",
        "welcome.control_panel_title": "🎨 Настройка и управление приветствиями | {guild}",
        "welcome.btn_text": "Изменить заголовок и текст",
        "welcome.btn_media": "Изменить баннер и миниатюру",
        "welcome.btn_style": "Изменить стиль и нижний колонтитул",
        "welcome.btn_ping": "Изменить заголовок упоминания",
        "welcome.btn_preview": "Тест предпросмотра карточки",
        "welcome.setup_success": "✅ **Канал приветствий установлен на {channel}!** Используйте кнопки ниже для настройки:"
    },
    id: {
        "music.btn_loop": "Ulangi",
        "music.btn_voldown": "Vol -",
        "music.btn_volup": "Vol +",
        "music.btn_lockvc": "Kunci VC",
        "music.btn_unlockvc": "Buka Kunci VC",
        "music.now_playing_desc_hint": "Gunakan tombol kontrol di bawah untuk mengatur sesi audio Anda.",
        "banner.no_banner": "{user} tidak memiliki banner profil kustom.",
        "trivia.timeout_title": "⌛ Waktu Habis!",
        "trivia.timeout_desc": "Waktu telah habis! Jawaban yang benar adalah **{answer}**.",
        "goodbye.preview_title": "🥀 SELAMAT JALAN, PENGEMBARA (Pratinjau) 🥀",
        "goodbye.title": "🥀 SELAMAT JALAN, PENGEMBARA 🥀",
        "goodbye.desc": "👋 **{user}** telah meninggalkan **{server}**. Kami mendoakan yang terbaik untuk petualanganmu selanjutnya! 🌠",
        "goodbye.preview_content": "🕊️ Selamat jalan **{user}**! Sampai jumpa lagi... *(Pratinjau)*",
        "goodbye.content": "🕊️ Selamat jalan **{user}**! Semoga perjalananmu menyenangkan.",
        "goodbye.census_field": "📊 Sensus Server",
        "goodbye.census_value": "Jumlah anggota sekarang tinggal **{count}** orang.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Semoga selamat di jalan!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Mode Pratinjau Pengaturan",
        "goodbye.setup_success": "✅ **Sukses!** Kartu perpisahan estetis sekarang akan dikirim ke {channel}!",
        "setup.report.goodbye": "• 🥀 **Perpisahan:** Terhubung ke <#{channel}>",
        "welcome.control_panel_title": "🎨 Pengelola & Penyesuai Sambutan | {guild}",
        "welcome.btn_text": "Edit Judul & Teks",
        "welcome.btn_media": "Edit Banner & Gambar Kecil",
        "welcome.btn_style": "Edit Gaya & Footer",
        "welcome.btn_ping": "Edit Header Ping",
        "welcome.btn_preview": "Uji Kartu Pratinjau",
        "welcome.setup_success": "✅ **Saluran sambutan disetel ke {channel}!** Gunakan tombol di bawah untuk menyesuaikan:"
    },
    it: {
        "music.btn_loop": "Ripeti",
        "music.btn_voldown": "Vol -",
        "music.btn_volup": "Vol +",
        "music.btn_lockvc": "Blocca VC",
        "music.btn_unlockvc": "Sblocca VC",
        "music.now_playing_desc_hint": "Usa i controlli interattivi qui sotto per gestire la tua sessione audio.",
        "banner.no_banner": "{user} non ha un banner di profilo personalizzato.",
        "trivia.timeout_title": "⌛ Tempo Scaduto!",
        "trivia.timeout_desc": "Il tempo è scaduto! La risposta corretta era **{answer}**.",
        "goodbye.preview_title": "🥀 ADDIO, VIAGGIATORE (Anteprima) 🥀",
        "goodbye.title": "🥀 ADDIO, VIAGGIATORE 🥀",
        "goodbye.desc": "👋 **{user}** ha lasciato **{server}**. Ti auguriamo il meglio per le tue future avventure! 🌠",
        "goodbye.preview_content": "🕊️ Addio **{user}**! Alla prossima... *(Anteprima)*",
        "goodbye.content": "🕊️ Addio **{user}**! Ti auguriamo il meglio per il tuo cammino.",
        "goodbye.census_field": "📊 Censimento del Server",
        "goodbye.census_value": "Siamo ora scesi a **{count}** membri.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Buon viaggio!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Modalità anteprima configurazione",
        "goodbye.setup_success": "✅ **Operazione riuscita!** Le schede di addio verranno ora inviate a {channel}!",
        "setup.report.goodbye": "• 🥀 **Addio:** Collegato a <#{channel}>",
        "welcome.control_panel_title": "🎨 Gestore e Personalizzatore di Benvenuto | {guild}",
        "welcome.btn_text": "Modifica titolo e testo",
        "welcome.btn_media": "Modifica banner e miniatura",
        "welcome.btn_style": "Modifica stile e piè di pagina",
        "welcome.btn_ping": "Modifica intestazione di menzione",
        "welcome.btn_preview": "Prova scheda di anteprima",
        "welcome.setup_success": "✅ **Canale di benvenuto impostato su {channel}!** Usa i pulsanti sottostanti per personalizzare:"
    },
    vi: {
        "music.btn_loop": "Lặp lại",
        "music.btn_voldown": "Âm lượng -",
        "music.btn_volup": "Âm lượng +",
        "music.btn_lockvc": "Khóa VC",
        "music.btn_unlockvc": "Mở khóa VC",
        "music.now_playing_desc_hint": "Sử dụng các nút điều khiển bên dưới để quản lý phiên âm thanh của bạn.",
        "banner.no_banner": "{user} không có banner hồ sơ tùy chỉnh.",
        "trivia.timeout_title": "⌛ Hết giờ!",
        "trivia.timeout_desc": "Đã hết thời gian! Đáp án chính xác là **{answer}**.",
        "goodbye.preview_title": "🥀 TẠM BIỆT, LỮ KHÁCH (Xem trước) 🥀",
        "goodbye.title": "🥀 TẠM BIỆT, LỮ KHÁCH 🥀",
        "goodbye.desc": "👋 **{user}** đã rời khỏi **{server}**. Chúc bạn những điều tuyệt vời nhất trên hành trình tiếp theo! 🌠",
        "goodbye.preview_content": "🕊️ Tạm biệt **{user}**! Hẹn gặp lại... *(Xem trước)*",
        "goodbye.content": "🕊️ Tạm biệt **{user}**! Chúc bạn mọi điều tốt đẹp trên hành trình.",
        "goodbye.census_field": "📊 Thống kê máy chủ",
        "goodbye.census_value": "Số thành viên hiện tại còn **{count}** người.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • Thượng lộ bình an!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Chế độ xem trước thiết lập",
        "goodbye.setup_success": "✅ **Thành công!** Thẻ tạm biệt thẩm mỹ sẽ được gửi tới {channel}!",
        "setup.report.goodbye": "• 🥀 **Tạm biệt:** Đã liên kết với <#{channel}>",
        "welcome.control_panel_title": "🎨 Trình quản lý & tùy chỉnh lời chào mừng | {guild}",
        "welcome.btn_text": "Sửa tiêu đề & văn bản",
        "welcome.btn_media": "Sửa biểu ngữ & hình thu nhỏ",
        "welcome.btn_style": "Sửa kiểu dáng & chân trang",
        "welcome.btn_ping": "Sửa tiêu đề nhắc đến",
        "welcome.btn_preview": "Thử nghiệm thẻ xem trước",
        "welcome.setup_success": "✅ **Kênh chào mừng đã được đặt thành {channel}!** Dùng các nút bên dưới để tùy chỉnh:"
    },
    tr: {
        "music.btn_loop": "Döngü",
        "music.btn_voldown": "Ses -",
        "music.btn_volup": "Ses +",
        "music.btn_lockvc": "VC Kilitle",
        "music.btn_unlockvc": "VC Kilidi Aç",
        "music.now_playing_desc_hint": "Ses oturumunuzu yönetmek için aşağıdaki etkileşimli kontrolleri kullanın.",
        "banner.no_banner": "{user} kullanıcısının özel profil afişi yok.",
        "trivia.timeout_title": "⌛ Süre Doldu!",
        "trivia.timeout_desc": "Süre bitti! Doğru cevap: **{answer}**.",
        "goodbye.preview_title": "🥀 ELVEDA, YOLCU (Önizleme) 🥀",
        "goodbye.title": "🥀 ELVEDA, YOLCU 🥀",
        "goodbye.desc": "👋 **{user}**, **{server}** sunucusundan ayrıldı. Gelecek maceralarında bol şans dileriz! 🌠",
        "goodbye.preview_content": "🕊️ Hoşça kal **{user}**! Tekrar görüşmek üzere... *(Önizleme)*",
        "goodbye.content": "🕊️ Hoşça kal **{user}**! Yolculuğunda başarılar dileriz.",
        "goodbye.census_field": "📊 Sunucu Nüfusu",
        "goodbye.census_value": "Şu an **{count}** üyeye düştük.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • İyi yolculuklar!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • Kurulum Önizleme Modu",
        "goodbye.setup_success": "✅ **Başarılı!** Estetik veda kartları artık {channel} kanalına gönderilecek!",
        "setup.report.goodbye": "• 🥀 **Veda / Ayrılış:** <#{channel}> kanalına bağlandı",
        "welcome.control_panel_title": "🎨 Karşılama Özelleştirici ve Yöneticisi | {guild}",
        "welcome.btn_text": "Başlık ve Metni Düzenle",
        "welcome.btn_media": "Başlık ve Küçük Resmi Düzenle",
        "welcome.btn_style": "Stil ve Altbilgiyi Düzenle",
        "welcome.btn_ping": "Ping Başlığını Düzenle",
        "welcome.btn_preview": "Önizleme Kartını Test Et",
        "welcome.setup_success": "✅ **Hoş geldin kanalı {channel} olarak ayarlandı!** Düzenlemek için aşağıdaki butonları kullanın:"
    },
    ar: {
        "music.btn_loop": "تكرار",
        "music.btn_voldown": "الصوت -",
        "music.btn_volup": "الصوت +",
        "music.btn_lockvc": "قفل الروم",
        "music.btn_unlockvc": "إلغاء قفل الروم",
        "music.now_playing_desc_hint": "استخدم أزرار التحكم التفاعلية أدناه لإدارة جلسة الصوت.",
        "banner.no_banner": "{user} ليس لديه لافتة ملف شخصي مخصصة.",
        "trivia.timeout_title": "⌛ انتهى الوقت!",
        "trivia.timeout_desc": "انتهى الوقت! الإجابة الصحيحة كانت **{answer}**.",
        "goodbye.preview_title": "🥀 وداعاً أيها المسافر (معاينة) 🥀",
        "goodbye.title": "🥀 وداعاً أيها المسافر 🥀",
        "goodbye.desc": "👋 لقد غادر **{user}** من **{server}**. نتمنى لك كل التوفيق في مغامراتك القادمة! 🌠",
        "goodbye.preview_content": "🕊️ وداعاً **{user}**! حتى نلتقي مجدداً... *(معاينة)*",
        "goodbye.content": "🕊️ وداعاً **{user}**! نتمنى لك رحلة موفقة.",
        "goodbye.census_field": "📊 إحصاء السيرفر",
        "goodbye.census_value": "لقد أصبحنا الآن **{count}** عضواً.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • رحلة آمنة!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • وضع معاينة الإعداد",
        "goodbye.setup_success": "✅ **نجاح!** سيتم الآن إرسال بطاقات الوداع إلى {channel}!",
        "setup.report.goodbye": "• 🥀 **الوداع:** مرتبط بـ <#{channel}>",
        "welcome.control_panel_title": "🎨 مخصص ومدير الترحيب | {guild}",
        "welcome.btn_text": "تعديل العنوان والنص",
        "welcome.btn_media": "تعديل البانر والصورة المصغرة",
        "welcome.btn_style": "تعديل النمط والتذييل",
        "welcome.btn_ping": "تعديل رأس الإشارة",
        "welcome.btn_preview": "اختبار بطاقة المعاينة",
        "welcome.setup_success": "✅ **تم تعيين قناة الترحيب إلى {channel}!** استخدم الأزرار أدناه للتخصيص:"
    },
    ko: {
        "music.btn_loop": "반복",
        "music.btn_voldown": "음량 -",
        "music.btn_volup": "음량 +",
        "music.btn_lockvc": "음성채널 잠금",
        "music.btn_unlockvc": "음성채널 해제",
        "music.now_playing_desc_hint": "아래의 대화형 컨트롤을 사용하여 오디오 세션을 제어하세요.",
        "banner.no_banner": "{user}님은 커스텀 프로필 배너를 설정하지 않았습니다.",
        "trivia.timeout_title": "⌛ 시간 초과!",
        "trivia.timeout_desc": "시간이 초과되었습니다! 정답은 **{answer}**였습니다.",
        "goodbye.preview_title": "🥀 안녕히 가세요, 여행자여 (미리보기) 🥀",
        "goodbye.title": "🥀 안녕히 가세요, 여행자여 🥀",
        "goodbye.desc": "👋 **{user}**님이 **{server}**에서 떠났습니다. 앞으로의 여정에 행운이 가득하길 바랍니다! 🌠",
        "goodbye.preview_content": "🕊️ 안녕히 가세요 **{user}**님! 다시 만날 때까지... *(미리보기)*",
        "goodbye.content": "🕊️ 안녕히 가세요 **{user}**님! 앞으로의 여정을 응원합니다.",
        "goodbye.census_field": "📊 서버 인구 조사",
        "goodbye.census_value": "이제 멤버 수가 **{count}**명이 되었습니다.",
        "goodbye.footer": "🥀 Starry Aesthetic Goodbye System • 안전한 여행 되세요!",
        "goodbye.footer_preview": "🥀 Starry Aesthetic Goodbye System • 설정 미리보기 모드",
        "goodbye.setup_success": "✅ **성공!** 이제 {channel}에 작별 인사가 전송됩니다!",
        "setup.report.goodbye": "• 🥀 **작별 인사:** <#{channel}> 채널에 연결됨",
        "welcome.control_panel_title": "🎨 환영 메시지 커스텀 관리자 | {guild}",
        "welcome.btn_text": "제목 및 텍스트 수정",
        "welcome.btn_media": "배너 및 썸네일 수정",
        "welcome.btn_style": "스타일 및 바닥글 수정",
        "welcome.btn_ping": "호출 헤더 수정",
        "welcome.btn_preview": "미리보기 카드 테스트",
        "welcome.setup_success": "✅ **환영 채널이 {channel}(으)로 설정되었습니다!** 아래 버튼을 사용하여 레이아웃을 맞춤설정하세요:"
    }
};

for (const [lang, dict] of Object.entries(ADDITIONAL_TRANSLATIONS)) {
    if (TRANSLATIONS[lang]) {
        Object.assign(TRANSLATIONS[lang], dict);
    }
}


/**
 * Returns localized default strings for Welcome configuration
 * @param {string} lang 
 * @param {string} serverName 
 */
function getWelcomeDefaults(lang = 'en', serverName = '{server}') {
    return {
        title: t(lang, 'welcome.title', { server: serverName }),
        description: t(lang, 'welcome.desc', { user: '{user}', server: serverName }),
        pingContent: t(lang, 'welcome.ping', { user: '{user}', server: serverName }),
        footer: t(lang, 'welcome.footer', { server: serverName }),
        memberField: t(lang, 'welcome.member_field'),
        memberCount: t(lang, 'welcome.member_count', { count: '{count}' }),
        createdField: t(lang, 'welcome.created_field')
    };
}

/**
 * Translates standard UI texts, titles, buttons, and notices
 * @param {string} text 
 * @param {string} lang 
 */
function localizeText(text, lang = 'en') {
    if (!text || typeof text !== 'string' || !lang || lang === 'en') return text;

    let result = text;

    // Pattern 1: Avatar for <user>
    result = result.replace(/Avatar for (.+)/i, (_, user) => t(lang, 'avatar.title', { user }));
    // Pattern 2: Banner for <user>
    result = result.replace(/Banner for (.+)/i, (_, user) => t(lang, 'banner.title', { user }));
    // Pattern 2b: <user> does not have a custom profile banner.
    result = result.replace(/(?:\*\*)?([^*]+?)(?:\*\*)?\s+does not have a custom profile banner\./i, (_, user) => t(lang, 'banner.no_banner', { user: `**${user.trim()}**` }));
    // Pattern 3: Not Quite!
    result = result.replace(/Not Quite!/i, t(lang, 'trivia.lose_title').replace(/^[❌\s]+/, ''));
    // Pattern 4: The correct answer was **<ans>**!\nBetter luck on the next question!
    result = result.replace(/The correct answer was (?:\*\*)?([^*!\n]+)(?:\*\*)?!\s*Better luck on the next question!/i, (_, ans) => t(lang, 'trivia.lose_desc', { answer: ans }));
    // Pattern 5: Brilliant! Correct Answer!
    result = result.replace(/Brilliant! Correct Answer!/i, t(lang, 'trivia.win_title').replace(/^[🎉\s]+/, ''));
    // Pattern 5b: You correctly identified **<ans>**!
    result = result.replace(/You correctly identified (?:\*\*)?([^*!\n]+)(?:\*\*)?![\s\S]*?\+\$150 Stardust Credits`/i, (_, ans) => t(lang, 'trivia.win_desc', { answer: ans }));
    // Pattern 5c: Time Expired
    result = result.replace(/Time ran out! The correct answer was (?:\*\*)?([^*!\n]+)(?:\*\*)?\./i, (_, ans) => t(lang, 'trivia.timeout_desc', { answer: ans }));
    result = result.replace(/Time Expired!/i, t(lang, 'trivia.timeout_title').replace(/^[⌛\s]+/, ''));
    // Pattern 6: Success! My trigger word for this server has been changed to **<name>**!
    result = result.replace(/Success! My trigger word for this server has been changed to (?:\*\*)?([^*!]+)(?:\*\*)?!/i, (_, n) => t(lang, 'setname.success', { name: n }));
    // Pattern 7: The queue has ended. Use ,play <song> to queue more music!
    result = result.replace(/(?:📭|👎)?\s*(?:\*\*)?The queue has ended\.(?:\*\*)?\s*Use\s+(`?,\w+\s*<[^>]+>`?)\s+to queue more music!/i, (_, cmd) => t(lang, 'music.queue_ended', { play_cmd: cmd }));
    // Pattern 8: Waiting for music...\nSend the name or link of a music
    result = result.replace(/Waiting for music\.\.\.\s*Send the name or link of a music/i, t(lang, 'music.waiting_music'));
    // Pattern 9: Music Controller
    result = result.replace(/^Music Controller$/i, t(lang, 'music.controller_title'));
    // Pattern 10: Interactive controls hint
    result = result.replace(/Use the interactive controls below to manage your audio session\./i, t(lang, 'music.now_playing_desc_hint'));

    // Common Buttons mapping
    const buttonMap = {
        'Open in Browser': 'common.open_in_browser',
        'Down': 'music.btn_down',
        'Previous': 'music.btn_prev',
        'Pause': 'music.btn_pause',
        'Resume': 'music.btn_resume',
        'Skip': 'music.btn_skip',
        'Up': 'music.btn_up',
        'Shuffle': 'music.btn_shuffle',
        'AutoPlay': 'music.btn_autoplay',
        'Stop': 'music.btn_stop',
        'Dashboard': 'music.btn_dashboard',
        'Queue': 'music.btn_queue',
        'Like': 'music.btn_like',
        'Not for me': 'music.btn_dislike',
        'Block': 'music.btn_block',
        "What's next?": 'music.btn_next_up',
        'Connect Bot': 'music.btn_connect',
        'Premium': 'music.btn_premium',
        'Vote': 'music.btn_vote',
        'Loop': 'music.btn_loop',
        'Vol -': 'music.btn_voldown',
        'Vol +': 'music.btn_volup',
        'Lock VC': 'music.btn_lockvc',
        'Unlock VC': 'music.btn_unlockvc',
        'I am Human (Verify)': 'verify.btn',
        'Edit Title & Text': 'welcome.btn_text',
        'Edit Banner & Thumb': 'welcome.btn_media',
        'Edit Style & Footer': 'welcome.btn_style',
        'Edit Ping Header': 'welcome.btn_ping',
        'Test Preview Card': 'welcome.btn_preview'
    };

    if (buttonMap[result]) {
        return t(lang, buttonMap[result]);
    }

    if (result.includes('Select Audio Filter / Sound FX...')) {
        return t(lang, 'music.filter_placeholder');
    }

    return result;
}

/**
 * Recursively localizes Discord reply payloads (content, embeds, components)
 * @param {any} payload 
 * @param {string} lang 
 */
function localizePayload(payload, lang = 'en') {
    if (!payload || !lang || lang === 'en') return payload;

    if (typeof payload === 'string') {
        return localizeText(payload, lang);
    }

    if (typeof payload !== 'object') return payload;

    const copy = { ...payload };

    if (copy.content && typeof copy.content === 'string') {
        copy.content = localizeText(copy.content, lang);
    }

    if (Array.isArray(copy.embeds)) {
        copy.embeds = copy.embeds.map(emb => {
            if (!emb) return emb;
            if (emb.data) {
                if (emb.data.title) emb.data.title = localizeText(emb.data.title, lang);
                if (emb.data.description) emb.data.description = localizeText(emb.data.description, lang);
                if (emb.data.footer && emb.data.footer.text) {
                    emb.data.footer.text = localizeText(emb.data.footer.text, lang);
                }
                if (emb.data.author && emb.data.author.name) {
                    emb.data.author.name = localizeText(emb.data.author.name, lang);
                }
                if (Array.isArray(emb.data.fields)) {
                    for (const f of emb.data.fields) {
                        if (f.name) f.name = localizeText(f.name, lang);
                        if (f.value) f.value = localizeText(f.value, lang);
                    }
                }
                return emb;
            }

            const data = typeof emb.toJSON === 'function' ? emb.toJSON() : { ...emb };
            if (data.title) data.title = localizeText(data.title, lang);
            if (data.description) data.description = localizeText(data.description, lang);
            if (data.footer && data.footer.text) {
                data.footer.text = localizeText(data.footer.text, lang);
            }
            if (data.author && data.author.name) {
                data.author.name = localizeText(data.author.name, lang);
            }
            if (Array.isArray(data.fields)) {
                data.fields = data.fields.map(f => ({
                    ...f,
                    name: localizeText(f.name, lang),
                    value: localizeText(f.value, lang)
                }));
            }
            try {
                return EmbedBuilder.from(data);
            } catch (e) {
                return data;
            }
        });
    }

    if (Array.isArray(copy.components)) {
        copy.components = copy.components.map(row => {
            if (!row) return row;

            // Direct builder mutation
            if (Array.isArray(row.components)) {
                for (const comp of row.components) {
                    if (comp.data) {
                        if (comp.data.label && typeof comp.data.label === 'string') {
                            comp.data.label = localizeText(comp.data.label, lang);
                        }
                        if (comp.data.placeholder && typeof comp.data.placeholder === 'string') {
                            comp.data.placeholder = localizeText(comp.data.placeholder, lang);
                        }
                    } else {
                        if (comp.label && typeof comp.label === 'string') {
                            comp.label = localizeText(comp.label, lang);
                        }
                        if (comp.placeholder && typeof comp.placeholder === 'string') {
                            comp.placeholder = localizeText(comp.placeholder, lang);
                        }
                    }
                }
                return row;
            }

            // Raw JSON fallback
            const rowData = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
            if (Array.isArray(rowData.components)) {
                rowData.components = rowData.components.map(comp => {
                    const c = { ...comp };
                    if (c.label && typeof c.label === 'string') {
                        c.label = localizeText(c.label, lang);
                    }
                    if (c.placeholder && typeof c.placeholder === 'string') {
                        c.placeholder = localizeText(c.placeholder, lang);
                    }
                    return c;
                });
            }
            try {
                return ActionRowBuilder.from(rowData);
            } catch (e) {
                return rowData;
            }
        });
    }

    return copy;
}

// 4. Core Query and Mutation API
async function getGuildLanguage(guildId) {
    if (!guildId) return 'en';
    if (guildLanguageCache.has(guildId)) {
        return guildLanguageCache.get(guildId);
    }

    try {
        const mongoose = require('mongoose');
        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            guildLanguageCache.set(guildId, 'en');
            return 'en';
        }

        const ServerSettings = require('../models/ServerSettings');
        const doc = await Promise.race([
            ServerSettings.findOne({ guildId }).select('language').lean(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);

        const lang = (doc && doc.language && SUPPORTED_LANGUAGES[doc.language]) ? doc.language : 'en';
        guildLanguageCache.set(guildId, lang);
        return lang;
    } catch (e) {
        guildLanguageCache.set(guildId, 'en');
        return 'en';
    }
}

function getGuildLanguageSync(guildId) {
    if (!guildId) return 'en';
    return guildLanguageCache.get(guildId) || 'en';
}

async function initLanguageCache(client) {
    try {
        const ServerSettings = require('../models/ServerSettings');
        const docs = await ServerSettings.find({ language: { $exists: true } }).select('guildId language').lean();
        for (const doc of docs) {
            if (doc.guildId && doc.language && SUPPORTED_LANGUAGES[doc.language]) {
                guildLanguageCache.set(doc.guildId, doc.language);
            }
        }
        console.log(`🌐 [i18n] Preloaded ${guildLanguageCache.size} guild language preferences into RAM.`);
    } catch (e) {
        console.warn('⚠️ [i18n] Language cache preload skipped or DB not ready yet.');
    }
}

async function setGuildLanguage(guildId, langCode, client = null) {
    if (!guildId) return 'en';
    const cleanCode = resolveLanguageCode(langCode) || 'en';
    guildLanguageCache.set(guildId, cleanCode);

    try {
        const ServerSettings = require('../models/ServerSettings');
        await ServerSettings.findOneAndUpdate(
            { guildId },
            { $set: { language: cleanCode } },
            { upsert: true, new: true }
        );
    } catch (e) {
        console.error(`[i18n] Error persisting language for guild ${guildId}:`, e.message);
    }

    try {
        const WelcomeSettings = require('../models/WelcomeSettings');
        const welcomeDoc = await WelcomeSettings.findOne({ guildId });
        if (welcomeDoc) {
            const defaults = getWelcomeDefaults(cleanCode, '{server}');
            welcomeDoc.title = defaults.title;
            welcomeDoc.description = defaults.description;
            welcomeDoc.pingContent = defaults.pingContent;
            welcomeDoc.footer = defaults.footer;
            await welcomeDoc.save();
        }
    } catch (wErr) {}

    try {
        if (client) {
            const musicController = require('../modules/musicController');
            if (musicController && typeof musicController.update === 'function') {
                musicController.update(guildId, client);
            }
        }
    } catch (mErr) {}

    return cleanCode;
}

// 5. String Interpolation Translation Function
function t(guildOrLang, key, params = {}) {
    let lang = 'en';

    if (typeof guildOrLang === 'string') {
        if (SUPPORTED_LANGUAGES[guildOrLang]) {
            lang = guildOrLang;
        } else {
            // It might be a guildId
            lang = getGuildLanguageSync(guildOrLang);
        }
    } else if (guildOrLang && typeof guildOrLang === 'object') {
        const gid = guildOrLang.guild?.id || guildOrLang.guildId || (guildOrLang.isCommandContext ? guildOrLang.guild?.id : null);
        if (gid) {
            lang = getGuildLanguageSync(gid);
        }
    }

    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    let str = dict[key] || TRANSLATIONS['en'][key] || key;

    for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }

    return str;
}

// 6. UI Builder Helpers
function createLanguageSelectRow(currentLang = 'en', customId = 'starry_lang_select') {
    const options = Object.values(SUPPORTED_LANGUAGES).map(lang => ({
        label: `${lang.native} (${lang.name})`,
        value: lang.code,
        description: lang.description.length > 50 ? lang.description.substring(0, 47) + '...' : lang.description,
        emoji: lang.flag,
        default: lang.code === currentLang
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(t(currentLang, 'setup.select_lang_placeholder'))
        .addOptions(options);

    return new ActionRowBuilder().addComponents(selectMenu);
}

function createWelcomeSetupCard(guild, currentLang = 'en', botUser = null) {
    const langInfo = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES['en'];
    const avatarUrl = botUser?.displayAvatarURL ? botUser.displayAvatarURL() : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(t(currentLang, 'setup.welcome_title'))
        .setDescription(t(currentLang, 'setup.welcome_desc', { guild: guild.name, lang: langInfo.native, flag: langInfo.flag }))
        .addFields(
            { 
                name: '🌐 ' + t(currentLang, 'setup.select_lang_title'), 
                value: `${langInfo.flag} **${langInfo.native}** (${langInfo.name})\n*Supported: 14 Languages (English, Español, Português, 日本語, हिन्दी, Français, Deutsch, etc.)*`,
                inline: false 
            },
            { 
                name: '⚡ Quick Setup Commands',
                value: '• `,setup-starry` or `/setup-starry` — Auto-scan & link server layout\n• `,setup` or `/setup` — Deploy dedicated Music Controller channel\n• `,setlanguage` or `/setlanguage` — Change server language anytime',
                inline: false
            }
        )
        .setFooter({ text: 'Starry Multi-Language Engine • 14 Global Languages', iconURL: avatarUrl })
        .setTimestamp();

    const langRow = createLanguageSelectRow(currentLang, 'starry_lang_welcome_select');
    
    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starry_welcome_start_setup')
            .setLabel(t(currentLang, 'setup.btn_setup'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('🚀'),
        new ButtonBuilder()
            .setCustomId('starry_welcome_sync')
            .setLabel(t(currentLang, 'setup.btn_sync'))
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🧠')
    );

    return { embeds: [embed], components: [langRow, btnRow] };
}

function createSetupPromptCard(guild, currentLang = 'en', botUser = null) {
    const langInfo = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES['en'];
    const avatarUrl = botUser?.displayAvatarURL ? botUser.displayAvatarURL() : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(t(currentLang, 'setup.sync_title'))
        .setDescription(
            t(currentLang, 'setup.sync_desc') + '\n\n' +
            `🌐 **${t(currentLang, 'setup.select_lang_title')}:** ${langInfo.flag} **${langInfo.native}** (${langInfo.name})`
        )
        .setFooter({ text: 'Starry Master Brain • Language: ' + langInfo.name, iconURL: avatarUrl })
        .setTimestamp();

    const langRow = createLanguageSelectRow(currentLang, 'starry_setup_lang_select');
    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('master_txt_confirm')
            .setLabel(t(currentLang, 'setup.btn_sync'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('🧠'),
        new ButtonBuilder()
            .setCustomId('master_txt_cancel')
            .setLabel(t(currentLang, 'setup.btn_cancel'))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🚫')
    );

    return { embeds: [embed], components: [langRow, btnRow] };
}

module.exports = {
    SUPPORTED_LANGUAGES,
    LANGUAGE_ALIASES,
    resolveLanguageCode,
    guildLanguageCache,
    getGuildLanguage,
    getGuildLanguageSync,
    setGuildLanguage,
    t,
    getWelcomeDefaults,
    localizeText,
    localizePayload,
    createLanguageSelectRow,
    createWelcomeSetupCard,
    createSetupPromptCard,
    initLanguageCache
};
