/* A stand-in embedding model for the offline tests: deterministic, no network. Each word is hashed
   into one of DIMS slots after a small synonym map has brought words of one meaning to one form, so
   « m'enregistrer » lands where « inscription » does -- what a real model learns, written by hand.
   `texts` keeps every text it was given (what was embedded, and how often). */
import { createHash } from 'node:crypto';

const DIMS = 1024;
const MEANING = [
    [/^(enregistr|inscri|signup)/, 'inscription'],
    [/^(soiree|nuit|veillee)/, 'soiree'],
    [/^(conge|vacance|absence|repos)/, 'conge'],
    [/^(monture|cheval|chevaux|destrier)/, 'monture'],
];
const meaning = (w) => (MEANING.find(([re]) => re.test(w))?.[1] ?? w);
export function fakeEmbedder(model = 'fake-embed-1') {
    const texts = [];
    return {
        model, name: `${model} (offline)`, texts,
        async embed(list) {
            texts.push(...list);
            return list.map((t) => {
                const v = new Array(DIMS).fill(0);
                for (const w of String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{3,}/g) ?? []) v[createHash('sha256').update(meaning(w)).digest().readUInt16BE(0) % DIMS] += 1;
                return v;
            });
        },
    };
}
