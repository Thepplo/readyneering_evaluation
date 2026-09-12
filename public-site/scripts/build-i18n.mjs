import {
  readFile,
  writeFile,
  mkdir,
  rm,
  cp,
} from 'node:fs/promises';

import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const LOCALES = join(ROOT, 'locales');
const DIST = join(ROOT, 'dist');

const languages = {
  en: {
    file: 'en.json',
    outputDir: '',
    localePath: '/',
  },

  de: {
    file: 'de.json',
    outputDir: 'de',
    localePath: '/de/',
  },
};

const templateFiles = [
  'index.html',
  'questionnaire.html',
];

const staticFiles = [
  '_redirects',
  'hpt.html',
];

const staticDirectories = [
  'assets',
];

function get(obj, path) {
  return path
    .split('.')
    .reduce((value, key) => value?.[key], obj);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHtml(template, translations, lang, localePath) {
  return template
    .replaceAll('{{lang}}', lang)
    .replaceAll('{{localePath}}', localePath)
    .replaceAll(
      '{{i18nJson}}',
      JSON.stringify(translations).replace(/</g, '\\u003c')
    )
    .replace(/\{\{t\.([a-zA-Z0-9_.-]+)\}\}/g, (_, key) => {
      const value = get(translations, key);
      if (value === undefined) {
        throw new Error(`Missing translation "${key}" for locale "${lang}"`);
      }
      return escapeHtml(value);
    });
}

function renderJs(template, translations, lang) {
  return template

    .replace(/\{\{js\.([a-zA-Z0-9_.-]+)\}\}/g, (_, key) => {
      const value = get(translations, key);

      if (value === undefined) {
        throw new Error(
          `Missing translation "${key}" for locale "${lang}"`
        );
      }

      return JSON.stringify(value);
    });
}

async function copyStaticFiles() {
  for (const file of staticFiles) {
    await cp(
      join(ROOT, file),
      join(DIST, file)
    );
  }

  for (const directory of staticDirectories) {
    await cp(
      join(ROOT, directory),
      join(DIST, directory),
      { recursive: true }
    );
  }
}

async function build() {
  await rm(DIST, {
    recursive: true,
    force: true,
  });

  await mkdir(DIST, {
    recursive: true,
  });

  for (const [lang, config] of Object.entries(languages)) {
    const translations = JSON.parse(
      await readFile(
        join(LOCALES, config.file),
        'utf8'
      )
    );

    for (const file of templateFiles) {
      const source = await readFile(
        join(ROOT, file),
        'utf8'
      );

      const isHtml = file.endsWith('.html');

      const output = isHtml
        ? renderHtml(
            source,
            translations,
            lang,
            config.localePath
          )
        : renderJs(
            source,
            translations,
            lang
          );

      const outputPath = join(
        DIST,
        config.outputDir,
        file
      );

      await mkdir(
        dirname(outputPath),
        { recursive: true }
      );

      await writeFile(
        outputPath,
        output,
        'utf8'
      );

      console.log(
        `✓ ${lang} → ${join(config.outputDir, file)}`
      );
    }
  }

  await copyStaticFiles();

  console.log('\n✓ Build complete');
}

build().catch(error => {
  console.error('\nBuild failed:');
  console.error(error);
  process.exit(1);
});