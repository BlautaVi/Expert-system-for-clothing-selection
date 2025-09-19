const express = require('express');
const router = express.Router();
const dbService = require('../database/db-service');

router.get('/', async (req, res) => {
    try {
        const db = await dbService.readDb();
        const firstQuestion = db.questions['start'];
        res.render('calculator', { firstQuestion });
    } catch (err) {
        console.error("Не вдалося завантажити базу знань:", err);
        res.status(500).send("Не вдалося завантажити базу знань.");
    }
});

router.post('/get-next-step', async (req, res) => {
    try {
        const { answers: userAnswers, currentQuestionId } = req.body;
        if (!currentQuestionId) {
            return res.status(400).json({ error: "Клієнт не надіслав ID поточного питання." });
        }
        const db = await dbService.readDb();
        const currentQuestion = db.questions[currentQuestionId];
        if (!currentQuestion) {
            return res.status(404).json({ error: `Питання з ID '${currentQuestionId}' не знайдено в базі знань.` });
        }
        let nextQuestionId = currentQuestion.next_question_id || currentQuestion.default_next_question_id;
        if (currentQuestion.conditional_next) {
            for (const condition of currentQuestion.conditional_next) {
                const [key, values] = Object.entries(condition.if_answers)[0];
                if (userAnswers && userAnswers[key] && values.includes(userAnswers[key])) {
                    nextQuestionId = condition.then_go_to;
                    break;
                }
            }
        }
        if (!nextQuestionId) {
            console.error(`[DEBUG] Не вдалося визначити наступний крок для питання '${currentQuestionId}' з відповідями:`, userAnswers);
            return res.status(400).json({ error: "Не вдалося визначити наступний крок. Перевірте логіку та ID у knowledgeBase.json." });
        }
        const nextQuestion = { ...db.questions[nextQuestionId] };
        if (!nextQuestion.id) {
            console.error(`[DEBUG] Спроба перейти на неіснуюче питання з ID: '${nextQuestionId}'`);
            return res.status(404).json({ error: `Наступне питання з ID '${nextQuestionId}' не знайдено в базі знань.` });
        }
        if (nextQuestion.answers_from_entity) {
            const entities = db[nextQuestion.target_entity] || [];
            const filteredEntities = entities.filter(e => e.gender === userAnswers.gender || e.gender === 'унісекс');
            nextQuestion.answers = filteredEntities.map(e => ({ text: e.name, value: e.id, image: e.image }));
        } else if (nextQuestion.answers_from_previous_selection) {
            const { entity, entity_key, property } = nextQuestion.answers_from_previous_selection;
            const selectedEntityId = userAnswers[entity_key];
            const selectedEntity = (db[entity] || []).find(e => e.id === selectedEntityId);
            if (selectedEntity && selectedEntity[property]) {
                nextQuestion.answers = selectedEntity[property].map(propObject => ({
                    text: propObject.name,
                    value: propObject.name,
                    image: propObject.image
                }));
            }
        } else if (nextQuestion.fields_from_garment_selection) {
            console.log("\n--- ДІАГНОСТИКА ДЛЯ ФІНАЛЬНОГО ПИТАННЯ ---");
            console.log("Отримані відповіді користувача:", userAnswers);
            console.log("Шукаємо одяг за ID:", userAnswers.garment);
            nextQuestion.form_fields = [];
            const selectedGarment = db.garments.find(g => g.id === userAnswers.garment);
            console.log("Результат пошуку одягу:", selectedGarment ? selectedGarment.name : "НЕ ЗНАЙДЕНО");
            if (selectedGarment && selectedGarment.required_final_details) {
                nextQuestion.form_fields = selectedGarment.required_final_details
                    .map(detailKey => db.details_library[detailKey])
                    .filter(Boolean);
            }
            console.log("Згенеровані поля для форми:", nextQuestion.form_fields);
            console.log("--- КІНЕЦЬ ДІАГНОСТИКИ ---\n");
        }
        return res.json({ nextQuestion });
    } catch (err) {
        console.error("ПОМИЛКА НА /get-next-step:", err);
        res.status(500).json({ error: "Внутрішня серверна помилка." });
    }
});

router.post('/calculate-final', async (req, res) => {
    try {
        const userAnswers = req.body;
        const db = await dbService.readDb();
        const garment = db.garments.find(g => g.id === userAnswers.garment);

        if (!garment) {
            return res.status(404).json({ error: "Обраний одяг не знайдено." });
        }

        const filteredMaterials = (db.materials || []).filter(m => {
            const hasSeason = m.properties.some(p => p.key === 'сезон' && p.value === userAnswers.season);
            const hasStyle = m.properties.some(p => p.key === 'стиль' && p.value === userAnswers.style);
            let hasStretch = true;
            if (userAnswers.stretch && userAnswers.stretch !== 'неважливо') {
                hasStretch = m.properties.some(p => p.key === 'еластичність' && p.value === userAnswers.stretch);
            }
            return hasSeason && hasStyle && hasStretch;
        });

        if (filteredMaterials.length === 0) {
            return res.json({ error: `На жаль, для ваших критеріїв не знайдено матеріалів. Спробуйте змінити побажання до тканини.` });
        }

        let baseConsumption = garment.base_consumption;

        (db.calculation_rules || []).forEach(rule => {
            const inputValue = userAnswers[rule.factor];
            if (inputValue === undefined) return;

            let conditionMet = false;
            const ruleValue = !isNaN(parseFloat(rule.value)) ? parseFloat(rule.value) : rule.value;
            const parsedInputValue = !isNaN(parseFloat(inputValue)) ? parseFloat(inputValue) : inputValue;

            if (rule.operator === '>') conditionMet = parsedInputValue > ruleValue;
            if (rule.operator === '===') conditionMet = parsedInputValue === ruleValue;
            if (rule.operator === '<') conditionMet = parsedInputValue < ruleValue;

            if (conditionMet) {
                baseConsumption *= rule.modifier;
            }
        });

        const detailedResults = filteredMaterials.map(material => {
            return {
                name: material.name,
                consumption: baseConsumption.toFixed(2),
                cost: (material.price_per_meter * baseConsumption).toFixed(0)
            };
        });

        const result = {
            garmentName: garment.name,
            results: detailedResults
        };

        res.json(result);

    } catch (err) {
        console.error("ПОМИЛКА РОЗРАХУНКУ:", err);
        res.status(500).json({ error: "Серверна помилка при розрахунку." });
    }
});

module.exports = router;