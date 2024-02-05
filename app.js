// to do: "w kodzie ktory bedzie wyswietlal zdjecia na stronie trzeba dodac sciezke"

const http = require("http");
const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const app = express();
const session = require("express-session");
const shoppingDb = require("./shoppingDb.js");

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: "tajnyklucz",
    resave: false,
    saveUninitialized: false
}));

const storage = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null,"public/images");
    },
    filename: (req,file,cb) => {
        console.log(file);
        cb(null,Date.now()+path.extname(file.originalname));
    }
});
const upload = multer({storage: storage});

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
                req.session.user = {
                    id: user.ID,
                    username: user.USERNAME,
                    role: user.ROLE
                };
                console.log(req.session.user);
                if(user.ROLE==="ADMIN") {
                    res.redirect("/admin");
                } else if(user.ROLE==="USER") {
                    res.redirect("/known");
                }
            }
            else {
                res.render("login", { message: "Niepoprawne dane logowania" });
            }
        }
        else {
            res.render("login", { message: "Niepoprawne dane logowania" });
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
            const user = req.session.user;
            if(user && user.role === "USER") {
                res.render("known", { products : products.recordset});
            } else {
                console.log("Nie możesz wejść na /known");
                res.redirect("/login");
            }
        }else{
            const products = await shoppingDb.searchProduct(search);
            const user = req.session.user;
            if(user && user.role === "USER") {
                res.render("known", { products : products.recordset});
            } else {
                console.log("Nie możesz wejść na /known");
                res.redirect("/login");
            }
        }
    }
    catch (error) {
        console.error(error);
        res.send("Błąd podczas pobierania produktów");
    }
});

app.get("/admin", (req, res) => {
    const user = req.session.user;
    if(user && user.role === "ADMIN") {
        res.render("admin");
    } else {
        console.log("Nie możesz wejść na /admin");
        res.redirect("/login");
    }
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

app.post("/add", upload.single("picture"), async (req, res) => {
    try {
        const { name, price, description, category } = req.body;
        if(!req.file)
        {
            res.send("Brak załączonego obrazu");
            return;
        }
        const picture_path=req.file.filename;
        await shoppingDb.insertProduct({ name, price, description, category, picture: picture_path });
        console.log(`Dodano produkt ${name}`);
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.send("Błąd dodawania");
    }
});

app.get("/modify-delete", async (req, res) => {
    const products = await shoppingDb.getAllProducts();
    res.render("modify-delete", { products : products.recordset });
});

app.get("/delete/:id", async (req, res) => {
    try {
        const product_id = req.params.id;
        await shoppingDb.deleteProduct(product_id);
        console.log(`Usunięto produkt o ID ${product_id}`);
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.send("Błąd podczas usuwania");
    }
});

app.get("/modify/:id", async (req, res) => {
    try {
        const product_id = req.params.id;
        const product = await shoppingDb.getProductById(product_id);
        if(!product) {
            res.send("Nie ma takiego produktu");
            return;
        }
        res.render("modify", { product });
    } catch (error) {
        console.error(error);
        res.send("Błąd podczas pobierania produktu do modyfikacji");
    }
});

app.post("/modify/:id", upload.single("picture"), async (req, res) => {
    try {
        const product_id = req.params.id;
        const { name, price, description, category } = req.body;
        if(!req.file)
        {
            res.send("Brak załączonego obrazu");
            return;
        }
        const picture_path = req.file.filename;
        const updated = { name, price, description, category, picture: picture_path};
        await shoppingDb.updateProduct(product_id, updated);
        console.log(`Zaaktualizowano produkt o ID ${product_id}`);
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.send("Błąd podczas modyfikowania produktu");
    }
});

app.get("/orders", async (req, res) => {
    try {
        const orders = await shoppingDb.showAllOrders();
        res.render("orders", { orders });
    } catch (error) {
        console.error(error);
        res.send("Nie udało się pobrać zamówień");
    }
});

app.get("/logout", (req, res) => {
    req.session.user = undefined;
    res.redirect("/");
});

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
// shoppingDb.createOrder(
//     {id_user: 5, name: "testowe", date: '2024-02-05 15:27:31.1234567', orderValue: 5200},
//     [
//         {idProduct: 1, quantity: 1, price: 4999},
//         {idProduct: 6, quantity: 1, price: 201}
//     ]);
http.createServer(app).listen(3000);
console.log("started");
