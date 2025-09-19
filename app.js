const express = require('express');
const bodyParser = require('body-parser');
const calculatorRoutes = require('./routes/calculatorRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = 3000;
app.use(express.static('public'));

app.set('view engine', 'ejs');

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', calculatorRoutes);
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
});