/**
 * Every language Fornello will translate into.
 *
 * Extracted from the Settings page so the Family Kitchen form can offer the
 * same list. Two copies of a hundred-odd languages would diverge the first time
 * one was edited, and the divergence would be invisible — a language present in
 * one place and missing in another looks like nothing at all.
 *
 * Value is what we store and send to the translator; label is what a person
 * reads, in their own script first.
 */
export const LANGUAGES: [value: string, label: string][] = [
              ['Afrikaans','Afrikaans'],['Amharic','አማርኛ — Amharic'],['Arabic','العربية — Arabic'],
              ['Armenian','Հայերեն — Armenian'],['Azerbaijani','Azərbaycan — Azerbaijani'],
              ['Basque','Euskara — Basque'],['Belarusian','Беларуская — Belarusian'],
              ['Bengali','বাংলা — Bengali'],['Bosnian','Bosanski — Bosnian'],
              ['Bulgarian','Български — Bulgarian'],['Burmese','မြန်မာဘာသာ — Burmese'],
              ['Catalan','Català — Catalan'],['Cebuano','Cebuano'],
              ['Chinese (Simplified)','中文（简体）— Chinese Simplified'],
              ['Chinese (Traditional)','中文（繁體）— Chinese Traditional'],
              ['Croatian','Hrvatski — Croatian'],['Czech','Čeština — Czech'],
              ['Danish','Dansk — Danish'],['Dutch','Nederlands — Dutch'],
              ['English','English'],['Estonian','Eesti — Estonian'],
              ['Filipino','Filipino — Tagalog'],['Finnish','Suomi — Finnish'],
              ['French','Français — French'],['Galician','Galego — Galician'],
              ['Georgian','ქართული — Georgian'],['German','Deutsch — German'],
              ['Greek','Ελληνικά — Greek'],['Gujarati','ગુજરાતી — Gujarati'],
              ['Haitian Creole','Kreyòl ayisyen'],['Hausa','Hausa'],
              ['Hebrew','עברית — Hebrew'],['Hindi','हिन्दी — Hindi'],
              ['Hungarian','Magyar — Hungarian'],['Icelandic','Íslenska — Icelandic'],
              ['Igbo','Igbo'],['Indonesian','Bahasa Indonesia'],
              ['Irish','Gaeilge — Irish'],['Italian','Italiano — Italian'],
              ['Japanese','日本語 — Japanese'],['Javanese','Basa Jawa — Javanese'],
              ['Kannada','ಕನ್ನಡ — Kannada'],['Kazakh','Қазақша — Kazakh'],
              ['Khmer','ខ្មែរ — Khmer'],['Korean','한국어 — Korean'],
              ['Kurdish','Kurdî — Kurdish'],['Kyrgyz','Кыргызча — Kyrgyz'],
              ['Lao','ລາວ — Lao'],['Latvian','Latviešu — Latvian'],
              ['Lithuanian','Lietuvių — Lithuanian'],['Luxembourgish','Lëtzebuergesch'],
              ['Macedonian','Македонски — Macedonian'],['Malagasy','Malagasy'],
              ['Malay','Bahasa Melayu — Malay'],['Malayalam','മലയാളം — Malayalam'],
              ['Maltese','Malti — Maltese'],['Maori','Te Reo Māori'],
              ['Marathi','मराठी — Marathi'],['Mongolian','Монгол — Mongolian'],
              ['Nepali','नेपाली — Nepali'],['Norwegian','Norsk — Norwegian'],
              ['Pashto','پښتو — Pashto'],['Persian','فارسی — Persian'],
              ['Polish','Polski — Polish'],['Portuguese','Português — Portuguese'],
              ['Punjabi','ਪੰਜਾਬੀ — Punjabi'],['Romanian','Română — Romanian'],
              ['Russian','Русский — Russian'],['Samoan','Gagana Samoa'],
              ['Serbian','Српски — Serbian'],['Sesotho','Sesotho'],['Shona','Shona'],
              ['Sindhi','سنڌي — Sindhi'],['Sinhala','සිංහල — Sinhala'],
              ['Slovak','Slovenčina — Slovak'],['Slovenian','Slovenščina — Slovenian'],
              ['Somali','Afsoomaali — Somali'],['Spanish','Español — Spanish'],
              ['Sundanese','Basa Sunda — Sundanese'],['Swahili','Kiswahili — Swahili'],
              ['Swedish','Svenska — Swedish'],['Tajik','Тоҷикӣ — Tajik'],
              ['Tamil','தமிழ் — Tamil'],['Tatar','Татар — Tatar'],
              ['Telugu','తెలుగు — Telugu'],['Thai','ภาษาไทย — Thai'],
              ['Turkish','Türkçe — Turkish'],['Turkmen','Türkmen — Turkmen'],
              ['Ukrainian','Українська — Ukrainian'],['Urdu','اردو — Urdu'],
              ['Uzbek',"Oʻzbekcha — Uzbek"],['Vietnamese','Tiếng Việt — Vietnamese'],
              ['Welsh','Cymraeg — Welsh'],['Xhosa','Xhosa'],
              ['Yiddish','יידיש — Yiddish'],['Yoruba','Yorùbá — Yoruba'],
              ['Zulu','isiZulu — Zulu'],
];
