/** Validate the actual portfolio records and public media. No dependencies.
 * Run after asset preparation/transcoding finishes: node scripts/check-content.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src', 'data');
const publicDir = path.join(root, 'public');
const categories = new Set(['landscape', 'graphic', 'photography', 'spatial', 'botanical', 'motion', 'digital']);
const statuses = new Set(['ready', 'wip', 'placeholder']);
const errors = [];
const ids = new Map();
const filesToCheck = new Map();
const counts = new Map();
let projectsChecked = 0;
let placeholders = 0;

function fail(where, message) {
  errors.push(`${where}: ${message}`);
}

function bilingual(value, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(where, 'expected an object containing non-empty zh and en strings');
    return;
  }
  for (const lang of ['zh', 'en']) {
    if (typeof value[lang] !== 'string' || !value[lang].trim()) {
      fail(`${where}.${lang}`, 'missing or empty translation');
    }
  }
}

function media(value, where, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) fail(where, 'missing media path');
    return;
  }
  if (typeof value !== 'string') {
    fail(where, 'expected a local public URL string');
    return;
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    fail(where, `expected a local public URL, received ${JSON.stringify(value)}`);
    return;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  } catch {
    fail(where, `invalid URL encoding: ${value}`);
    return;
  }
  const absolute = path.resolve(publicDir, `.${decoded}`);
  const relative = path.relative(publicDir, absolute);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    fail(where, `path escapes public/: ${value}`);
    return;
  }
  if (!filesToCheck.has(absolute)) filesToCheck.set(absolute, []);
  filesToCheck.get(absolute).push(where);
}

function imageList(value, where, required = false) {
  if (value === undefined || value === null) {
    if (required) fail(where, 'missing image array');
    return;
  }
  if (!Array.isArray(value)) {
    fail(where, 'expected an image array');
    return;
  }
  value.forEach((image, index) => {
    const at = `${where}[${index}]`;
    if (!image || typeof image !== 'object' || Array.isArray(image)) {
      fail(at, 'expected an image record with src and bilingual caption');
      return;
    }
    media(image.src, `${at}.src`, true);
    bilingual(image.caption, `${at}.caption`);
  });
}

function versions(value, where) {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) {
    fail(where, 'expected a version array');
    return;
  }
  value.forEach((version, index) => {
    const at = `${where}[${index}]`;
    if (typeof version === 'string') {
      media(version, at, true);
      return;
    }
    if (!version || typeof version !== 'object' || Array.isArray(version)) {
      fail(at, 'expected a media version record');
      return;
    }
    const keys = ['src', 'video', 'cover', 'poster'].filter(key => version[key]);
    if (!keys.length) fail(at, 'missing media source');
    for (const key of keys) media(version[key], `${at}.${key}`, true);
    if ('label' in version) bilingual(version.label, `${at}.label`);
    if ('caption' in version) bilingual(version.caption, `${at}.caption`);
    if ('images' in version) imageList(version.images, `${at}.images`);
    if ('processImages' in version) imageList(version.processImages, `${at}.processImages`);
  });
}

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  }));
  return nested.flat().sort();
}

let sourceFiles = [];
try {
  sourceFiles = await jsonFiles(dataDir);
} catch (error) {
  fail('src/data', error.message);
}
if (!sourceFiles.length) fail('src/data', 'no project JSON files found');

for (const file of sourceFiles) {
  const filename = path.relative(root, file).split(path.sep).join('/');
  let document;
  try {
    document = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch (error) {
    fail(filename, `cannot parse JSON: ${error.message}`);
    continue;
  }
  const projects = Array.isArray(document) ? document : document?.projects;
  if (!Array.isArray(projects)) {
    fail(filename, 'expected a project array or an object containing projects[]');
    continue;
  }
  projects.forEach((project, index) => {
    const where = `${filename}[${index}]${project?.id ? ` (${project.id})` : ''}`;
    projectsChecked += 1;
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      fail(where, 'expected a project object');
      return;
    }
    if (typeof project.id !== 'string' || !project.id.trim()) {
      fail(`${where}.id`, 'missing or empty ID');
    } else if (ids.has(project.id)) {
      fail(`${where}.id`, `duplicate ID; first occurrence: ${ids.get(project.id)}`);
    } else {
      ids.set(project.id, where);
    }
    if (!categories.has(project.category)) fail(`${where}.category`, `invalid category: ${JSON.stringify(project.category)}`);
    if (!statuses.has(project.status)) fail(`${where}.status`, `invalid status: ${JSON.stringify(project.status)}`);
    counts.set(project.category, (counts.get(project.category) || 0) + 1);
    for (const field of ['title', 'subtitle', 'description', 'role']) bilingual(project[field], `${where}.${field}`);
    const placeholder = project.status === 'placeholder';
    if (placeholder) placeholders += 1;
    // Unknown years (including the em dash) are intentionally valid.
    media(project.cover, `${where}.cover`, !placeholder);
    imageList(project.images, `${where}.images`, !placeholder);
    media(project.video, `${where}.video`);
    media(project.poster, `${where}.poster`);
    imageList(project.processImages, `${where}.processImages`);
    versions(project.versions, `${where}.versions`);
  });
}

await Promise.all([...filesToCheck].map(async ([file, references]) => {
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    if (!info.size) throw new Error('empty file');
  } catch (error) {
    const asset = '/' + path.relative(publicDir, file).split(path.sep).join('/');
    fail(references.join('; '), `${asset} - ${error.code || error.message}`);
  }
}));

if (errors.length) {
  console.error(`Content check failed: ${errors.length} issue(s).`);
  for (const error of errors.sort()) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Content check passed: ${sourceFiles.length} JSON files, ${projectsChecked} projects (${placeholders} placeholders), ${filesToCheck.size} local media files.`);
  console.log([...counts].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([name, count]) => `${name}: ${count}`).join(' | '));
}
