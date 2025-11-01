const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'i', 'you', 'my', 'your', 'not', 'this', 'but', 'or',
  // Spanish stopwords
  'de', 'la', 'el', 'en', 'y', 'un', 'una', 'es', 'no', 'a', 'que', 'los', 'del',
  // Hindi stopwords (example)
  'है', 'में', 'के', 'लिए', 'पर', 'एक', 'और', 'से', 'को', 'यह'
]);

const normalizeText = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .split(/\s+/) // split into words
    .filter(word => word.length > 1 && !STOP_WORDS.has(word)); // remove stopwords and short words
};

export const calculateJaccardSimilarity = (text1: string, text2: string): number => {
  const set1 = new Set(normalizeText(text1));
  const set2 = new Set(normalizeText(text2));

  if (set1.size === 0 || set2.size === 0) {
    return 0;
  }

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};
