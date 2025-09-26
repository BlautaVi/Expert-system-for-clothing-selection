const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dbService = require('../database/db-service');

router.get('/garments', async (req, res) => {
    try {
        const db = await dbService.readDb();
        res.render('admin_garments', { garments: db.garments || [] });
    } catch(err) { res.status(500).send("Помилка завантаження одягу"); }
});

router.post('/garments/add', async (req, res) => {
    try {
        const { name, base_consumption, gender, available_fits, required_final_details } = req.body;
        const db = await dbService.readDb();

        const fitsArray = available_fits ? available_fits.split(',').map(fit => fit.trim()) : [];
        const consumption = parseFloat(base_consumption);

        if (isNaN(consumption)) {
            return res.status(400).send("Некоректне значення для базової витрати.");
        }

        let detailsArray = [];
        if (required_final_details) {
            detailsArray = Array.isArray(required_final_details) ? required_final_details : [required_final_details];
        }

        const newGarment = {
            id: uuidv4(),
            name,
            base_consumption: consumption,
            gender,
            available_fits: fitsArray,
            required_final_details: detailsArray
        };

        if (!db.garments) db.garments = [];
        db.garments.push(newGarment);

        await dbService.writeDb(db);
        res.redirect('/admin/garments');
    } catch(err) {
        console.error("Помилка додавання одягу:", err);
        res.status(500).send("Помилка додавання одягу");
    }
});
router.get('/garments/edit/:id', async (req, res) => {
    const db = await dbService.readDb();
    const garment = db.garments.find(g => g.id === req.params.id);
    if (!garment) return res.status(404).send('Одяг не знайдено');
    res.render('admin_edit_garment', { garment, details_library: db.details_library });
});
router.post('/garments/delete/:id', async (req, res) => {
    try {
        const db = await dbService.readDb();
        db.garments = (db.garments || []).filter(g => g.id !== req.params.id);
        await dbService.writeDb(db);
        res.redirect('/admin/garments');
    } catch(err) { res.status(500).send("Помилка видалення одягу"); }
});

router.get('/materials', async (req, res) => {
    try {
        const db = await dbService.readDb();
        res.render('admin_materials', { materials: db.materials || [] });
    } catch(err) { res.status(500).send("Помилка завантаження матеріалів"); }
});

router.post('/materials/add', async (req, res) => {
    try {
        const { name, price_per_meter, keys, values } = req.body;
        const db = await dbService.readDb();
        const newMaterial = { id: uuidv4(), name, price_per_meter: parseInt(price_per_meter, 10), properties: [] };
        if (keys && values) {
            const keysArray = Array.isArray(keys) ? keys : [keys];
            const valuesArray = Array.isArray(values) ? values : [values];
            keysArray.forEach((key, index) => {
                if (key && valuesArray[index]) {
                    newMaterial.properties.push({ key: key, value: valuesArray[index] });
                }
            });
        }
        if (!db.materials) db.materials = [];
        db.materials.push(newMaterial);
        await dbService.writeDb(db);
        res.redirect('/admin/materials');
    } catch(err) { res.status(500).send("Помилка додавання матеріалу"); }
});
router.get('/materials/edit/:id', async (req, res) => {
    try {
        const db = await dbService.readDb();
        const material = (db.materials || []).find(m => m.id === req.params.id);
        if (!material) return res.status(404).send('Матеріал не знайдено');
        res.render('admin_edit_material', { material });
    } catch(err) { res.status(500).send("Помилка завантаження матеріалу для редагування"); }
});
router.post('/materials/update/:id', async (req, res) => {
    try {
        const db = await dbService.readDb();
        const index = (db.materials || []).findIndex(m => m.id === req.params.id);
        if (index === -1) return res.status(404).send('Матеріал не знайдено');

        const { name, price_per_meter, keys, values } = req.body;
        const updatedMaterial = { ...db.materials[index] };
        updatedMaterial.name = name;
        updatedMaterial.price_per_meter = parseInt(price_per_meter, 10);
        updatedMaterial.properties = [];

        if (keys && values) {
            const keysArray = Array.isArray(keys) ? keys : [keys];
            const valuesArray = Array.isArray(values) ? values : [values];
            keysArray.forEach((key, i) => {
                if (key && valuesArray[i]) {
                    updatedMaterial.properties.push({ key: key, value: valuesArray[i] });
                }
            });
        }

        db.materials[index] = updatedMaterial;
        await dbService.writeDb(db);
        res.redirect('/admin/materials');
    } catch(err) { res.status(500).send("Помилка оновлення матеріалу"); }
});
router.post('/garments/update/:id', async (req, res) => {
    const db = await dbService.readDb();
    const index = db.garments.findIndex(g => g.id === req.params.id);
    if (index === -1) return res.status(404).send('Одяг не знайдено');

    const { name, base_consumption, gender, available_fits, required_final_details, image } = req.body;
    const fitsArray = available_fits.split(',').map(fit => ({ name: fit.trim(), image: '' })); // Simplified for edit

    db.garments[index] = {
        ...db.garments[index],
        name,
        base_consumption: parseFloat(base_consumption),
        gender,
        image,
        available_fits: fitsArray,
        required_final_details: Array.isArray(required_final_details) ? required_final_details : [required_final_details].filter(Boolean)
    };
    await dbService.writeDb(db);
    res.redirect('/admin/garments');
});
router.post('/materials/delete/:id', async (req, res) => {
    try {
        const db = await dbService.readDb();
        db.materials = (db.materials || []).filter(m => m.id !== req.params.id);
        await dbService.writeDb(db);
        res.redirect('/admin/materials');
    } catch(err) { res.status(500).send("Помилка видалення матеріалу"); }
});

router.get('/rules', async (req, res) => {
    try {
        const db = await dbService.readDb();
        res.render('admin_rules', { rules: db.calculation_rules || [], db: db });
    } catch(err) { res.status(500).send("Помилка завантаження правил"); }
});

router.post('/rules/add', async (req, res) => {
    try {
        const { description, factor, operator, value, modifier } = req.body;
        const db = await dbService.readDb();

        const parsedValue = !isNaN(parseFloat(value)) ? parseFloat(value) : value;
        const parsedModifier = parseFloat(modifier);

        if (isNaN(parsedModifier)) {
            return res.status(400).send("Некоректне значення для модифікатора.");
        }

        const newRule = {
            id: uuidv4(),
            description,
            factor,
            operator,
            value: parsedValue,
            modifier: parsedModifier
        };

        if (!db.calculation_rules) db.calculation_rules = [];
        db.calculation_rules.push(newRule);

        await dbService.writeDb(db);
        res.redirect('/admin/rules');
    } catch(err) {
        console.error("Помилка додавання правила:", err);
        res.status(500).send("Помилка додавання правила");
    }
});

router.post('/rules/delete/:id', async (req, res) => {
    try {
        const db = await dbService.readDb();
        db.calculation_rules = (db.calculation_rules || []).filter(r => r.id !== req.params.id);
        await dbService.writeDb(db);
        res.redirect('/admin/rules');
    } catch(err) { res.status(500).send("Помилка видалення правила"); }
});

router.get('/rules/edit/:id', async (req, res) => {
    const db = await dbService.readDb();
    const rule = db.calculation_rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).send('Правило не знайдено');
    res.render('admin_edit_rule', { rule, db: db });
});

router.post('/rules/update/:id', async (req, res) => {
    const db = await dbService.readDb();
    const index = db.calculation_rules.findIndex(r => r.id === req.params.id);
    if (index === -1) return res.status(404).send('Правило не знайдено');

    const { description, factor, operator, value, modifier } = req.body;
    const processedValue = !isNaN(parseFloat(value)) ? parseFloat(value) : value;
    db.calculation_rules[index] = {
        ...db.calculation_rules[index],
        description,
        factor,
        operator,
        value: processedValue,
        modifier: parseFloat(modifier)
    };
    await dbService.writeDb(db);
    res.redirect('/admin/rules');
});

module.exports = router;
