const localeMap: Record<string, string> = {
  en: "en",
  "zh-cn": "zh-CN",
  "ja-jp": "ja-JP",
  "ko-kr": "ko-KR",
  "fr-fr": "fr-FR",
  "de-de": "de-DE",
  "pt-br": "pt-BR",
  "es-la": "es-lamr",
  "es-lamr": "es-lamr",
  "it-it": "it-IT",
};

export function normalizeLocale(locale?: string): string {
  return localeMap[String(locale ?? "en").toLowerCase()] ?? "en";
}
