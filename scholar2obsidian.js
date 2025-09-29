// ==UserScript==
// @name         scholar2obsidian
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Exports google scholar - cite as bibtex to Obsidian
// @author       RSLLES
// @match        https://scholar.googleusercontent.com/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/bibtex-parse-js@0.0.24/bibtexParse.min.js
// @require      https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js
// ==/UserScript==

const folder = "papers";
const tags = ["paper"];


function addExportToObsidianLink() {
    // detect
    const pre = document.querySelector('body > pre');
    if (!pre) {
        console.error("Can't detect bibtex entry.")
        return false;
    }
    const bibtex = pre.textContent.trim();
    const entries = bibtexParse.toJSON(bibtex);
    if (entries.length !== 1) {
        console.error(`Only support one entry.`)
        return false;
    }
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

    // concat and encode
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

    // export
    const link = document.createElement('a');
    const urlEncodedNote = encodeQueryParams(note);
    link.href = `obsidian://new?${urlEncodedNote}`;
    link.textContent = 'Export to Obsidian';
    pre.insertAdjacentElement('afterend', link);

    return true;
}

// Encode a dict of params to url
function encodeQueryParams(params) {
    return Object.keys(params)
        .map(key =>
            `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
        )
        .join('&');
}

function parse_authors(authorsString) {
    authorsString = authorsString.replace("and others", "");
    authorsString = authorsString.replace(/\{\\[a-zA-Z]+\{([a-zA-Z])\}\}/g, '$1');
    authorsString = authorsString.replace(/\{[^{}]*\}/g, (match) => {
        return match.replace(/[^a-zA-Z]/g, '');
    });
    authorsString = safe_name(authorsString);
    const authorsArray = authorsString
        .split(" and ")
        .map(author => {
            const [lastname, firstname] = author.split(",").map(s => s.trim());
            return `${firstname} ${lastname}`;
        });
    return authorsArray;
}

// adapted from https://github.com/obsidianmd/obsidian-clipper/blob/6ec0864e161f56470ba40197a9fbf8fbedf7d81a/src/utils/filters/safe_name.ts#L1
function safe_name(str) {
    // Remove Obsidian-specific characters that should be sanitized across all platforms (and $)
    str = str
        .replace(/[#\$|\^\[\]]/g, "")
        .replace(/[<>:"\/\\|?*:\x00-\x1F]/g, "")
        .replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, "_$1$2")
        .replace(/[\s.]+$/, "")
        .replace(/^\./, "_");

    // Common operations for all platforms
    str = str
        .replace(/^\.+/, "") // Remove leading periods
        .slice(0, 245); // Trim to leave room for ' 1.md'

    // Ensure the file name is not empty
    if (str.length === 0) {
        str = "Untitled";
    }

    return str;
}


(function () {
    'use strict';

    // If <pre> is not ready, retry every 100ms up to 5 seconds
    if (!addExportToObsidianLink()) {
        let attempts = 0;
        const maxAttempts = 50;
        const interval = setInterval(() => {
            attempts++;
            if (addExportToObsidianLink() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) console.log("Could not find <pre> element");
            }
        }, 100);
    }
})();