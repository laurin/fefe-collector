import fs from 'fs/promises';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import dayjs from 'dayjs';
import keywordExytractor from 'keyword-extractor';
import { ExtractionOptions } from 'keyword-extractor/types/lib/keyword_extractor';

const KEYWORD_OPTIONS: ExtractionOptions = {
    language: "german",
    remove_digits: true,
    return_changed_case: true,
};

const FEFE_BASE = 'https://blog.fefe.de';

const turndown = new TurndownService();

const randomElement = <T extends any>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type FefeArticle = {
    uuid: string,
    date: number,
    text: string,
    tags?: string[],
}

function countFreq(arr: any[], min: number = 0, n = Infinity) {
    const count: Record<string, number> = {};
    arr.forEach(e => count[e] = (count[e] || 0) + 1);
    return Object.entries(count)
        .sort((a, b) => b[1] - a[1])
        .filter(([key, freq]) => freq > min)
        .slice(0, n);
}


const TAGS: Record<string, string[]> = {
    'old-and-busted': ['busted'],
    'anyone': ['benutzt hier jemand', 'ist hier jemand', 'verwendet hier jemand', 'macht hier jemand'],
    'how-bad': ['wie schlimm ist die lage'],
    'mkü': ['medienkompetenz'],
    'good-bad-news': ['gute nachricht:', 'schlechte nachricht:'],
    'leserbrief': ['leserbrief', 'zuschrift', 'einsender'],
    'moneyquote': ['money quote'],

    'cpu': ['intel', 'amd', 'spectre', 'metldown', 'cpu', 'risc-v'],
    'spectre': ['spectre', 'meltdown'],
    'c': ['cpp', 'gcc'],
    'crypto': ['btc', 'bitcoin', 'ftx', 'crypto', 'krypto', 'coinbase', 'nft', 'opensea', 'wallet', 'blockchain'],
    'agency': ['cia', 'fbi', 'nsa ', ' nsa', 'geheimdienst', 'bnd'],
    'energy': ['solar', 'rwe ', ' rwe', ' uniper', 'gazprom', 'atomausstieg', ' öl', 'kernkraft', 'energiepreis', 'versorger'],
    'ukraine': ['ukraine', 'kiev'],
    'covid': [' impf', ' geimpf', 'corona', 'covid', 'klopapier', 'schwurb', 'querdenk'],
    'schwurbel': ['verschwörung', 'schwurb', 'querdenk', 'qanon', 'covidiot'],
    'infra-apocalypse': ['infrastrukturapokalypse'],
    'usa': [' usa', 'vereinigten staaten', 'vereinigte staaten', 'us air force', 'trump', 'biden', 'pence', ' amis', ' us-'],
    'tech': ['ssd', 'cpu', 'intel', 'amd', 'apple', 'samsung', 'hdd', 'gpu', 'arm', 'nvidia', 'ibm'],
    'linux': ['kernel', 'linux'],
    'privacy': ['datenschutz', 'privacy', 'google home', 'facebook', 'alexa', 'abhör', 'verschlüsselung', 'whatsapp', 'telegram', 'vpn', 'trojaner', 'dsgvo', 'überwach', 'anonymisier'],
    'war': ['krieg ', 'krieg-', 'kriegs', 'ukraine', 'taliban', 'rakete', 'waffen', 'panzer', 'syrien'],
    'russia': ['russland', 'russen', 'putin', 'kreml'],
    'china': ['china', 'chines'],
    'apokalypse': ['apokalypse'],
    'politics': [
        'merkel', 'scholz', 'spahn', 'söder', 'seehofer', 'altmaier', 'cdu', 'spd', 'afd', 'fdp', 'grüne', 'demokratie', 'politiker', 'politik',
        'staat ', 'europ', 'gesetz ', 'gesetze', 'sanktion', 'eu-', ' eu ', 'nazi', 'bundes', 'höcke', 'gauland', 'von storch', 'weidel', 'wahlkampf'
    ],
    'digitalisierung': ['digitalisierung'],
    'finance': [' bank', 'wirecard', 'cum-ex', 'cumex', 'cum ex', 'inflation', 'steuer ', 'aktie', 'ezb'],
    'security': [
        'ransom', 'security', 'advisory', 'cve', 'cyber', 'bsi', 'hintertür', 'backdoor', 'tpm', 'spectre', 'meltdown',
        'vulnerability', 'exploit', 'hacker', 'datenreichtum', 'zertifikat', 'schlüssel', 'sandbox', 'privileg', 'sicherheitslücke', 'sicherheitsproblem'
    ],
    'software': ['open-source', 'open source', 'opensource', 'bug', 'entwickler', 'software'],
    'environment': ['co2', 'klima', 'climate', 'carbon', 'umwelt'],
    'police': ['cops', 'poliz', 'gewahrsam'],
    'snakeoil': ['schlangenöl'],
    'ai': ['künstlichen intelligenz', 'künstlicher intelligenz', 'künstliche intelligenz', 'ki '],
    'infra': ['bahn', 'flug', 'telekom', 'vodafone', 'glasfaser', 'anbieter', 'mobilfunk', ' isp', 'verkehr', '9€-ticket'],
    'fail': ['kaputt', 'bug', 'fail', 'mit profis'],
    'ceo': ['ceo', ' elon', 'bezos', 'gates', 'zuckerberg', 'warren buffett', 'tim cook'],
    'court': ['gericht', 'richter'],
    'media': ['öffentlich-rechtlich', 'fox-news', 'fox news', 'foxnews', 'medien', 'propaganda'],
    'left': ['antifa', 'linke'],
    'right': [' npd', 'afd', 'höcke', 'gauland', 'von storch', 'weidel'],
    'youtube': ['youtube', 'youtu.be'],
    'twitter': ['twitter'],
    'tagesschau': ['tagesschau'],
    'spiegel': ['spiegel'],
    'heise': ['heise.de'],
    'apple': ['apple'],
    'microsoft': ['microsoft'],
    'facebook': ['facebook'],
    'google': ['google'],
    'tesla': ['tesla'],
    'amazon': ['amazon'],
    'berlin': ['berlin'],
};

const IGNORED_WORDS = [
    '>', 'the', 'to', 'mal', 'of', 'and', 'that', '[die', 'for', 'is', '-', 'with', 'by', 'paar', 'as', '[der', 'it', 'eigentlich',
    'not', '[in', 'are', 'halt', 'from', 'their', 'on', 'oh', 'be', 'kennt', 'raus', 'heißt', 'lassen', 'said', 'more', 'have', 'stellt',
    '[hier', 'einfach', '[das', 'or', 'sagen', 'has', 'this', 'at', 'fall', '—', 'no', 'after', 'they', 'frage', 'new', 'bloß', 'who',
    'us', 'but',
]

function getMon(year: number, month: number) {
    return `${year}${month.toString().padStart(2, '0')}`;
}

function getTags(text: string): string[] {
    return Object
        .entries(TAGS)
        .filter(([name, keywords]) => keywords.some(k => text.toLowerCase().includes(k)))
        .map(([name, keywords]) => name);
}

class Fefe {
    articles: FefeArticle[] = [];
    months: string[] = [];

    async fetchMonth(year: number, month: number) {
        const mon = getMon(year, month);
        if (this.months.includes(mon)) {
            // console.log(`month already cached, skipping ${mon}`);
            return;
        }
        const url = `${FEFE_BASE}/?mon=${mon}`;
        console.log(`fetching ${url}`);
        const html = await fetch(url)
            .then(res => res.text());
        const articles = this.parseHtml(html);
        this.articles.push(...articles.reverse());
        this.months.push(mon);
    }

    parseHtml(html: string): FefeArticle[] {
        const document = new JSDOM(html).window.document;
        const dates = document.querySelectorAll('body > h3');
        const uls = document.querySelectorAll('body > ul');

        const articles: FefeArticle[] = [];
        for (const [i, date] of dates.entries()) {
            for (const li of uls[i].children) {
                articles.push({
                    date: new Date(date.textContent!).getTime(),
                    uuid: li.querySelector('a')!.href,
                    text: turndown.turndown(li.innerHTML).replace(/\[.+?\) /, ''),
                });
            }
        }
        return articles;
    }

    async fetchSince(year: number, month: number = 0) {
        let day = dayjs()
            .set('month', month)
            .set('year', year)

        for (; !day.isAfter(dayjs()); day = day.add(1, 'month')) {
            // console.log(`fetching ${day.year()}, ${day.month()}`);
            await this.fetchMonth(day.year(), day.month());
        }
        await this.store();
    }

    async store() {
        await fs.mkdir('./data', { recursive: true });
        await fs.writeFile('./data/data.json', JSON.stringify({
            articles: this.articles,
            months: this.months,
        }, null, 4));

        let jsonl = "";
        this.articles.forEach(a => {
            jsonl += `{"prompt": "${a.tags?.join(" ") || ''}\\n\\n###\\n\\n", "completion": ${JSON.stringify(' ' + a.text + '<<END>>')}}\n`;
        })
        await fs.writeFile('./data/data.jsonl', jsonl);
    }

    async load() {
        try {
            const data = await fs.readFile('./data/data.json');
            const { articles, months } = JSON.parse(data.toString());
            this.articles = articles;
            this.months = months;
            console.log(`loaded ${articles.length} articles from ${months.length} months, ${this.articles.reduce((sum, a) => sum + a.text.split(' ').length, 0)} words`);

        } catch (error) {
            console.log('no data file found');
        }
    }

    async applyTags() {
        console.time('apply tags');
        this.articles.forEach(a => {
            a.tags = getTags(a.text);
            if (a.tags.length === 0) {
                a.tags = ['notag'];
            }
        });
        console.timeEnd('apply tags');
    }

    async printTagStats() {
        const maxTags = Math.max(...this.articles.map(a => a.tags?.length || 0));

        const getArticlesByTagCount = (count: number) => this.articles.filter(a => a.tags?.filter(t => t !== 'notag').length === count);
        const getArticlesByTag = (tag: string) => this.articles.filter(a => a.tags?.includes(tag));

        for (let i = maxTags; i >= 0; i--) {
            const articles = getArticlesByTagCount(i);
            console.log(`articles with ${i.toString().padEnd(2)} tags: ${articles.length.toString().padStart(5)}  https://blog.fefe.de/${String(randomElement(articles)?.uuid).padEnd(16)} ${articles[0]?.tags}`);
        }

        for (const tag in TAGS) {
            console.log(`articles with tag ${tag.padEnd(20)}: ${getArticlesByTag(tag).length}`);
        }

        const wordsOfUntagged = keywordExytractor
            .extract(
                getArticlesByTagCount(0)
                    .map(a => a.text)
                    .join(' '),
                KEYWORD_OPTIONS,
            ).filter(w => !IGNORED_WORDS.includes(w));
        console.log('remaining common words:');
        console.table(countFreq(wordsOfUntagged, 0, 50));
        console.time('filter words');
        const taggedText = this.articles.filter(a => a.tags?.filter(t => t !== 'notag').length || 0 > 0).map(a => a.text).join(' ');
        const wordsOfTagged = keywordExytractor.extract(taggedText, KEYWORD_OPTIONS);
        console.log('remaing common words that are not mentioned in the tagged articles: (this may take some time)');
        console.table(countFreq(wordsOfUntagged.filter((word) => !wordsOfTagged.includes(word)), 0, 50));
        console.timeEnd('filter words');
    }
}

async function start() {
    const fefe = new Fefe();
    await fefe.load();
    await fefe.fetchSince(2018, 0);
    await fefe.applyTags();
    fefe.printTagStats();
    fefe.store();
}

start();
