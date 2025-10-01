// ==UserScript==
// @name         Scholar2Obsidian
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add an “Export to Obsidian” link on Google Scholar citation pages so you can import BibTeX directly into Obsidian.
// @author       RSLLES
// @match        https://scholar.googleusercontent.com/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/bibtex-parse-js@0.0.24/bibtexParse.min.js
// @require      https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js
// ==/UserScript==

const folder = "Science 🔬/Papers 📜";
const tags = ["paper"];


// Create the “Export to Obsidian” link after the <pre> element that contains the BibTeX.
function addExportLink() {
    // detect
    const pre = document.querySelector('pre');
    if (!pre) return false;
    const bibtex = pre.textContent.trim();
    const entries = bibtexParse.toJSON(bibtex);
    if (entries.length !== 1) return false;
    const bibentry = entries[0];

    // extract and format
    const key = bibentry.citationKey;
    const metadata = bibentry.entryTags;
    const title = metadata.title;
    let authors = metadata.author;
    authors = parse_authors(authors);
    authors = authors.map(s => `[[${s}]]`);
    let year = metadata.year;
    year = year ? parseInt(year) : null;

    // concat
    let properties = {
        title: title,
        author: authors,
        year: year,
        key: key,
        tags: tags,
    };
    properties = jsyaml.dump(properties);
    properties = `---\n${properties}---`;
    const pdf = "pdf: "
    const cite = "cite:\n```bibtex\n" + bibtex + "\n```";
    const note = {
        file: `${folder}/${safe_name(title)}`,
        content: [properties, pdf, cite].join("\n") + "\n\n",
    };

    // encode and export
    const link = document.createElement('a');
    const urlEncodedNote = encodeQueryParams(note);
    link.href = `obsidian://new?${urlEncodedNote}`;
    link.textContent = 'Export to Obsidian';
    pre.insertAdjacentElement('afterend', link);

    return true;
}

// Encode a plain object as query‑string parameters.
function encodeQueryParams(params) {
    return Object.keys(params)
        .map(key =>
            `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
        )
        .join('&');
}

// Make a filename safe for Obsidian.
// adapted from https://github.com/obsidianmd/obsidian-clipper/blob/6ec0864e161f56470ba40197a9fbf8fbedf7d81a/src/utils/filters/safe_name.ts#L1
function safe_name(str) {
    // Remove Obsidian-specific characters
    str = str
        .replace(/[#\$|\^\[\]]/g, "")
        .replace(/[<>:"\/\\|?*:\x00-\x1F]/g, "")
        .replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, "_$1$2")
        .replace(/[\s.]+$/, "")
        .replace(/^\./, "_")
        .replace(/^\.+/, "") // Remove leading periods
        .slice(0, 245); // Trim to leave room for ' 1.md'

    return str || 'Untitled';
}

// Clean and split an author string into an array.
function parse_authors(str) {
    str = str.replace("and others", "")
        .replace(/\{\\[a-zA-Z]+\{([a-zA-Z])\}\}/g, '$1')
        .replace(/\{[^{}]*\}/g, (match) => {
            return match.replace(/[^a-zA-Z]/g, '');
        });
    str = safe_name(str);
    const arr = str
        .split(" and ")
        .map(author => {
            const [lastname, firstname] = author.split(",").map(s => s.trim());
            return `${firstname} ${lastname}`;
        });
    return arr;
}


// Retry mechanism, retry every 100ms up to 5 seconds
(function () {
    'use strict';

    if (!addExportLink()) {
        let attempts = 0;
        const maxAttempts = 50;
        const interval = setInterval(() => {
            attempts++;
            if (addExportLink() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) console.log("Could not find <pre> element");
            }
        }, 100);
    }
})();