const americanOnly = require('./american-only.js');
const americanToBritishSpelling = require('./american-to-british-spelling.js');
const americanToBritishTitles = require('./american-to-british-titles.js');
const britishOnly = require('./british-only.js');

class Translator {
  translate(text, locale) {
    if (!text || !locale) return { error: 'Required field(s) missing' };
    if (text.trim() === '') return { error: 'No text to translate' };

    let translation = text;
    let translated = false;
    const highlight = (word) => `<span class="highlight">${word}</span>`;
    const replacements = [];

    const applyReplacements = (dict, isTitle = false) => {
      // Sort longer phrases first to avoid partial matching (e.g. 'Mrs' before 'Mr')
      const sortedEntries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length);

      for (let [source, target] of sortedEntries) {
        let sourceRegex = isTitle
          ? new RegExp(`\\b${source.replace(/\.$/, '')}\\.?`, 'gi') // match titles with or without dot
          : new RegExp(`(?<=^|\\s|[“"'])${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\W|$)`, 'gi');

        translation = translation.replace(sourceRegex, (match) => {
          translated = true;
          let replacement = target;

          // preserve capitalization
          if (match[0] === match[0].toUpperCase()) {
            replacement = replacement[0].toUpperCase() + replacement.slice(1);
          }

          return `__PLACEHOLDER_${replacements.push({ from: match, to: highlight(replacement) }) - 1}__`;
        });
      }
    };


    if (locale === 'american-to-british') {
      applyReplacements(americanToBritishTitles, true);
      applyReplacements(americanOnly);
      applyReplacements(americanToBritishSpelling);

      translation = translation.replace(/\b(\d{1,2}):(\d{2})\b/g, (match) => {
        translated = true;
        const converted = match.replace(':', '.');
        return `__PLACEHOLDER_${replacements.push({ from: match, to: highlight(converted) }) - 1}__`;
      });

    } else if (locale === 'british-to-american') {
      const britishToAmericanSpelling = Object.fromEntries(
        Object.entries(americanToBritishSpelling).map(([k, v]) => [v, k])
      );
      const britishToAmericanTitles = Object.fromEntries(
        Object.entries(americanToBritishTitles).map(([k, v]) => [v.replace(/\.$/, ''), k])
      );

      applyReplacements(britishToAmericanTitles, true);
      applyReplacements(britishOnly);
      applyReplacements(britishToAmericanSpelling);

      translation = translation.replace(/\b(\d{1,2})\.(\d{2})\b/g, (match) => {
        translated = true;
        const converted = match.replace('.', ':');
        return `__PLACEHOLDER_${replacements.push({ from: match, to: highlight(converted) }) - 1}__`;
      });

    } else {
      return { error: 'Invalid value for locale field' };
    }

    // Replace all placeholders
    replacements.forEach((r, i) => {
      translation = translation.replace(`__PLACEHOLDER_${i}__`, r.to);
    });

    if (!translated || translation === text) {
      return { text, translation: 'Everything looks good to me!' };
    }

    return { text, translation };
  }
}

module.exports = Translator;
