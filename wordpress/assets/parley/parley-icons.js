/* THE ICONS, drawn by Lucide (https://lucide.dev): lucide-static 1.48.0,
 * copied here as plain data, only those used -- by the screen (reactions,
 * files, the viewer) and by an application that wants the same set for its
 * own buttons. Nothing is loaded from anywhere; no dependency.
 *
 *   import { icon, fileIcon, ICONS } from './parley-icons.js';
 *   icon('heart')                an <svg>, its colour the text's (currentColor)
 *   fileIcon('report.pdf')       the name of the icon for a file's kind
 *
 * The path data is Lucide's, written with a space between two numbers
 * where it had none ("3.676.56" is "3.676 .56"): the same drawing.
 *
 * Lucide's licence (ISC), and the MIT licence of the Feather icons some of
 * them derive from (arrow-up, arrow-down, check, chevron-left, chevron-right, plus,
 * smartphone, x), as the package gives them:
 *
 *   ISC License. Copyright (c) 2026 Lucide Icons and Contributors.
 *   Permission to use, copy, modify, and/or distribute this software for any
 *   purpose with or without fee is hereby granted, provided that the above
 *   copyright notice and this permission notice appear in all copies.
 *   THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 *   WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 *   MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 *   ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 *   WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 *   ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 *   OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 *   The MIT License (MIT), for the icons derived from Feather.
 *   Copyright (c) 2013-present Cole Bemis.
 *   Permission is hereby granted, free of charge, to any person obtaining a
 *   copy of this software and associated documentation files (the
 *   "Software"), to deal in the Software without restriction, including
 *   without limitation the rights to use, copy, modify, merge, publish,
 *   distribute, sublicense, and/or sell copies of the Software, and to permit
 *   persons to whom the Software is furnished to do so, subject to the
 *   following conditions: The above copyright notice and this permission
 *   notice shall be included in all copies or substantial portions of the
 *   Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 *   NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 *   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 *   OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 *   USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export const LUCIDE = 'lucide-static 1.48.0';
/* Each icon: its shapes, [tag, attributes], on a grid of 24 by 24. */
export const ICONS = Object.freeze({
    'thumbs-up': [['path',{d:'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z'}],['path',{d:'M7 10v12'}]],
    'circle-check': [['circle',{cx:12,cy:12,r:10}],['path',{d:'m16 9-5.5 5.5L8 12'}]],
    'thumbs-down': [['path',{d:'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z'}],['path',{d:'M17 14V2'}]],
    'circle-question-mark': [['circle',{cx:12,cy:12,r:10}],['path',{d:'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'}],['path',{d:'M12 17h.01'}]],
    'octagon-x': [['path',{d:'m15 9-6 6'}],['path',{d:'M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414 .586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414 .586H8.688a2 2 0 0 1-1.414-.586z'}],['path',{d:'m9 9 6 6'}]],
    'refresh-ccw': [['path',{d:'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'}],['path',{d:'M3 3v5h5'}],['path',{d:'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16'}],['path',{d:'M16 16h5v5'}]],
    'hourglass': [['path',{d:'M5 22h14'}],['path',{d:'M5 2h14'}],['path',{d:'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22'}],['path',{d:'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2'}]],
    'heart': [['path',{d:'M2 9.5a5.5 5.5 0 0 1 9.591-3.676 .56 .56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5'}]],
    'smile-plus': [['path',{d:'M13.267 2.08a10 10 0 108.653 8.653'}],['path',{d:'M15 10V9'}],['path',{d:'M16 5h6'}],['path',{d:'M16.472 15a6 6 0 01-8.943 0'}],['path',{d:'M19 2v6'}],['path',{d:'M9 10V9'}]],
    'reply': [['path',{d:'M20 18v-2a4 4 0 0 0-4-4H4'}],['path',{d:'m9 17-5-5 5-5'}]],
    'paperclip': [['path',{d:'m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48'}]],
    'images': [['path',{d:'m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16'}],['path',{d:'M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2'}],['circle',{cx:13,cy:7,r:1,fill:'currentColor'}],['rect',{x:8,y:2,width:14,height:14,rx:2}]],
    'x': [['path',{d:'M18 6 6 18'}],['path',{d:'m6 6 12 12'}]],
    'chevron-left': [['path',{d:'m15 18-6-6 6-6'}]],
    'chevron-right': [['path',{d:'m9 18 6-6-6-6'}]],
    'mic': [['path',{d:'M12 19v3'}],['path',{d:'M19 10v2a7 7 0 0 1-14 0v-2'}],['rect',{x:9,y:2,width:6,height:13,rx:3}]],
    'file': [['path',{d:'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 .706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}]],
    'file-image': [['path',{d:'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 .706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}],['circle',{cx:10,cy:12,r:2}],['path',{d:'m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22'}]],
    'file-text': [['path',{d:'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 .706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}],['path',{d:'M10 9H8'}],['path',{d:'M16 13H8'}],['path',{d:'M16 17H8'}]],
    'file-code': [['path',{d:'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 .706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}],['path',{d:'M10 12.5 8 15l2 2.5'}],['path',{d:'m14 12.5 2 2.5-2 2.5'}]],
    'file-spreadsheet': [['path',{d:'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 .706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}],['path',{d:'M8 13h2'}],['path',{d:'M14 13h2'}],['path',{d:'M8 17h2'}],['path',{d:'M14 17h2'}]],
    'file-archive': [['path',{d:'M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}],['path',{d:'M8 12v-1'}],['path',{d:'M8 18v-2'}],['path',{d:'M8 7V6'}],['circle',{cx:8,cy:20,r:2}]],
    'file-music': [['path',{d:'M11.65 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v10.35'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}],['path',{d:'M8 20v-7l3 1.474'}],['circle',{cx:6,cy:20,r:2}]],
    'file-play': [['path',{d:'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 .706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],['path',{d:'M14 2v5a1 1 0 0 0 1 1h5'}],['path',{d:'M15.033 13.44a.647 .647 0 0 1 0 1.12l-4.065 2.352a.645 .645 0 0 1-.968-.56v-4.704a.645 .645 0 0 1 .967-.56z'}]],
    'folder': [['path',{d:'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'}]],
    'message-square': [['path',{d:'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414 .586l-2.202 2.202A.71 .71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z'}]],
    'waypoints': [['path',{d:'m10.586 5.414-5.172 5.172'}],['path',{d:'m18.586 13.414-5.172 5.172'}],['path',{d:'M6 12h12'}],['circle',{cx:12,cy:20,r:2}],['circle',{cx:12,cy:4,r:2}],['circle',{cx:20,cy:12,r:2}],['circle',{cx:4,cy:12,r:2}]],
    'settings': [['path',{d:'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915'}],['circle',{cx:12,cy:12,r:3}]],
    'smartphone': [['rect',{width:14,height:20,x:5,y:2,rx:2,ry:2}],['path',{d:'M12 18h.01'}]],
    'square-terminal': [['path',{d:'m7 11 2-2-2-2'}],['path',{d:'M11 13h4'}],['rect',{width:18,height:18,x:3,y:3,rx:2,ry:2}]],
    'git-branch': [['path',{d:'M15 6a9 9 0 0 0-9 9V3'}],['circle',{cx:18,cy:6,r:3}],['circle',{cx:6,cy:18,r:3}]],
    'mail': [['path',{d:'m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7'}],['rect',{x:2,y:4,width:20,height:16,rx:2}]],
    'key-round': [['path',{d:'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z'}],['circle',{cx:16.5,cy:7.5,r:'.5',fill:'currentColor'}]],
    'arrow-up': [['path',{d:'m5 12 7-7 7 7'}],['path',{d:'M12 19V5'}]],
    'arrow-down': [['path',{d:'M12 5v14'}],['path',{d:'m19 12-7 7-7-7'}]],
    'plus': [['path',{d:'M5 12h14'}],['path',{d:'M12 5v14'}]],
    'pencil': [['path',{d:'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5 .83l-1.321 4.352a.5 .5 0 0 0 .623 .622l4.353-1.32a2 2 0 0 0 .83-.497z'}],['path',{d:'m15 5 4 4'}]],
    'undo-2': [['path',{d:'M9 14 4 9l5-5'}],['path',{d:'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11'}]],
    'eraser': [['path',{d:'M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21'}],['path',{d:'m5.082 11.09 8.828 8.828'}]],
    'check': [['path',{d:'M20 6 9 17l-5-5'}]],
});

/* The kinds of files, by extension, and the icon of each. */
const KINDS = [
    ['file-image', ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tif', 'tiff', 'avif']],
    ['file-text', ['pdf', 'txt', 'md', 'log', 'eml', 'tex', 'rtf', 'srt', 'vtt', 'doc', 'docx', 'odt', 'pages', 'ppt', 'pptx', 'odp', 'key', 'epub']],
    ['file-spreadsheet', ['csv', 'tsv', 'xls', 'xlsx', 'ods', 'numbers']],
    ['file-code', ['json', 'yaml', 'yml', 'toml', 'ini', 'xml', 'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'sh', 'sql', 'c', 'h', 'cpp', 'go', 'rs', 'java', 'rb', 'php', 'kt', 'swift', 'lua', 'pl', 'r', 'vue', 'conf', 'cfg', 'env']],
    ['file-archive', ['zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'zst']],
    ['file-music', ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac', 'aac', 'opus']],
    ['file-play', ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v']],
];
export function fileIcon(name, folder = false) {
    if (folder) return 'folder';
    const ext = (/\.([a-z0-9]{1,8})$/i.exec(String(name ?? ''))?.[1] ?? '').toLowerCase();
    return KINDS.find(([, list]) => list.includes(ext))?.[0] ?? 'file';
}

/* An icon as an <svg> element, made here from the data above: never markup. */
export function icon(name, className = '') {
    const SVG = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG, 'svg');
    for (const [k, v] of [['viewBox', '0 0 24 24'], ['aria-hidden', 'true'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']]) svg.setAttribute(k, v);
    svg.setAttribute('class', `lucide lucide-${name}${className ? ` ${className}` : ''}`);
    for (const [tag, attributes] of ICONS[name] ?? ICONS.file) {
        const shape = document.createElementNS(SVG, tag);
        for (const [k, v] of Object.entries(attributes)) shape.setAttribute(k, String(v));
        svg.append(shape);
    }
    return svg;
}
