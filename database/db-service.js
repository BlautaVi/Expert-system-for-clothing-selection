const fs = require('fs/promises');
const path = require('path');

const dbPath = path.join(__dirname, 'knowledgeBase.json');

async function readDb() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("КРИТИЧНА ПОМИЛКА: Не вдалося прочитати файл knowledgeBase.json!", err);
        return { questions: {}, garments: [], materials: [], calculation_rules: [], details_library: {} };
    }
}
async function writeDb(data) {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
