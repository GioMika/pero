// Латинский алфавит
export const LATIN_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const LATIN_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
export const LATIN_BASIC = LATIN_UPPERCASE + LATIN_LOWERCASE;

// Кириллица
export const CYRILLIC_UPPERCASE = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
export const CYRILLIC_LOWERCASE = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
export const CYRILLIC_BASIC = CYRILLIC_UPPERCASE + CYRILLIC_LOWERCASE;

// Грузинский алфавит (Мхедрули - строчные)
export const GEORGIAN_MKHEDRULI = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ';

// Грузинский алфавит (Асомтаврули - заглавные)
export const GEORGIAN_ASOMTAVRULI = 'ႠႡႢႣႤႥႦႧႨႩႪႫႬႭႮႯႰႱႲႳႴႵႶႷႸႹႺႻႼႽႾႿჀჁჂჃჄჅ';

// Грузинский (оба варианта)
export const GEORGIAN_BASIC = GEORGIAN_MKHEDRULI + GEORGIAN_ASOMTAVRULI;

// Цифры и пунктуация
export const NUMBERS = '0123456789';
export const PUNCTUATION = '.,;:!?\'"-()[]{}/@#$%&*+=<>«»—…';

// Все символы вместе
export const ALL_GLYPHS =
    LATIN_BASIC +
    CYRILLIC_BASIC +
    GEORGIAN_BASIC +
    NUMBERS +
    PUNCTUATION;

// Группировка по категориям
export const GLYPH_CATEGORIES = {
  latinUppercase: { name: 'Latin Uppercase', chars: LATIN_UPPERCASE },
  latinLowercase: { name: 'Latin Lowercase', chars: LATIN_LOWERCASE },
  cyrillicUppercase: { name: 'Cyrillic Uppercase', chars: CYRILLIC_UPPERCASE },
  cyrillicLowercase: { name: 'Cyrillic Lowercase', chars: CYRILLIC_LOWERCASE },
  georgianMkhedruli: { name: 'Georgian (Mkhedruli)', chars: GEORGIAN_MKHEDRULI },
  georgianAsomtavruli: { name: 'Georgian (Asomtavruli)', chars: GEORGIAN_ASOMTAVRULI },
  numbers: { name: 'Numbers', chars: NUMBERS },
  punctuation: { name: 'Punctuation', chars: PUNCTUATION },
};

// Группировка по языкам
export const LANGUAGE_GROUPS = {
  latin: { name: 'Latin', chars: LATIN_BASIC },
  cyrillic: { name: 'Cyrillic', chars: CYRILLIC_BASIC },
  georgian: { name: 'Georgian', chars: GEORGIAN_BASIC },
};