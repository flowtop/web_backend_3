const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("static"));

// Подключение к БД
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'testdb'
});

// Допустимые значения
const allowedLanguages = [
    'pascal', 'c', 'c++', 'javascript', 'php',
    'python', 'haskell', 'java', 'clojure', 'prolog', 'scala'
];

const allowedGenders = ['male', 'female'];

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.post('/submit', async (req, res) => {
    try {
        const {
            full_name,
            phone,
            email,
            birth_date,
            gender,
            bio,
            contract
        } = req.body;

        let languages = req.body.languages;

        // Нормализация (если выбран 1 язык)
        if (!Array.isArray(languages)) {
            languages = [languages];
        }

        // ===== ВАЛИДАЦИЯ =====

        if (!full_name || !/^[A-Za-zА-Яа-яЁё\s]{1,150}$/.test(full_name)) {
            return res.send('Ошибка: некорректное ФИО');
        }

        if (!phone || !/^\+?[0-9\- ]{7,20}$/.test(phone)) {
            return res.send('Ошибка: некорректный телефон');
        }

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.send('Ошибка: некорректный email');
        }

        if (!birth_date) {
            return res.send('Ошибка: дата рождения обязательна');
        }

        if (!allowedGenders.includes(gender)) {
            return res.send('Ошибка: некорректный пол');
        }

        if (!languages || languages.length === 0) {
            return res.send('Ошибка: выберите хотя бы один язык');
        }

        for (let lang of languages) {
            if (!allowedLanguages.includes(lang)) {
                return res.send('Ошибка: недопустимый язык программирования');
            }
        }

        if (!contract) {
            return res.send('Ошибка: необходимо принять контракт');
        }

        // ===== СОХРАНЕНИЕ =====

        console.log(req.body);

        // const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            // 1. Вставка пользователя
            const [result] = await conn.execute(
                `INSERT INTO users 
        (full_name, phone, email, birth_date, gender, bio, contract_accepted)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [full_name, phone, email, birth_date, gender, bio || '', true]
            );

            const userId = result.insertId;

            // 2. Получаем id языков
            const [rows] = await conn.execute(
                `SELECT id, name FROM programming_languages WHERE name IN (?)`,
                [languages]
            );

            // 3. Вставка связей
            for (let row of rows) {
                await conn.execute(
                    `INSERT INTO user_languages (user_id, language_id)
           VALUES (?, ?)`,
                    [userId, row.id]
                );
            }

            await conn.commit();

            res.send('Данные успешно сохранены!');

        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

    } catch (err) {
        console.error(err);
        res.send('Ошибка сервера');
    }
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});