// to do: "w kodzie ktory bedzie wyswietlal zdjecia na stronie trzeba dodac sciezke"

const http = require("http");
const express = require("express");
const bcrypt = require("bcrypt");
const app = express();
const shoppingDb = require("./shoppingDb.js");

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("menu");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await shoppingDb.getUser(username);
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const password_match = await bcrypt.compare(password, user.PASSWORD);
            if (password_match) {
                res.send("Logowanie pomyślne");
            }
            else {
                res.send("Nieprawidłowe hasło");
            }
        }
        else {
            res.send("Nie ma takiego użytkownika");
        }
    }
    catch (error) {
        console.error(error);
        res.send("Błąd podczas logowania");
    }
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        const if_user = await shoppingDb.getUser(username);
        if (if_user.recordset.length > 0) {
            res.send("Użytkownik o takiej nazwie już istnieje");
            return;
        }
        const hashed = await bcrypt.hash(password, 10);
        const ins_user = await shoppingDb.insertUser(username, hashed, 'USER');
        res.send("Rejestracja zakończona pomyślnie");
    }
    catch (error) {
        console.error(error);
        res.send("Błąd rejestracji");
    }
});


app.get("/anonymous", async (req, res) => {
    try {
        const products = await shoppingDb.getAllProducts();
        res.render("anonymous", { products : products.recordset });
    }
    catch (error) {
        console.error(error);
        res.send("Błąd podczas pobierania produktów");
    }
});

//shoppingDb.dropDB(); co jakis czas by produkty zaczynaly sie od id 1 a nie np 12 i zeby admin byl tez userem nr 1
shoppingDb.initiateDB();
//shoppingDb.insertProduct({name: 'Pralka', price: 2999, description: 'ładowana z góry', category: 'AGD', picture: 'pralka.jpg'});
//shoppingDb.deleteProduct(1);
//shoppingDb.updateProduct(5, {name: 'Pralka', price: 1414, description: 'ładowana z góry', category: 'AGD', picture: 'pralka.jpg'});
//shoppingDb.getAllUsers();
//shoppingDb.getAllProducts();
//shoppingDb.deleteUser(2);
//shoppingDb.searchProduct('fon');
// shoppingDb.createOrder(
//     { id_user: 3, name: 'zamowienie1', date: '2016-10-23 12:45:37.1234567', orderValue: 13997},
//     [
//         {idProduct: 2, quantity: 2, price: 999},
//         {idProduct: 3, quantity: 1, price: 4000},
//         {idProduct: 4, quantity: 1, price: 7999}
//     ] )
http.createServer(app).listen(3000);
console.log("started");
