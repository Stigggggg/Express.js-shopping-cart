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
                if(user.ROLE==="ADMIN") {
                    res.redirect("/admin");
                } else if(user.ROLE==="USER") {
                    res.redirect("/known");
                }
                else {
                    res.send("Logowanie użytkownika pomyślne")
                }
            }
            else {
                res.send("Nieprawidłowe hasło");
            }
        }
        else {
            res.send("Błąd logowania - brak takich danych w bazie");
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


var search = '';
app.get("/anonymous", async (req, res) => {
    try {
        const serarchParams = new URLSearchParams(req.query);
        const search = serarchParams.get('search');
        console.log(search);
        if(search == null) {
            const products = await shoppingDb.getAllProducts();
            res.render("anonymous", { products : products.recordset});
        }else{
            const products = await shoppingDb.searchProduct(search);
            res.render("anonymous", { products : products.recordset});
        }
    }
    catch (error) {
        console.error(error);
        res.send("Błąd podczas pobierania produktów");
    }
});

app.get("/known", async (req, res) => {
    try {
        const serarchParams = new URLSearchParams(req.query);
        const search = serarchParams.get('search');
        console.log(search);
        const products = await shoppingDb.searchProduct(search);
        if(search == null) {
            const products = await shoppingDb.getAllProducts();
            res.render("known", { products : products.recordset});
        }else{
            const products = await shoppingDb.searchProduct(search);
            res.render("known", { products : products.recordset});
        }
    }
    catch (error) {
        console.error(error);
        res.send("Błąd podczas pobierania produktów");
    }
});


app.get("/admin", (req, res) => {
    res.render("admin");
});

app.get("/users", async (req, res) => {
    try {
        const users = await shoppingDb.getAllUsers();
        res.render("users", { users });
    } catch (error) {
        console.error(error);
        res.send("Nie udało się pobrać użytkowników");
    }
});

app.get("/add", (req, res) => {
    res.render("add");
});

app.post("/add", async (req, res) => {
    try {
        const { name, price, description, category, picture } = req.body;
        await shoppingDb.insertProduct({ name, price, description, category, picture });
        res.send(`Dodano produkt ${name}`);
    } catch (error) {
        console.error(error);
        res.send("Błąd dodawania");
    }
});

//todo: remove i update
// app.get("/remove", async (req, res) => {
//     const product_id = req.query.id;
//     if (!product_id) {
//         res.send("Brak ID produktu");
//         return;
//     }
//     const product = await shoppingDb.getProductById(product_id);
//     if(!product) {
//         res.send("Nie ma produktu o takim ID");
//         return;
//     }
//     res.render("remove");
// });

// app.post("/remove", async (req, res) => {
//     const product_id=req.query.id;
//     if (!product_id) {
//         res.send("Brak ID produktu");
//         return;
//     }
//     await shoppingDb.deleteProduct(product_id);
//     res.send(`Usunięto produkt o ID ${product_id}`);
// });

//shoppingDb.dropDB(); co jakis czas by produkty zaczynaly sie od id 1 a nie np 12 i zeby admin byl tez userem nr 1
shoppingDb.initiateDB();
//shoppingDb.insertProduct({name: 'Pralka', price: 2999, description: 'ładowana z góry', category: 'AGD', picture: 'pralka.jpg'});
//shoppingDb.deleteProduct(1);
//shoppingDb.updateProduct(5, {name: 'Pralka', price: 1414, description: 'ładowana z góry', category: 'AGD', picture: 'pralka.jpg'});
//shoppingDb.getAllUsers();
//shoppingDb.getAllProducts();
//shoppingDb.deleteUser(2);
// shoppingDb.searchProduct('fon');
// shoppingDb.createOrder(
//     { id_user: 3, name: 'zamowienie1', date: '2016-10-23 12:45:37.1234567', orderValue: 13997},
//     [
//         {idProduct: 2, quantity: 2, price: 999},
//         {idProduct: 3, quantity: 1, price: 4000},
//         {idProduct: 4, quantity: 1, price: 7999}
//     ] )
http.createServer(app).listen(3000);
console.log("started");
